"use client";

import { UserButton, useClerk } from "@clerk/nextjs";

export default function ClerkTopAuth({avatarOnly=false}:{avatarOnly?:boolean}){
  const {signOut}=useClerk();
  if(avatarOnly)return <UserButton/>;
  return <div className="top-auth"><button aria-label="Log out" title="Log out" onClick={()=>void signOut({redirectUrl:"/"})}><svg className="logout-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 5H5v14h4M13 8l4 4-4 4M9 12h12"/></svg><span className="logout-label">Log out</span></button></div>;
}
