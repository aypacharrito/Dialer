import type {StoredCommunication} from "./communications";
export const messageReactions=[{emoji:"👍",label:"Like"},{emoji:"❤️",label:"Love"},{emoji:"😂",label:"Laugh"},{emoji:"🎉",label:"Celebrate"},{emoji:"🙏",label:"Thanks"},{emoji:"😮",label:"Surprised"}] as const;
export type MessageReaction=(typeof messageReactions)[number]["emoji"];
export function smsReactionBody(message:Pick<StoredCommunication,"body"|"attachments"|"mediaCount">,emoji:MessageReaction){
 const text=Array.from(message.body.trim().replace(/\s+/g," "));
 if(text.length)return `${emoji} to “${text.slice(0,100).join("")}${text.length>100?"…":""}”`;
 const files=message.attachments||[],count=Math.max(message.mediaCount||0,files.length);
 return `${emoji} to your ${count>1?"attachments":files[0]?.type.startsWith("image/")?"photo":files[0]?.type==="application/pdf"?"PDF":count?"attachment":"message"}`;
}
