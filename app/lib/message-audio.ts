const audioExtensions: Record<string, string> = {
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a',
  'audio/aac': 'aac', 'audio/ogg': 'ogg', 'audio/webm': 'webm', 'audio/wav': 'wav',
  'audio/x-wav': 'wav', 'audio/vnd.wave': 'wav', 'audio/3gpp': '3gp',
  'audio/3gpp2': '3g2', 'audio/amr': 'amr', 'audio/amr-nb': 'amr', 'audio/x-caf': 'caf',
};
export const smsAudioTypes = new Set(['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/vnd.wave', 'audio/3gpp', 'audio/3gpp2', 'audio/amr', 'audio/amr-nb']);
export function mediaType(type: string) { return type.split(';')[0].trim().toLowerCase(); }
export function isMessageAudio(type: string) { return Object.hasOwn(audioExtensions, mediaType(type)); }
export function messageAudioName(type: string) { return `Voice-message.${audioExtensions[mediaType(type)] || 'audio'}`; }
export function inlineMessageMedia(type: string) {
  return /^(image\/(jpeg|jpg|png|gif|webp)|application\/pdf)$/i.test(mediaType(type)) || isMessageAudio(type);
}
