"use client";

import { UserButton, useClerk } from "@clerk/nextjs";

export default function ClerkTopAuth({avatarOnly=false}:{avatarOnly?:boolean}){
  const {signOut}=useClerk();
  if(avatarOnly)return <UserButton/>;
  return <div className="top-auth"><button onClick={()=>void signOut({redirectUrl:"/"})}>Log out</button></div>;
}
