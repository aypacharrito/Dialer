import test from "node:test";
import assert from "node:assert/strict";
import {cleanWorkspaceProfile} from "../app/lib/workspace-profile.ts";
import {businessAiContext,leadAiContext} from "../app/lib/business-context.ts";
import {renderCommunicationTemplate} from "../app/lib/message-templates.ts";

test("workspace business intelligence is tenant configurable and legacy insurance is preserved",()=>{
  const legacy=cleanWorkspaceProfile({mode:"insurance"});
  assert.equal(legacy.industry,"insurance");
  const profile=cleanWorkspaceProfile({industry:"automotive",businessName:"Valley Motors",productsServices:["Used cars","Financing"],valueProposition:"Transparent vehicle history",outreachTone:"consultative",maxAutomatedTouchesPerLeadPerDay:9});
  assert.equal(profile.industry,"automotive");
  assert.deepEqual(profile.productsServices,["Used cars","Financing"]);
  assert.equal(profile.maxAutomatedTouchesPerLeadPerDay,3);
  assert.equal(businessAiContext(profile).industryLabel,"Automotive / dealership");
});

test("dynamic lead context uses useful CSV fields without exposing common sensitive identifiers",()=>{
  const context=leadAiContext({id:7,name:"Alex",email:"alex@example.com",phone:"8185550100",product:"SUV",importedFields:{Year:"2025",Make:"Toyota",Model:"RAV4",DOB:"01/01/1990",Email:"alex@example.com"},extraFields:{TradeIn:"Yes",Budget:"35000"}},false);
  assert.equal(context.importedFields.Year,"2025");
  assert.equal(context.importedFields.Make,"Toyota");
  assert.equal(context.providerFields.TradeIn,"Yes");
  assert.equal(context.importedFields.DOB,undefined);
  assert.equal(context.importedFields.Email,undefined);
});

test("saved templates can reference arbitrary imported fields",()=>{
  const profile=cleanWorkspaceProfile({industry:"automotive",businessName:"Valley Motors",agentName:"David"});
  const rendered=renderCommunicationTemplate("Hi {{first_name}}, is the {{field:Year}} {{field:Make}} still what you're shopping for? - {{agent_name}}",{name:"Alex Rivera",product:"SUV",city:"Van Nuys",importedFields:{Year:"2025",Make:"Toyota"}},profile);
  assert.match(rendered,/2025 Toyota/);
  assert.match(rendered,/David/);
});
