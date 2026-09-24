'use client';
import {useEffect,useRef,useState} from 'react';
export default function AiCamera({onCapture,onClose}:{onCapture:(file:File)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),video=useRef<HTMLVideoElement>(null),stream=useRef<MediaStream|null>(null);
 const [error,setError]=useState(''),[ready,setReady]=useState(false);
 useEffect(()=>{let canceled=false;dialog.current?.showModal();
  if(!navigator.mediaDevices?.getUserMedia){queueMicrotask(()=>{if(!canceled)setError('This device cannot open a camera. Attach a photo or PDF instead.')});return()=>{canceled=true}}
  void navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false}).then(media=>{if(canceled){media.getTracks().forEach(track=>track.stop());return}stream.current=media;if(video.current){video.current.srcObject=media;void video.current.play().catch(()=>setError('Camera playback failed. Attach a photo instead.'))}}).catch(()=>{if(!canceled)setError('Camera access is unavailable. Allow camera access, or attach a photo or PDF.')});
  return()=>{canceled=true;stream.current?.getTracks().forEach(track=>track.stop());stream.current=null};
 },[]);
 function capture(){const source=video.current;if(!source?.videoWidth)return;const canvas=document.createElement('canvas');canvas.width=source.videoWidth;canvas.height=source.videoHeight;canvas.getContext('2d')?.drawImage(source,0,0);canvas.toBlob(blob=>{if(blob){onCapture(new File([blob],'camera-photo.jpg',{type:'image/jpeg'}));onClose()}},'image/jpeg',.9)}
 return <dialog ref={dialog} className="ai-camera-dialog" onCancel={onClose} aria-label="Take a photo"><header><h2>Take a photo</h2><button onClick={onClose} aria-label="Close camera">×</button></header>{error?<p role="alert">{error}</p>:<video ref={video} autoPlay playsInline muted onLoadedData={()=>setReady(true)}/>}<footer><button onClick={onClose}>Cancel</button><button disabled={!ready||Boolean(error)} onClick={capture}>Capture photo</button></footer></dialog>
}
