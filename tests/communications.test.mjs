import assert from "node:assert/strict";
import test from "node:test";
import {recommendedAutomationChannel} from "../app/lib/lead-automation.ts";
import {renderCommunicationTemplate,starterCommunicationTemplates,templatizeCommunication} from "../app/lib/message-templates.ts";
import {defaultWorkspaceProfile} from "../app/lib/workspace-profile.ts";

const profile={...defaultWorkspaceProfile,businessName:"Valley Roofing",agentName:"Alejandro",callbackNumber:"818-555-0100",emailSignature:"Alejandro · Valley Roofing"};
const lead={name:"Maria Torres",product:"Roof estimate",city:"Van Nuys"};

test("saved prompts personalize account and lead placeholders",()=>{
  const result=renderCommunicationTemplate("Hi {{first_name}}, {{agent_name}} can help with {{product}}. {{callback_line}}",lead,profile);
  assert.equal(result,"Hi Maria, Alejandro can help with Roof estimate. Call 818-555-0100.");
});

test("personalized drafts can be converted back into reusable prompts",()=>{
  const result=templatizeCommunication("Hi Maria, Alejandro at Valley Roofing can help with Roof estimate.",lead,profile);
  assert.match(result,/\{\{first_name\}\}/);
  assert.match(result,/\{\{agent_name\}\}/);
  assert.match(result,/\{\{business_name\}\}/);
  assert.match(result,/\{\{product\}\}/);
});

test("automation alternates channels and falls back safely",()=>{
  const base={id:1,stage:"New lead",outcome:"Not contacted",doNotCall:false,importedAt:"2026-08-27T00:00:00Z",email:"maria@example.com",smsConsent:true,emailConsent:true};
  assert.equal(recommendedAutomationChannel(base,0),"sms");
  assert.equal(recommendedAutomationChannel(base,1),"email");
  assert.equal(recommendedAutomationChannel({...base,smsConsent:false},0),"email");
  assert.equal(recommendedAutomationChannel({...base,smsConsent:false,emailConsent:false},0),"salesperson");
});

test("starter texts stay professional, identified, and opt-out compliant",()=>{
  const messages=starterCommunicationTemplates.filter(template=>template.channel==="sms").map(template=>renderCommunicationTemplate(template.body,lead,profile));
  assert.ok(messages.every(message=>message.startsWith("Hi Maria,")));
  assert.ok(messages.every(message=>message.includes("Valley Roofing")));
  assert.ok(messages.every(message=>message.endsWith("Reply STOP to opt out.")));
});
