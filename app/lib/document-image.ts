/** Decode phone photos with an HTML-image fallback for mobile browsers. */
export async function documentImageForAi(file:File,maxLength=1_900_000){
 let source:CanvasImageSource,width:number,height:number,dispose:()=>void;
 try{const bitmap=await createImageBitmap(file,{imageOrientation:"from-image"});source=bitmap;width=bitmap.width;height=bitmap.height;dispose=()=>bitmap.close()}
 catch{const url=URL.createObjectURL(file),image=new Image();try{await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("This phone image could not be decoded. Retake it with the camera or export it as JPG or PNG."));image.src=url});source=image;width=image.naturalWidth;height=image.naturalHeight;dispose=()=>URL.revokeObjectURL(url)}catch(error){URL.revokeObjectURL(url);throw error}}
 try{let scale=Math.min(1,2800/Math.max(width,height));const canvas=document.createElement("canvas"),context=canvas.getContext("2d");if(!context)throw Error("Could not prepare photo");
  for(let attempt=0;attempt<5;attempt++){canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.imageSmoothingEnabled=true;context.imageSmoothingQuality="high";context.drawImage(source,0,0,canvas.width,canvas.height);for(const quality of [.94,.87,.8]){const result=canvas.toDataURL("image/jpeg",quality);if(result.length<=maxLength)return result}scale*=.82}
 throw Error("Crop closer to the document and try again.");
 }finally{dispose()}
}
