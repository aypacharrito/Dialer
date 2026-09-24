export type DesktopMessage={id:string;leadId:number;name:string;body:string;channel:'sms'|'email';theme:string};
type DesktopBridge={isDesktop?:boolean;supportsDesktopWrapUp?:boolean;notifyMessage?:(message:DesktopMessage)=>void;onMessageAction?:(callback:(message:DesktopMessage)=>void)=>(()=>void)};
export function desktopNotifications(){return typeof window==='undefined'?undefined:(window as Window&{pacificaDesktop?:DesktopBridge}).pacificaDesktop}
