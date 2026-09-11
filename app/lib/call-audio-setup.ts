import type {Device} from '@twilio/voice-sdk';
import type {AudioPreferences} from '../audio-preferences';

function missingDevice(error:unknown){
  const value=error as {name?:string;message?:string};
  return ['NotFoundError','DevicesNotFoundError','OverconstrainedError'].includes(value?.name||'')||/devices? not found|device.*not available/i.test(value?.message||'');
}
export async function openCallMicrophone(preferences:AudioPreferences,getUserMedia:(constraints:MediaStreamConstraints)=>Promise<MediaStream>){
  const audio:MediaTrackConstraints={echoCancellation:true,autoGainControl:true,noiseSuppression:!preferences.clearVoiceEnabled,channelCount:1,sampleRate:{ideal:48000}};
  try{return {stream:await getUserMedia({audio:{...audio,...(preferences.input==='default'?{}:{deviceId:{exact:preferences.input}})}}),input:preferences.input}}
  catch(error){
    if(preferences.input==='default'||!missingDevice(error))throw error;
    return {stream:await getUserMedia({audio}),input:'default'};
  }
}

/** Resolve stale device IDs before dialing; permission and hardware failures remain visible. */
export async function configureCallAudio(audio:Device['audio'],preferences:AudioPreferences){
  const patch:Partial<AudioPreferences>={};
  if(!audio)return patch;
  const input=audio.availableInputDevices.has(preferences.input)?preferences.input:audio.availableInputDevices.has('default')?'default':audio.availableInputDevices.keys().next().value;
  if(!input)throw new Error('No microphone is available. Connect one and retry.');
  await audio.setInputDevice(input);
  if(input!==preferences.input)patch.input='default';
  if(!audio.isOutputSelectionSupported)return patch;
  const fallback=audio.availableOutputDevices.has('default')?'default':audio.availableOutputDevices.keys().next().value;
  for(const [key,collection] of [['speaker',audio.speakerDevices],['ring',audio.ringtoneDevices]] as const){
    const preferred=preferences[key];
    const resolved=audio.availableOutputDevices.has(preferred)?preferred:fallback;
    if(!resolved)throw new Error('No speaker is available. Connect headphones or select a Windows output device.');
    try{await collection.set(resolved)}catch(error){
      if(!missingDevice(error)||!fallback||resolved===fallback)throw error;
      await collection.set(fallback);patch[key]='default';
    }
    if(resolved!==preferred)patch[key]='default';
  }
  return patch;
}

export function callSetupMessage(error:unknown){
  const value=error as {name?:string;message?:string};
  if(['NotAllowedError','PermissionDeniedError'].includes(value?.name||''))return 'Microphone permission is blocked. Allow it for Pacifica, then retry.';
  if(missingDevice(error))return 'Your audio device is unavailable. Check the microphone and speaker in Calling settings, then retry.';
  return value?.message||'Unable to place call';
}
