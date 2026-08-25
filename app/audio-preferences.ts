import type { ClearVoiceMode } from "./clearvoice";

export const AUDIO_PREFERENCES_KEY = "pacific-audio-preferences";

export type AudioPreferences = {
  input: string;
  speaker: string;
  ring: string;
  speakerVolume: number;
  ringVolume: number;
  beep: boolean;
  clearVoiceEnabled: boolean;
  clearVoiceMode: ClearVoiceMode;
};

export const defaultAudioPreferences: AudioPreferences = {
  input: "default",
  speaker: "default",
  ring: "default",
  speakerVolume: 80,
  ringVolume: 55,
  beep: true,
  clearVoiceEnabled: true,
  clearVoiceMode: "balanced",
};

export function readAudioPreferences(): AudioPreferences {
  if (typeof window === "undefined") return defaultAudioPreferences;
  try {
    return { ...defaultAudioPreferences, ...JSON.parse(window.localStorage.getItem(AUDIO_PREFERENCES_KEY) || "{}") };
  } catch {
    return defaultAudioPreferences;
  }
}

export function saveAudioPreferences(patch: Partial<AudioPreferences>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_PREFERENCES_KEY, JSON.stringify({ ...readAudioPreferences(), ...patch }));
}
