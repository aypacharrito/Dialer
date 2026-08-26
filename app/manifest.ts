import type { MetadataRoute } from "next";

export default function manifest():MetadataRoute.Manifest{
  return {
    id:"/dashboard",
    name:"Pacifica CRM",
    short_name:"Pacifica",
    description:"A phone-first CRM that works every lead and keeps every next step visible.",
    start_url:"/dashboard",
    scope:"/",
    display:"standalone",
    background_color:"#111315",
    theme_color:"#177e83",
    orientation:"any",
    categories:["business","productivity"],
    icons:[
      {src:"/pacifica-icon-192.png",sizes:"192x192",type:"image/png"},
      {src:"/pacifica-icon-512.png",sizes:"512x512",type:"image/png"},
      {src:"/pacifica-icon-512-maskable.png",sizes:"512x512",type:"image/png",purpose:"maskable"},
    ],
  };
}
