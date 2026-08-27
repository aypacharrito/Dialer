import {clerkClient} from "@clerk/nextjs/server";
import {getPacificaAccess} from "../../../lib/clerk-access";
import {isClerkConfigured} from "../../../lib/clerk-config";
import {readStoredWorkspace,writeStoredWorkspace} from "../../../lib/workspace-storage";
import {defaultWorkspaceProfile,type WorkspaceTeamMember} from "../../../lib/workspace-profile";

export const runtime="nodejs";

async function manager(){
  if(!isClerkConfigured())return process.env.VERCEL?null:{allowed:true,role:"owner" as const,userId:"local",accountUserId:"local",email:"local"};
  const access=await getPacificaAccess();return access.allowed&&(access.role==="owner"||access.role==="manager")?access:null;
}

export async function GET(){
  const access=await manager();if(!access)return Response.json({error:"Workspace-manager access required"},{status:403});
  const workspace=await readStoredWorkspace(access.userId);return Response.json({members:workspace?.profile.teamRoster||[]},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
  const access=await manager();if(!access)return Response.json({error:"Workspace-manager access required"},{status:403});
  try{
    const body=await request.json() as {action?:"add"|"remove"|"update";email?:string;userId?:string;role?:"manager"|"agent";active?:boolean};
    const action=body.action||"add";const workspace=await readStoredWorkspace(access.userId)||{leads:[],callLogs:[],profile:defaultWorkspaceProfile};let roster=[...workspace.profile.teamRoster];
    if(action==="add"){
      const email=String(body.email||"").trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return Response.json({error:"Enter the teammate’s sign-in email"},{status:400});
      const client=await clerkClient();const result=await client.users.getUserList({emailAddress:[email],limit:1});const user=result.data[0];
      if(!user)return Response.json({error:"That person must create their Pacifica sign-in first, then add the same email here."},{status:404});
      if(user.id===access.accountUserId)return Response.json({error:"The workspace owner is already included."},{status:400});
      const role=body.role==="manager"?"manager" as const:"agent" as const;
      await client.users.updateUserMetadata(user.id,{privateMetadata:{...user.privateMetadata,pacificaWorkspaceId:access.userId,pacificaRole:role,pacificaOwnerEmail:access.email}});
      const name=[user.firstName,user.lastName].filter(Boolean).join(" ")||email;const member:WorkspaceTeamMember={userId:user.id,email,name,role,active:true};
      roster=[...roster.filter(item=>item.userId!==user.id&&item.email!==email),member];
    }else{
      const member=roster.find(item=>item.userId===body.userId);if(!member)return Response.json({error:"Team member not found"},{status:404});
      const client=await clerkClient();const user=await client.users.getUser(member.userId);
      if(action==="remove"){
        await client.users.updateUserMetadata(member.userId,{privateMetadata:{...user.privateMetadata,pacificaWorkspaceId:"",pacificaRole:"",pacificaOwnerEmail:""}});roster=roster.filter(item=>item.userId!==member.userId);
      }else{
        const role=body.role==="manager"?"manager" as const:"agent" as const;const active=body.active!==false;
        await client.users.updateUserMetadata(member.userId,{privateMetadata:{...user.privateMetadata,pacificaWorkspaceId:active?access.userId:"",pacificaRole:active?role:"",pacificaOwnerEmail:active?access.email:""}});
        roster=roster.map(item=>item.userId===member.userId?{...item,role,active}:item);
      }
    }
    const profile={...workspace.profile,teamRoster:roster,teamMembers:roster.filter(item=>item.active).map(item=>item.name)};await writeStoredWorkspace(access.userId,{...workspace,profile});
    return Response.json({ok:true,members:roster});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to update team"},{status:500})}
}
