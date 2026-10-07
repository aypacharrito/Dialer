'use client';
import {useEffect, useRef, useState} from 'react';
export default function VoiceMessagePlayer({src, active = true}: {src: string; active?: boolean}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState('');
  useEffect(() => {
    const player = audio.current;
    if (!active) player?.pause();
    return () => player?.pause();
  }, [src, active]);
  useEffect(() => {
    const pause = () => { if (document.hidden) audio.current?.pause(); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, []);
  return <div className="voice-message-player">
    <span>Voice message</span>
    <audio ref={audio} key={src} src={src} controls preload="metadata" aria-label="Play voice message" onError={() => setFailed(src)} onPlay={event => {
      if (!active) { event.currentTarget.pause(); return; }
      document.querySelectorAll<HTMLAudioElement>('.voice-message-player audio').forEach(player => { if (player !== event.currentTarget) player.pause(); });
    }}/>
    {failed === src && <small role="alert">This audio format cannot play here. Download to listen.</small>}
  </div>;
}
