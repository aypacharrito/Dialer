"use client";

import { UserButton } from "@clerk/nextjs";

export default function ClerkUserMenu(){
  return <div className="clerk-user-menu"><UserButton showName/></div>;
}
