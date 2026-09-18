import type { Call } from "@twilio/voice-sdk";

/** Silence only outbound playback before answer. Microphone mute is independent. */
export function attachQuietCallAudio(call: Call, initiallyQuiet: boolean, holdUntilReleased = false) {
  let quiet = initiallyQuiet;
  let answered = !holdUntilReleased && call.status() === "open";
  let disposed = false;
  const elements = new Map<HTMLAudioElement, boolean>();
  const tracks = new Map<MediaStreamTrack, boolean>();

  function restore() {
    for (const [element, muted] of elements) element.muted = muted;
    for (const [track, enabled] of tracks) track.enabled = enabled;
    elements.clear();
    tracks.clear();
  }

  function silenceExistingStream() {
    // Covers media created before Device.connect resolves. Never access local audio.
    if (!quiet || answered || disposed) return;
    for (const track of call.getRemoteStream()?.getAudioTracks() || []) {
      if (!tracks.has(track)) tracks.set(track, track.enabled);
      track.enabled = false;
    }
  }

  function onAudio(element: HTMLAudioElement) {
    if (!quiet || answered || disposed) return;
    if (!elements.has(element)) elements.set(element, element.muted);
    element.muted = true;
    silenceExistingStream();
  }

  function onAccept() {
    // Screening releases in the CRM's accept listener immediately afterward.
    // Until then, preserve silent ringback only if Quiet Dialing is still on.
    if (holdUntilReleased) {
      silenceExistingStream();
      return;
    }
    answered = true;
    restore();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    restore();
    call.removeListener("audio", onAudio);
    call.removeListener("accept", onAccept);
    call.removeListener("disconnect", dispose);
    call.removeListener("cancel", dispose);
    call.removeListener("reject", dispose);
    call.removeListener("error", dispose);
  }

  call.on("audio", onAudio);
  call.on("accept", onAccept);
  call.on("disconnect", dispose);
  call.on("cancel", dispose);
  call.on("reject", dispose);
  call.on("error", dispose);
  silenceExistingStream();

  return {
    dispose,
    release() {
      holdUntilReleased = false;
      answered = true;
      restore();
    },
    setQuiet(value: boolean) {
      // Explicitly respect the live UI toggle. Do not force quiet back on merely
      // because the call has a screening controller.
      quiet = value;
      if (!quiet) restore();
      else silenceExistingStream();
    },
  };
}