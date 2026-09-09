"use client";
import {useSyncExternalStore} from "react";
const subscribe=()=>()=>{};
const getSnapshot=()=>Boolean((window as Window&{pacificaDesktop?:{isDesktop?:boolean}}).pacificaDesktop?.isDesktop);
const getServerSnapshot=()=>false;
export function useNativeDesktop(){return useSyncExternalStore(subscribe,getSnapshot,getServerSnapshot)}
