export function logEvent(event:string,data:Record<string,unknown>={}){
  console.log(JSON.stringify({level:"info",event,time:new Date().toISOString(),...data}));
}

export function logError(event:string,error:unknown,data:Record<string,unknown>={}){
  console.error(JSON.stringify({level:"error",event,time:new Date().toISOString(),message:error instanceof Error?error.message:String(error),...data}));
}

