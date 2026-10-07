"use client";

import {memo, useState} from "react";

import Starfield from "./Starfield";

type Props = {appearance?: "light" | "dark"; lightUrl?: string; darkUrl?: string; motion?: boolean};

function DialerBackdrop({appearance = "dark", lightUrl = "", darkUrl = "", motion = true}: Props) {
  const custom = appearance === "dark" ? darkUrl : lightUrl;
  const [failed, setFailed] = useState("");
  const showCustom = Boolean(custom && failed !== custom);
  return <div className={`dialer-cosmos dialer-scene-${appearance}${showCustom ? " is-custom" : ""}`} aria-hidden="true">
    {showCustom ? <img key={custom} src={custom} referrerPolicy="no-referrer" onError={() => setFailed(custom)} alt="" decoding="async" draggable={false}/> : appearance === "dark" ? <Starfield motion={motion} className="dialer-stars"/> : <span className="dialer-watermark-stage"><img className="dialer-watermark" src="/pacifica-mark.png" width="160" height="160" alt="" decoding="async" draggable={false}/></span>}
  </div>;
}

export default memo(DialerBackdrop);
