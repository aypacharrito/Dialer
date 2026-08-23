"use client";

import { useEffect, useRef, useState } from "react";
import type { Device } from "@twilio/voice-sdk";
import { defaultAudioPreferences, readAudioPreferences, saveAudioPreferences } from "../audio-preferences";

type AudioChoice = { deviceId: string; label: string };

export default function PhoneSettings({
  ensureDevice,
  compact = false,
  onClose,
}: {
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
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("Run the test to grant microphone access and load your devices.");
  const [meter, setMeter] = useState(0);
  const [listening, setListening] = useState(false);
  const monitorStreamRef = useRef<MediaStream | null>(null);
  const monitorAudioRef = useRef<HTMLAudioElement | null>(null);
  const monitorContextRef = useRef<AudioContext | null>(null);
  const monitorFrameRef = useRef<number | null>(null);
  const monitorTimerRef = useRef<number | null>(null);
  const inputRef = useRef(defaultAudioPreferences.input);
  const speakerRef = useRef(defaultAudioPreferences.speaker);

  function stopMonitor(nextMessage?: string) {
    if (monitorTimerRef.current) window.clearTimeout(monitorTimerRef.current);
    if (monitorFrameRef.current) window.cancelAnimationFrame(monitorFrameRef.current);
    monitorTimerRef.current = null; monitorFrameRef.current = null;
    monitorStreamRef.current?.getTracks().forEach(track => track.stop()); monitorStreamRef.current = null;
    if (monitorAudioRef.current) { monitorAudioRef.current.pause(); monitorAudioRef.current.srcObject = null; }
    void monitorContextRef.current?.close(); monitorContextRef.current = null;
    setListening(false); setMeter(0); if (nextMessage) setMessage(nextMessage);
  }

  useEffect(() => {
    queueMicrotask(() => {
      const saved = readAudioPreferences();
      inputRef.current = saved.input;
      speakerRef.current = saved.speaker;
      setInput(saved.input); setSpeaker(saved.speaker); setRing(saved.ring);
      setSpeakerVolume(saved.speakerVolume); setRingVolume(saved.ringVolume); setBeep(saved.beep);
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
    if (selectedInput !== "default" && !nextInputs.some(item => item.deviceId === selectedInput)) {
      throw new Error("Your saved microphone is not connected. Reconnect it or choose another microphone.");
    }
    return { nextInputs, nextOutputs };
  }

  async function startMeter(hearYourself: boolean) {
    stopMonitor();
    const selectedInput = inputRef.current;
    const audioConstraints: MediaTrackConstraints = selectedInput === "default" ? { echoCancellation: !hearYourself } : { deviceId: { exact: selectedInput }, echoCancellation: !hearYourself };
    const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    monitorStreamRef.current = stream;
    const context = new AudioContext(); monitorContextRef.current = context;
    const analyser = context.createAnalyser(); analyser.fftSize = 256;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);
    const updateMeter = () => { analyser.getByteTimeDomainData(samples); const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample - 128)), 0); setMeter(Math.min(100, Math.round((peak / 64) * 100))); monitorFrameRef.current = window.requestAnimationFrame(updateMeter); };
    updateMeter();
    if (hearYourself && monitorAudioRef.current) {
      monitorAudioRef.current.srcObject = stream; monitorAudioRef.current.volume = speakerVolume / 100;
      const sinkAudio = monitorAudioRef.current as HTMLAudioElement & { setSinkId?: (deviceId: string) => Promise<void> };
      if (speakerRef.current !== "default" && sinkAudio.setSinkId) await sinkAudio.setSinkId(speakerRef.current);
      await monitorAudioRef.current.play(); setListening(true);
      setMessage("Live microphone monitor is on. Use headphones to prevent feedback.");
    } else {
      monitorTimerRef.current = window.setTimeout(() => stopMonitor("Microphone detected. The level meter responded successfully."), 4500);
    }
  }

  async function runTest() {
    setTesting(true);
    setMessage("Checking microphone, Twilio token, and connection latency…");
    try {
      const started = performance.now();
      await loadDevices();
      const [device, response] = await Promise.all([ensureDevice(), fetch("/api/twilio/token", { cache: "no-store" })]);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Token check failed (${response.status})`);
      }
      await device.audio?.setInputDevice(inputRef.current);
      await startMeter(false);
      setMessage(`Phone ready · API ${Math.round(performance.now() - started)} ms · speak now to test the meter`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Device test failed";
      setMessage(`Test failed: ${detail}`);
    } finally {
      setTesting(false);
    }
  }

  async function selectInput(value: string) {
    stopMonitor(); inputRef.current = value; setInput(value); saveAudioPreferences({ input: value });
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

  async function toggleListen() {
    if (listening) { stopMonitor("Microphone monitor stopped."); return; }
    try { await loadDevices(); await startMeter(true); }
    catch (error) { stopMonitor(); setMessage(`Microphone monitor failed: ${error instanceof Error ? error.message : "permission or device error"}`); }
  }

  const outputOptions = outputs.length ? outputs : [{ deviceId: "default", label: "Browser default" }];
  const inputOptions = inputs.length ? inputs : [{ deviceId: "default", label: "Browser default microphone" }];

  return <section className={`phone-config ${compact ? "compact" : ""}`}>
    <header><div><span>PHONE SETTINGS</span><b>Communication devices</b></div>{onClose && <button aria-label="Close phone settings" onClick={onClose}>×</button>}</header>
    <button className="network-test" onClick={runTest} disabled={testing}><span>⌁</span><div><b>{testing ? "Testing…" : "Run device & connection test"}</b><small>{message}</small></div><em>{meter}%</em></button>
    <div className="config-section"><span>HEADSET SETTINGS</span>
      <label>Microphone<select value={input} onChange={event => void selectInput(event.target.value)}>{inputOptions.map(item => <option key={item.deviceId} value={item.deviceId}>{item.label}</option>)}</select></label>
      <div className="volume-row"><small>Input level</small><i><b style={{ width: `${meter}%` }}/></i><em>{meter}%</em></div>
      <div className="listen-row"><button className={listening ? "active" : ""} onClick={() => void toggleListen()}>{listening ? "Stop hearing myself" : "Hear my microphone"}</button><small>Wear headphones first—speakers can create loud feedback.</small></div>
      <label>Speaker<select value={speaker} onChange={event => void selectOutput("speaker", event.target.value)}>{outputOptions.map(item => <option key={item.deviceId} value={item.deviceId}>{item.label}</option>)}</select></label>
      <div className="volume-row"><small>Test volume</small><input aria-label="Speaker test volume" type="range" min="0" max="100" value={speakerVolume} onChange={event => { const value=Number(event.target.value); setSpeakerVolume(value); saveAudioPreferences({ speakerVolume:value }); }}/><em>{speakerVolume}%</em><button onClick={() => void testOutput("speaker")}>Test</button></div>
      <label>Ring device<select value={ring} onChange={event => void selectOutput("ring", event.target.value)}>{outputOptions.map(item => <option key={item.deviceId} value={item.deviceId}>{item.label}</option>)}</select></label>
      <div className="volume-row"><small>Ring volume</small><input aria-label="Ring test volume" type="range" min="0" max="100" value={ringVolume} onChange={event => { const value=Number(event.target.value); setRingVolume(value); saveAudioPreferences({ ringVolume:value }); }}/><em>{ringVolume}%</em><button onClick={() => void testOutput("ring")}>Test</button></div>
      <label className="check-row"><input type="checkbox" checked={beep} onChange={event => { setBeep(event.target.checked); saveAudioPreferences({ beep:event.target.checked }); }}/> Beep when auto-answering</label>
    </div>
    <audio ref={monitorAudioRef} playsInline hidden/>
    <footer>Browser and operating-system volume still control the final listening level.</footer>
  </section>;
}
