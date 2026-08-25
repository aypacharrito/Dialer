"use client";

import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";

export default function ClerkNavAuth(){
  const {isLoaded,isSignedIn}=useUser();
  const {signOut}=useClerk();
  if(!isLoaded)return null;
  if(!isSignedIn)return <Link href="/login">Log in</Link>;
  return <><Link href="/dashboard">Open CRM</Link><button className="nav-logout" onClick={()=>void signOut({redirectUrl:"/"})}>Log out</button></>;
}
