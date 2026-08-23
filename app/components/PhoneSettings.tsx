"use client";

import { useState } from "react";
import type { Device } from "@twilio/voice-sdk";

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
  const [input, setInput] = useState("default");
  const [speaker, setSpeaker] = useState("default");
  const [ring, setRing] = useState("default");
  const [speakerVolume, setSpeakerVolume] = useState(80);
  const [ringVolume, setRingVolume] = useState(55);
  const [beep, setBeep] = useState(true);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("Run the test to grant microphone access and load your devices.");
  const [meter, setMeter] = useState(0);

  async function loadDevices() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    const device = await ensureDevice();
    const nextInputs = Array.from(device.audio?.availableInputDevices?.values?.() || []).map((item, index) => ({ deviceId: item.deviceId, label: item.label || `Microphone ${index + 1}` }));
    const nextOutputs = Array.from(device.audio?.availableOutputDevices?.values?.() || []).map((item, index) => ({ deviceId: item.deviceId, label: item.label || `Audio output ${index + 1}` }));
    setInputs(nextInputs.length ? nextInputs : [{ deviceId: "default", label: "Browser default microphone" }]);
    setOutputs(nextOutputs.length ? nextOutputs : [{ deviceId: "default", label: "Browser default output" }]);
    return device;
  }

  async function runTest() {
    setTesting(true);
    setMessage("Checking microphone, Twilio token, and connection latency…");
    try {
      const started = performance.now();
      const [device, response] = await Promise.all([loadDevices(), fetch("/api/twilio/token", { cache: "no-store" })]);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Token check failed (${response.status})`);
      }
      await device.audio?.setInputDevice(input);
      const handler = (value: number) => setMeter(Math.round(value * 100));
      device.audio?.on("inputVolume", handler);
      window.setTimeout(() => device.audio?.off("inputVolume", handler), 3500);
      setMessage(`Phone ready · API ${Math.round(performance.now() - started)} ms · speak to test the meter`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Device test failed";
      setMessage(`Test failed: ${detail}`);
    } finally {
      setTesting(false);
    }
  }

  async function selectInput(value: string) {
    setInput(value);
    try { const device = await loadDevices(); await device.audio?.setInputDevice(value); setMessage("Microphone updated."); }
    catch (error) { setMessage(`Microphone error: ${error instanceof Error ? error.message : "selection failed"}`); }
  }

  async function selectOutput(kind: "speaker" | "ring", value: string) {
    if (kind === "speaker") setSpeaker(value); else setRing(value);
    try {
      const device = await loadDevices();
      if (kind === "speaker") await device.audio?.speakerDevices?.set(value);
      else await device.audio?.ringtoneDevices?.set(value);
      setMessage(`${kind === "speaker" ? "Speaker" : "Ring device"} updated.`);
    } catch (error) { setMessage(`Output selection is not supported by this browser: ${error instanceof Error ? error.message : "unknown error"}`); }
  }

  async function testOutput(kind: "speaker" | "ring") {
    try {
      const device = await loadDevices();
      if (kind === "speaker") await device.audio?.speakerDevices?.test();
      else await device.audio?.ringtoneDevices?.test();
      setMessage(`${kind === "speaker" ? "Speaker" : "Ring"} test played.`);
    } catch (error) { setMessage(`Test sound failed: ${error instanceof Error ? error.message : "browser blocked audio"}`); }
  }

  const outputOptions = outputs.length ? outputs : [{ deviceId: "default", label: "Browser default" }];
  const inputOptions = inputs.length ? inputs : [{ deviceId: "default", label: "Browser default microphone" }];

  return <section className={`phone-config ${compact ? "compact" : ""}`}>
    <header><div><span>PHONE SETTINGS</span><b>Communication devices</b></div>{onClose && <button aria-label="Close phone settings" onClick={onClose}>×</button>}</header>
    <button className="network-test" onClick={runTest} disabled={testing}><span>⌁</span><div><b>{testing ? "Testing…" : "Run device & connection test"}</b><small>{message}</small></div><em>{meter}%</em></button>
    <div className="config-section"><span>HEADSET SETTINGS</span>
      <label>Microphone<select value={input} onChange={event => void selectInput(event.target.value)}>{inputOptions.map(item => <option key={item.deviceId} value={item.deviceId}>{item.label}</option>)}</select></label>
      <div className="volume-row"><small>Input level</small><i><b style={{ width: `${meter}%` }}/></i><em>{meter}%</em></div>
      <label>Speaker<select value={speaker} onChange={event => void selectOutput("speaker", event.target.value)}>{outputOptions.map(item => <option key={item.deviceId} value={item.deviceId}>{item.label}</option>)}</select></label>
      <div className="volume-row"><small>Test volume</small><input aria-label="Speaker test volume" type="range" min="0" max="100" value={speakerVolume} onChange={event => setSpeakerVolume(Number(event.target.value))}/><em>{speakerVolume}%</em><button onClick={() => void testOutput("speaker")}>Test</button></div>
      <label>Ring device<select value={ring} onChange={event => void selectOutput("ring", event.target.value)}>{outputOptions.map(item => <option key={item.deviceId} value={item.deviceId}>{item.label}</option>)}</select></label>
      <div className="volume-row"><small>Ring volume</small><input aria-label="Ring test volume" type="range" min="0" max="100" value={ringVolume} onChange={event => setRingVolume(Number(event.target.value))}/><em>{ringVolume}%</em><button onClick={() => void testOutput("ring")}>Test</button></div>
      <label className="check-row"><input type="checkbox" checked={beep} onChange={event => setBeep(event.target.checked)}/> Beep when auto-answering</label>
    </div>
    <footer>Browser and operating-system volume still control the final listening level.</footer>
  </section>;
}
