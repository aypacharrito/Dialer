import type {AudioProcessor} from '@twilio/voice-sdk';

/** Gate speaker playback only. The original remote stream remains available to Ava. */
export function createPilotPlayback(context:AudioContext){
 let audible=false;
 const outputs=new Map<MediaStream,{source:MediaStreamAudioSourceNode;gain:GainNode;destination:MediaStreamAudioDestinationNode}>();
 const processor:AudioProcessor={
  async createProcessedStream(stream){
   const source=context.createMediaStreamSource(stream),gain=context.createGain(),destination=context.createMediaStreamDestination();
   gain.gain.value=audible?1:0;source.connect(gain);gain.connect(destination);
   outputs.set(destination.stream,{source,gain,destination});return destination.stream;
  },
  async destroyProcessedStream(stream){
   const output=outputs.get(stream);if(!output)return;output.source.disconnect();output.gain.disconnect();output.destination.disconnect();stream.getTracks().forEach(track=>track.stop());outputs.delete(stream);
  },
 };
 return {processor,listen(){audible=true;for(const output of outputs.values())output.gain.gain.value=1},silence(){audible=false;for(const output of outputs.values())output.gain.gain.value=0},close(){audible=false;for(const stream of outputs.keys())void processor.destroyProcessedStream(stream)}};
}
