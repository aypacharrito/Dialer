"use client";

import {memo, useState} from "react";

type Props = {appearance?: "light" | "dark"; lightUrl?: string; darkUrl?: string; motion?: boolean};

function DialerBackdrop({appearance = "dark", lightUrl = "", darkUrl = ""}: Props) {
  const custom = appearance === "dark" ? darkUrl : lightUrl;
  const [failed, setFailed] = useState("");
  const showCustom = Boolean(custom && failed !== custom);
  return <div className={`dialer-cosmos dialer-scene-${appearance}${showCustom ? " is-custom" : ""}`} aria-hidden="true">
    {showCustom ? <img key={custom} src={custom} referrerPolicy="no-referrer" onError={() => setFailed(custom)} alt="" decoding="async" draggable={false}/>
      : appearance === "dark" ? <img className="dialer-stars dialer-stars-4k" src="/images/pacifica-night-v54.webp" width="3840" height="2160" alt="" decoding="async" fetchPriority="low" draggable={false}/>
      : null}
  </div>;
}

export default memo(DialerBackdrop);
