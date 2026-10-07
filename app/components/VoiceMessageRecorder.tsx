'use client';
import {useEffect, useRef, useState} from 'react';
import {encodeVoiceMessage, voiceMessageSeconds} from '../lib/voice-message-encode';
import VoiceMessagePlayer from './VoiceMessagePlayer';
type Session = {controller: AbortController; stream?: MediaStream; recorder?: MediaRecorder; timer?: ReturnType<typeof setInterval>; started?: number};
type Props = {disabled: boolean; active: boolean; onBusyChange: (busy: boolean) => void; onAttach: (file: File) => Promise<boolean>};
export default function VoiceMessageRecorder(props: Props) {
  return props.active ? <Recorder {...props}/> : null;
}
function Recorder({disabled, active, onBusyChange, onAttach}: Props) {
  const [phase, setPhase] = useState<'idle' | 'starting' | 'recording' | 'encoding' | 'attaching'>('idle');
  const [seconds, setSeconds] = useState(0), [error, setError] = useState('');
  const [preview, setPreview] = useState<{file: File; url: string} | null>(null);
  const session = useRef<Session | null>(null), previewRef = useRef<string | null>(null);
  const callbacks = useRef({onBusyChange, onAttach});
  useEffect(() => { callbacks.current = {onBusyChange, onAttach}; }, [onBusyChange, onAttach]);
  useEffect(() => {
    function discard() {
      const current = session.current; session.current = null;
      current?.controller.abort(); clearInterval(current?.timer);
      if (current?.recorder?.state === 'recording') current.recorder.stop();
      current?.stream?.getTracks().forEach(track => track.stop());
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      callbacks.current.onBusyChange(false);
    }
    return discard;
  }, []);
  function cancel() {
    const current = session.current; session.current = null;
    current?.controller.abort(); clearInterval(current?.timer);
    if (current?.recorder?.state === 'recording') current.recorder.stop();
    current?.stream?.getTracks().forEach(track => track.stop());
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null; setPreview(null); setPhase('idle'); setError(''); callbacks.current.onBusyChange(false);
  }
  async function start() {
    if (disabled || !active || session.current) return;
    cancel(); setError(''); setSeconds(0); setPhase('starting'); callbacks.current.onBusyChange(true);
    const current: Session = {controller: new AbortController()}; session.current = current;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw Error('Voice recording is unavailable in this browser.');
      current.stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}, video: false});
      if (current.controller.signal.aborted) { current.stream.getTracks().forEach(track => track.stop()); return; }
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(current.stream, {audioBitsPerSecond: 32000, ...(mimeType ? {mimeType} : {})});
      current.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => { if (!current.controller.signal.aborted) { cancel(); setError('Recording stopped. Try again.'); } };
      recorder.onstop = async () => {
        clearInterval(current.timer); current.stream?.getTracks().forEach(track => track.stop());
        if (current.controller.signal.aborted) return;
        setPhase('encoding');
        try {
          const file = await encodeVoiceMessage(new Blob(chunks, {type: recorder.mimeType}), current.controller.signal);
          if (current.controller.signal.aborted) return;
          const url = URL.createObjectURL(file); previewRef.current = url; setPreview({file, url});
        } catch (reason) { if (!current.controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not prepare this recording.'); }
        finally { if (!current.controller.signal.aborted) { session.current = null; setPhase('idle'); callbacks.current.onBusyChange(false); } }
      };
      recorder.start(); current.started = Date.now(); setPhase('recording');
      current.timer = setInterval(() => {
        const elapsed = Math.min(voiceMessageSeconds, Math.floor((Date.now() - current.started!) / 1000)); setSeconds(elapsed);
        if (elapsed >= voiceMessageSeconds && recorder.state === 'recording') recorder.stop();
      }, 250);
    } catch (reason) {
      current.stream?.getTracks().forEach(track => track.stop());
      if (!current.controller.signal.aborted) { session.current = null; setPhase('idle'); callbacks.current.onBusyChange(false); setError(reason instanceof Error ? reason.message : 'Allow microphone access to record.'); }
    }
  }
  async function attach() {
    if (!preview || phase !== 'idle' || disabled) return;
    setPhase('attaching'); callbacks.current.onBusyChange(true);
    const url = preview.url;
    const ok = await callbacks.current.onAttach(preview.file);
    if (previewRef.current !== url) return;
    setPhase('idle'); callbacks.current.onBusyChange(false);
    if (ok) { URL.revokeObjectURL(url); previewRef.current = null; setPreview(null); }
  }
  return <div className={`voice-message-recorder ${phase}`}>
    {!preview && <button type="button" disabled={disabled || !active || !['idle', 'recording'].includes(phase)} aria-pressed={phase === 'recording'} onClick={() => phase === 'recording' ? session.current?.recorder?.stop() : void start()}>
      {phase === 'recording' ? `Stop · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : phase === 'encoding' ? 'Preparing audio…' : phase === 'starting' ? 'Opening microphone…' : 'Record voice message'}
    </button>}
    {preview && <><VoiceMessagePlayer src={preview.url} active={active}/><button type="button" disabled={disabled || phase !== 'idle'} onClick={() => void attach()}>{phase === 'attaching' ? 'Attaching…' : 'Attach voice message'}</button></>}
    {(phase !== 'idle' || preview) && <button type="button" disabled={phase === 'attaching'} aria-label="Discard voice message" onClick={cancel}>×</button>}
    {phase === 'recording' && <small role="status">Recording · up to 1:30</small>}
    {error && <small role="alert">{error}</small>}
  </div>;
}
