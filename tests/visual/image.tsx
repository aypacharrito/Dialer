import type {ImgHTMLAttributes} from 'react';
export default function Image({priority,fill,...props}:ImgHTMLAttributes<HTMLImageElement>&{priority?:boolean;fill?:boolean}){void priority;void fill;return <img {...props} alt={props.alt||''}/>}
