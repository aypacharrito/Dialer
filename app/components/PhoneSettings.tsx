"use client";

import { useEffect, useRef, useState } from "react";
import type { Device } from "@twilio/voice-sdk";
import { defaultAudioPreferences, readAudioPreferences, saveAudioPreferences } from "../audio-preferences";
import { clearVoiceModeLabels, PacificaClearVoiceProcessor, supportsClearVoice, type ClearVoiceMetrics, type ClearVoiceMode } from "../clearvoice";

type AudioChoice = { deviceId: string; label: string };
type MonitorMode = "raw" | "clearvoice" | null;

const emptyMetrics: ClearVoiceMetrics = { inputLevel: 0, outputLevel: 0, reduction: 0, voiceDetected: false };

export default function PhoneSettings({ ensureDevice, compact = false, onClose }: {
  ensureDevice: () => Promise<Device>;
  compact?: boolean;
  onClose?: () => void;
}) {
  const [inputs, setInputs] = useState<AudioChoice[]>([]);
  const [outputs, setOutputs] = useState<AudioChoice[]>([]);
  const [input, setInput] = useState(defaultAudioPreferences.input);
  const [speaker, setSpeaker] = useState(defaultAudioPreferences.speaker);
  const [ring, setRing] = useState(defaultAudioPreferences.ring);
  const [speakerVolume, setSpeakerVolume] = useState(defaultAudioPreferences.speakerVolume);
  const [ringVolume, setRingVolume] = useState(defaultAudioPreferences.ringVolume);
  const [beep, setBeep] = useState(defaultAudioPreferences.beep);
  const [clearVoiceEnabled, setClearVoiceEnabled] = useState(defaultAudioPreferences.clearVoiceEnabled);
  const [clearVoiceMode, setClearVoiceMode] = useState<ClearVoiceMode>(defaultAudioPreferences.clearVoiceMode);
  const [clearVoiceSupported, setClearVoiceSupported] = useState(true);
  const [clearVoiceMetrics, setClearVoiceMetrics] = useState<ClearVoiceMetrics>(emptyMetrics);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("Run the test to grant microphone access and load your devices.");
  const [meter, setMeter] = useState(0);
  const [listening, setListening] = useState<MonitorMode>(null);
  const monitorStreamRef = useRef<MediaStream | null>(null);
  const monitorProcessedStreamRef = useRef<MediaStream | null>(null);
  const monitorProcessorRef = useRef<PacificaClearVoiceProcessor | null>(null);
  const monitorAudioRef = useRef<HTMLAudioElement | null>(null);
  const monitorContextRef = useRef<AudioContext | null>(null);
  const monitorFrameRef = useRef<number | null>(null);
  const monitorTimerRef = useRef<number | null>(null);
  const inputRef = useRef(defaultAudioPreferences.input);
  const speakerRef = useRef(defaultAudioPreferences.speaker);

  function stopMonitor(nextMessage?: string) {
    if (monitorTimerRef.current) window.clearTimeout(monitorTimerRef.current);
    if (monitorFrameRef.current) window.cancelAnimationFrame(monitorFrameRef.current);
    monitorTimerRef.current = null;
    monitorFrameRef.current = null;
    const processed = monitorProcessedStreamRef.current;
    if (monitorProcessorRef.current && processed) void monitorProcessorRef.current.destroyProcessedStream(processed);
    monitorProcessorRef.current = null;
    monitorProcessedStreamRef.current = null;
    monitorStreamRef.current?.getTracks().forEach(track => track.stop());
    monitorStreamRef.current = null;
    if (monitorAudioRef.current) { monitorAudioRef.current.pause(); monitorAudioRef.current.srcObject = null; }
    void monitorContextRef.current?.close();
    monitorContextRef.current = null;
    setListening(null);
    setMeter(0);
    setClearVoiceMetrics(emptyMetrics);
    if (nextMessage) setMessage(nextMessage);
  }

  useEffect(() => {
    queueMicrotask(() => {
      const saved = readAudioPreferences();
      inputRef.current = saved.input;
      speakerRef.current = saved.speaker;
      setInput(saved.input);
      setSpeaker(saved.speaker);
      setRing(saved.ring);
      setSpeakerVolume(saved.speakerVolume);
      setRingVolume(saved.ringVolume);
      setBeep(saved.beep);
      setClearVoiceEnabled(saved.clearVoiceEnabled);
      setClearVoiceMode(saved.clearVoiceMode);
      setClearVoiceSupported(supportsClearVoice());
      if (saved.input !== "default") setMessage("Your saved microphone will be used for tests and every call.");
    });
    return () => stopMonitor();
  }, []);
  useEffect(() => { if (monitorAudioRef.current) monitorAudioRef.current.volume = speakerVolume / 100; }, [speakerVolume]);

  async function loadDevices() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not expose microphone controls. Use current Chrome or Edge over HTTPS.");
    const selectedInput = inputRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: selectedInput === "default" ? true : { deviceId: { exact: selectedInput } } });
    const mediaDevices = await navigator.mediaDevices.enumerateDevices();
    stream.getTracks().forEach(track => track.stop());
    const nextInputs = mediaDevices.filter(item => item.kind === "audioinput").map((item, index) => ({ deviceId: item.deviceId, label: item.label || `Microphone ${index + 1}` }));
    const nextOutputs = mediaDevices.filter(item => item.kind === "audiooutput").map((item, index) => ({ deviceId: item.deviceId, label: item.label || `Audio output ${index + 1}` }));
    setInputs(nextInputs.length ? nextInputs : [{ deviceId: "default", label: "Browser default microphone" }]);
    setOutputs(nextOutputs.length ? nextOutputs : [{ deviceId: "default", label: "Browser default output" }]);
    if (selectedInput !== "default" && !nextInputs.some(item => item.deviceId === selectedInput)) throw new Error("Your saved microphone is not connected. Reconnect it or choose another microphone.");
  }

  async function startMonitor(mode: MonitorMode, autoStop = false) {
    stopMonitor();
    const selectedInput = inputRef.current;
    const constraints: MediaTrackConstraints = {
      echoCancellation: mode === null,
      noiseSuppression: false,
      autoGainControl: mode === null,
      ...(selectedInput === "default" ? {} : { deviceId: { exact: selectedInput } }),
    };
    const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
    monitorStreamRef.current = stream;
    let audibleStream = stream;
    if (mode === "clearvoice") {
      if (!supportsClearVoice()) throw new Error("ClearVoice processing is unavailable in this browser. Use current Chrome or Edge.");
      const processor = new PacificaClearVoiceProcessor(clearVoiceMode, setClearVoiceMetrics);
      monitorProcessorRef.current = processor;
      audibleStream = await processor.createProcessedStream(stream);
      monitorProcessedStreamRef.current = audibleStream;
    }

    const context = new AudioContext();
    monitorContextRef.current = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(audibleStream).connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    const updateMeter = () => {
      analyser.getByteTimeDomainData(samples);
      const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample - 128)), 0);
      setMeter(Math.min(100, Math.round((peak / 64) * 100)));
      monitorFrameRef.current = window.requestAnimationFrame(updateMeter);
    };
    updateMeter();

    if (mode && monitorAudioRef.current) {
      monitorAudioRef.current.srcObject = audibleStream;
      monitorAudioRef.current.volume = speakerVolume / 100;
      const sinkAudio = monitorAudioRef.current as HTMLAudioElement & { setSinkId?: (deviceId: string) => Promise<void> };
      if (speakerRef.current !== "default" && sinkAudio.setSinkId) await sinkAudio.setSinkId(speakerRef.current);
      await monitorAudioRef.current.play();
      setListening(mode);
      setMessage(mode === "clearvoice" ? "ClearVoice monitor is live. Speak, type, or make background noise to compare it." : "Original microphone monitor is live with suppression bypassed.");
    } else if (autoStop) {
      monitorTimerRef.current = window.setTimeout(() => stopMonitor("Microphone detected. The level meter responded successfully."), 4500);
    }
  }

  async function runTest() {
    setTesting(true);
    setMessage("Checking microphone, Twilio token, ClearVoice, and connection latency…");
    try {
      const started = performance.now();
      await loadDevices();
      const [device, response] = await Promise.all([ensureDevice(), fetch("/api/twilio/token", { cache: "no-store" })]);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Token check failed (${response.status})`);
      }
      await device.audio?.setInputDevice(inputRef.current);
      await startMonitor(null, true);
      setMessage(`Phone ready · API ${Math.round(performance.now() - started)} ms · ${clearVoiceEnabled && clearVoiceSupported ? "ClearVoice armed" : "native audio fallback"} · speak now`);
    } catch (error) {
      setMessage(`Test failed: ${error instanceof Error ? error.message : "Device test failed"}`);
    } finally {
      setTesting(false);
    }
  }

  async function selectInput(value: string) {
    stopMonitor();
    inputRef.current = value;
    setInput(value);
    saveAudioPreferences({ input: value });
    try { const device = await ensureDevice(); await device.audio?.setInputDevice(value); setMessage("Microphone recognized and selected for Twilio."); }
    catch (error) { setMessage(`Microphone error: ${error instanceof Error ? error.message : "selection failed"}`); }
  }

  async function selectOutput(kind: "speaker" | "ring", value: string) {
    if (kind === "speaker") { speakerRef.current = value; setSpeaker(value); saveAudioPreferences({ speaker: value }); }
    else { setRing(value); saveAudioPreferences({ ring: value }); }
    try {
      const device = await ensureDevice();
      if (kind === "speaker") await device.audio?.speakerDevices?.set(value);
      else await device.audio?.ringtoneDevices?.set(value);
      setMessage(`${kind === "speaker" ? "Speaker" : "Ring device"} updated.`);
    } catch (error) { setMessage(`Output selection is not supported by this browser: ${error instanceof Error ? error.message : "unknown error"}`); }
  }

  async function testOutput(kind: "speaker" | "ring") {
    try {
      const device = await ensureDevice();
      if (kind === "speaker") await device.audio?.speakerDevices?.test();
      else await device.audio?.ringtoneDevices?.test();
      setMessage(`${kind === "speaker" ? "Speaker" : "Ring"} test played.`);
    } catch (error) { setMessage(`Test sound failed: ${error instanceof Error ? error.message : "browser blocked audio"}`); }
  }

  async function toggleMonitor(mode: Exclude<MonitorMode, null>) {
    if (listening === mode) { stopMonitor("Microphone monitor stopped."); return; }
    try { await loadDevices(); await startMonitor(mode); }
    catch (error) { stopMonitor(); setMessage(`Microphone monitor failed: ${error instanceof Error ? error.message : "permission or device error"}`); }
  }

  async function updateClearVoice(enabled: boolean, mode = clearVoiceMode) {
    stopMonitor();
    setClearVoiceEnabled(enabled);
    setClearVoiceMode(mode);
    saveAudioPreferences({ clearVoiceEnabled: enabled, clearVoiceMode: mode });
    try {
      await ensureDevice();
      setMessage(enabled && clearVoiceSupported ? `Pacifica ClearVoice is armed in ${clearVoiceModeLabels[mode]} mode.` : "ClearVoice is off. Browser-native call processing remains available.");
    } catch (error) { setMessage(`ClearVoice setup: ${error instanceof Error ? error.message : "unable to update"}`); }
  }

  const outputOptions = outputs.length ? outputs : [{ deviceId: "default", label: "Browser default" }];
  const inputOptions = inputs.length ? inputs : [{ deviceId: "default", label: "Browser default microphone" }];

  return <section className={`phone-config ${compact ? "compact" : ""}`}>
    <header><div><span>PHONE SETTINGS</span><b>Communication devices</b></div>{onClose && <button aria-label="Close phone settings" onClick={onClose}>×</button>}</header>
    <button className="network-test" onClick={runTest} disabled={testing}><span>⌁</span><div><b>{testing ? "Testing…" : "Run device, ClearVoice & connection test"}</b><small>{message}</small></div><em>{meter}%</em></button>

    <section className={`clearvoice-card ${clearVoiceEnabled ? "enabled" : ""}`}>
      <div className="clearvoice-head"><div><span>PACIFICA AUDIO LABS</span><h3>ClearVoice</h3><p>Adaptive on-device speech enhancement for every browser call.</p></div><label className="clearvoice-switch"><input type="checkbox" checked={clearVoiceEnabled} onChange={event => void updateClearVoice(event.target.checked)}/><i/><b>{clearVoiceEnabled ? "ON" : "OFF"}</b></label></div>
      <div className="clearvoice-status"><strong><i/>{clearVoiceSupported ? "ON-DEVICE ENGINE READY" : "NATIVE FALLBACK"}</strong><span>{clearVoiceSupported ? "Your audio stays in this browser." : "Update Chrome or Edge for the full engine."}</span></div>
      <div className="clearvoice-modes" aria-label="ClearVoice suppression level">{(["natural", "balanced", "focus"] as ClearVoiceMode[]).map(mode => <button key={mode} className={clearVoiceMode === mode ? "active" : ""} disabled={!clearVoiceEnabled} onClick={() => void updateClearVoice(true, mode)}><b>{clearVoiceModeLabels[mode]}</b><small>{mode === "natural" ? "Light cleanup" : mode === "balanced" ? "Everyday office" : "Loud spaces"}</small></button>)}</div>
      <div className="clearvoice-meter"><div><span>VOICE</span><i className={clearVoiceMetrics.voiceDetected ? "speaking" : ""}/></div><div><span>NOISE REDUCTION</span><b>{listening === "clearvoice" ? `${clearVoiceMetrics.reduction}%` : "READY"}</b></div></div>
      <div className="clearvoice-compare"><button className={listening === "raw" ? "active raw" : ""} onClick={() => void toggleMonitor("raw")}>{listening === "raw" ? "Stop original" : "Hear original"}</button><button className={listening === "clearvoice" ? "active" : ""} disabled={!clearVoiceEnabled || !clearVoiceSupported} onClick={() => void toggleMonitor("clearvoice")}>{listening === "clearvoice" ? "Stop ClearVoice" : "Hear ClearVoice"}</button><small>Use headphones, then make the same background noise during both tests.</small></div>
    </section>

    <div className="config-section"><span>HEADSET SETTINGS</span>
      <label>Microphone<select value={input} onChange={event => void selectInput(event.target.value)}>{inputOptions.map(item => <option key={item.deviceId} value={item.deviceId}>{item.label}</option>)}</select></label>
      <div className="volume-row"><small>Input level</small><i><b style={{ width: `${meter}%` }}/></i><em>{meter}%</em></div>
      <label>Speaker<select value={speaker} onChange={event => void selectOutput("speaker", event.target.value)}>{outputOptions.map(item => <option key={item.deviceId} value={item.deviceId}>{item.label}</option>)}</select></label>
      <div className="volume-row"><small>Test volume</small><input aria-label="Speaker test volume" type="range" min="0" max="100" value={speakerVolume} onChange={event => { const value=Number(event.target.value); setSpeakerVolume(value); saveAudioPreferences({ speakerVolume:value }); }}/><em>{speakerVolume}%</em><button onClick={() => void testOutput("speaker")}>Test</button></div>
      <label>Ring device<select value={ring} onChange={event => void selectOutput("ring", event.target.value)}>{outputOptions.map(item => <option key={item.deviceId} value={item.deviceId}>{item.label}</option>)}</select></label>
      <div className="volume-row"><small>Ring volume</small><input aria-label="Ring test volume" type="range" min="0" max="100" value={ringVolume} onChange={event => { const value=Number(event.target.value); setRingVolume(value); saveAudioPreferences({ ringVolume:value }); }}/><em>{ringVolume}%</em><button onClick={() => void testOutput("ring")}>Test</button></div>
      <label className="check-row"><input type="checkbox" checked={beep} onChange={event => { setBeep(event.target.checked); saveAudioPreferences({ beep:event.target.checked }); }}/> Beep when auto-answering</label>
    </div>
    <audio ref={monitorAudioRef} playsInline hidden/>
    <footer>ClearVoice runs locally. Browser and operating-system volume still control the final listening level.</footer>
  </section>;
}
