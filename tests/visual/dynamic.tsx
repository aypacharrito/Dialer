import {lazy,Suspense,type ComponentType} from 'react';
export default function dynamic(loader:()=>Promise<{default:ComponentType<any>}>,options:{loading?:ComponentType}={}){const Component=lazy(loader),Loading=options.loading;return function PreviewLazy(props:any){return <Suspense fallback={Loading?<Loading/>:null}><Component {...props}/></Suspense>}}
