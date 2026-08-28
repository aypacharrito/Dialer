import test from "node:test";
import assert from "node:assert/strict";
import {cleanWorkspaceProfile,defaultWorkspaceProfile} from "../app/lib/workspace-profile.ts";

test("new and legacy workspaces default to the white theme",()=>{
  assert.equal(defaultWorkspaceProfile.appearance,"light");
  assert.equal(cleanWorkspaceProfile({mode:"insurance"}).appearance,"light");
});

test("dark mode is retained as an account preference",()=>{
  assert.equal(cleanWorkspaceProfile({appearance:"dark"}).appearance,"dark");
  assert.equal(cleanWorkspaceProfile({appearance:"unknown"}).appearance,"light");
});
