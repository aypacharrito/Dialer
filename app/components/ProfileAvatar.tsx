/* eslint-disable @next/next/no-img-element */
"use client";
import {useUser} from "@clerk/nextjs";
import {useState} from "react";
function SignedInAvatar(){const {user}=useUser();const [failed,setFailed]=useState("");return user?.imageUrl&&failed!==user.imageUrl?<span className="profile-avatar"><img src={user.imageUrl} alt={user.fullName?`${user.fullName} profile`:"Your profile"} width={40} height={40} onError={()=>setFailed(user.imageUrl)}/></span>:<span className="profile-avatar" aria-label="Profile">{user?.firstName?.[0]||"P"}</span>}
export default function ProfileAvatar({enabled=false}:{enabled?:boolean}){return enabled?<SignedInAvatar/>:<span className="profile-avatar" aria-hidden="true">P</span>}
