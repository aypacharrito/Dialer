export function overlayTop(headerBottom:number,viewportHeight:number):number{
  if(!Number.isFinite(headerBottom)||!Number.isFinite(viewportHeight))return 60;
  return Math.max(0,Math.min(Math.ceil(headerBottom),Math.max(0,viewportHeight-1)));
}
