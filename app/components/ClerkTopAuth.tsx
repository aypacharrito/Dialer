"use client";

import { UserButton, useClerk } from "@clerk/nextjs";

export default function ClerkTopAuth(){
  const {signOut}=useClerk();
  return <div className="top-auth"><UserButton/><button onClick={()=>void signOut({redirectUrl:"/"})}>Log out</button></div>;
}
