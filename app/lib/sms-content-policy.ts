const publicShorteners=new Set(["bit.ly","tinyurl.com","t.co","goo.gl","ow.ly","buff.ly","rebrand.ly","cutt.ly","shorturl.at","is.gd","rb.gy"]);

function hostname(value:string){
  try{return new URL(value).hostname.toLowerCase().replace(/^www\./,"")}catch{return ""}
}

export function smsLinks(text:string){
  return Array.from(text.matchAll(/https?:\/\/[^\s<>"']+/gi),match=>match[0].replace(/[),.;!?]+$/,""));
}

export function validateSmsLinks(text:string){
  const urls=smsLinks(text);
  const configured=(process.env.PACIFICA_SMS_ALLOWED_LINK_DOMAINS||"").split(",").map(value=>value.trim().toLowerCase().replace(/^www\./,"")).filter(Boolean);
  for(const value of urls){
    let url:URL;
    try{url=new URL(value)}catch{throw new Error("A website link in this message is not a valid URL.")}
    if(url.protocol!=="https:")throw new Error("Use an HTTPS website link in text messages.");
    const host=hostname(value);
    if(publicShorteners.has(host))throw new Error("Use the real business website URL instead of a public link shortener. Branded links are safer for A2P delivery.");
    if(configured.length&&!configured.some(domain=>host===domain||host.endsWith(`.${domain}`)))throw new Error(`This link domain (${host}) is not on the workspace A2P approved-domain list.`);
  }
  return urls;
}
