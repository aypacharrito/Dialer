export const voiceMessageSeconds = 90;
/** Encode locally: microphone recordings are never sent to an AI/transcription API. */
export async function encodeVoiceMessage(recording: Blob, signal: AbortSignal): Promise<File> {
  signal.throwIfAborted();
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await recording.arrayBuffer());
    signal.throwIfAborted();
    if (!decoded.length || !decoded.duration) throw Error('No audio recorded. Try again.');
    if (decoded.duration > voiceMessageSeconds + 2) throw Error('Keep voice messages under 90 seconds.');
    const offline = new OfflineAudioContext(1, Math.ceil(Math.min(decoded.duration, voiceMessageSeconds) * 16000), 16000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const mono = (await offline.startRendering()).getChannelData(0);
    const {Mp3Encoder} = await import('@breezystack/lamejs');
    signal.throwIfAborted();
    const encoder = new Mp3Encoder(1, 16000, 32);
    const parts: ArrayBuffer[] = [];
    for (let offset = 0; offset < mono.length; offset += 1152) {
      signal.throwIfAborted();
      const pcm = new Int16Array(Math.min(1152, mono.length - offset));
      for (let i = 0; i < pcm.length; i++) {
        const sample = Math.max(-1, Math.min(1, mono[offset + i]));
        pcm[i] = Math.round(sample * (sample < 0 ? 32768 : 32767));
      }
      const bytes = encoder.encodeBuffer(pcm);
      if (bytes.length) parts.push(new Uint8Array(bytes).buffer);
      if (offset % (1152 * 40) === 0) await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    const tail = encoder.flush();
    if (tail.length) parts.push(new Uint8Array(tail).buffer);
    signal.throwIfAborted();
    const file = new File(parts, 'Voice-message.mp3', {type: 'audio/mpeg'});
    if (!file.size || file.size > 450000) throw Error('This recording is too large to send. Record a shorter message.');
    return file;
  } finally { await context.close(); }
}
