"use client";

import {memo, useState} from "react";

type Props = {appearance?: "light" | "dark"; lightUrl?: string; darkUrl?: string; motion?: boolean};

function DialerBackdrop({appearance = "dark", lightUrl = "", darkUrl = ""}: Props) {
  const custom = appearance === "dark" ? darkUrl : lightUrl;
  const [failed, setFailed] = useState("");
  const showCustom = Boolean(custom && failed !== custom);
  return <div className={`dialer-cosmos dialer-scene-${appearance}${showCustom ? " is-custom" : ""}`} aria-hidden="true">
    <svg className="dialer-watermark-filter" width="0" height="0" focusable="false"><defs><filter id="pacifica-watermark-sharp" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/><feComponentTransfer><feFuncA type="discrete" tableValues="0 0 1 1"/></feComponentTransfer></filter></defs></svg>
    {showCustom ? <img key={custom} src={custom} referrerPolicy="no-referrer" onError={() => setFailed(custom)} alt="" decoding="async" draggable={false}/> : <>
      <img key={appearance} className="dialer-stars dialer-stars-4k" src={`/images/pacifica-stars-${appearance}-4k.webp`} width="3840" height="2160" alt="" decoding="async" draggable={false}/>
      <span className="dialer-watermark-stage"><img className="dialer-watermark" src="/images/pacifica-watermark-hires.webp" width="2880" height="2880" alt="" decoding="async" draggable={false}/></span>
    </>}
  </div>;
}

export default memo(DialerBackdrop);
