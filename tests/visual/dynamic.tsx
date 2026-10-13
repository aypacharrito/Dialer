import {lazy,Suspense,type ComponentType} from 'react';
export default function dynamic<P extends object>(loader:()=>Promise<{default:ComponentType<P>}>,options:{loading?:ComponentType}={}){const Component=lazy(loader),Loading=options.loading;return function PreviewLazy(props:P){return <Suspense fallback={Loading?<Loading/>:null}><Component {...props}/></Suspense>}}
