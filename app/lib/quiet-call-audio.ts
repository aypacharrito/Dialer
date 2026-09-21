import {createRingbackTone} from "./ringback-tone";
import type { Call } from "@twilio/voice-sdk";

/** Silence only outbound playback before answer. Microphone mute is independent. */
export function attachQuietCallAudio(call: Call, initiallyQuiet: boolean, ringback = createRingbackTone()) {
  let quiet = initiallyQuiet;
  let answered = call.status() === "open";
  let disposed = false;
  let localRinging = false;
  function syncRingback(){if(localRinging&&!quiet&&!answered&&!disposed)void ringback.start();else ringback.stop()}
  function onRinging(hasEarlyMedia:boolean){localRinging=!hasEarlyMedia;syncRingback()}
  const knownElements = new Set<HTMLAudioElement>();
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
    for (const element of knownElements) {
      if (!elements.has(element)) elements.set(element, element.muted);
      element.muted = true;
    }
    for (const track of call.getRemoteStream()?.getAudioTracks() || []) {
      if (!tracks.has(track)) tracks.set(track, track.enabled);
      track.enabled = false;
    }
  }
  function onAudio(element: HTMLAudioElement) {
    if (disposed) return;
    knownElements.add(element);
    if (!quiet || answered || disposed) return;
    if (!elements.has(element)) elements.set(element, element.muted);
    element.muted = true;
    silenceExistingStream();
  }
  function onAccept() {
    answered = true;
    syncRingback();
    restore();
    knownElements.clear();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    ringback.stop();
    call.removeListener("ringing", onRinging);
    restore();
    knownElements.clear();
    call.removeListener("audio", onAudio);
    call.removeListener("accept", onAccept);
    call.removeListener("disconnect", dispose);
    call.removeListener("cancel", dispose);
    call.removeListener("reject", dispose);
    call.removeListener("error", dispose);
  }
  call.on("ringing", onRinging);
  call.on("audio", onAudio);
  call.on("accept", onAccept);
  call.on("disconnect", dispose);
  call.on("cancel", dispose);
  call.on("reject", dispose);
  call.on("error", dispose);
  silenceExistingStream();
  return {
    dispose,
    release() { answered = true; syncRingback(); restore(); },
    setQuiet(value: boolean) {
      quiet = value;
      syncRingback();
      if (!quiet) restore();
      else silenceExistingStream();
    },
  };
}
