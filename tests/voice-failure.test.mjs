import test from 'node:test';import assert from 'node:assert/strict';
import {voiceFailure} from '../app/lib/voice-failure.ts';
import {voiceMessageOptions,voicePilotPrompt} from '../app/lib/voice-pilot.ts';
test('only known destination failures advance; auth, network, account and unknown failures stop with the real error',()=>{
 for(const code of [31003,31404,31480,31486,31603])assert.equal(voiceFailure({code,message:'Destination failed'}).advance,true);
 for(const code of [31000,31001,31005,31203,31204,31205,53405])assert.equal(voiceFailure({code,message:'Check connection'}).advance,false);
 assert.deepEqual(voiceFailure({twilioError:{code:31486,message:'Busy'}}),{message:'Phone error 31486: Busy',advance:true});
 assert.equal(voiceFailure(Error('Account unavailable')).message,'Account unavailable');
});
test('voicemail mode is bounded and prompt distinguishes screening, voicemail and real caller interest',()=>{
 const skip=voiceMessageOptions({},'Agency','+18185550999');assert.equal(skip.voicemail,'skip');
 const leave=voiceMessageOptions({voicemail:'leave'},'David’s Insurance','+18185550999');assert.match(leave.message,/Ava, the AI assistant/);assert.match(leave.message,/\+18185550999/);
 assert.equal(voiceMessageOptions({voicemail:'leave',message:'x'.repeat(900)},'Agency','number').message.length,400);
 const prompt=voicePilotPrompt('Agency','David',leave);assert.match(prompt,/clear recording beep/);assert.match(prompt,/not yet voicemail/);assert.match(prompt,/silence as interest/);assert.match(voicePilotPrompt('Agency','David',skip),/Do not leave a message/);
});
