"use client";

import { isCallDigit } from "../lib/call-digits";

type Props = {
  connected: boolean;
  dialing: boolean;
  phoneReady: boolean;
  number: string;
  sentDigits: string;
  feedback: { message: string; error: boolean };
  onNumberChange: (number: string) => void;
  onDigits: (digits: string) => void;
  onCall: () => void;
};
const keys = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]];

export default function DialerKeypad(props: Props) {
  return <aside id="dialer-keypad" className={`phone-pad side-pad ${props.dialing ? "phone-active" : ""}`} aria-label="Phone keypad"
    onKeyDown={event => {
      if (!props.dialing || event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing || !isCallDigit(event.key)) return;
      event.preventDefault();
      if (!event.repeat) props.onDigits(event.key);
    }}>
    <header><span><i/> {props.connected ? "CALL KEYPAD" : "KEYPAD"}</span><span className="pad-tools"><small>{props.connected ? "LIVE" : props.dialing ? "CONNECTING" : props.phoneReady ? "READY" : "SETUP"}</small></span></header>
    <div className="number-display">
      <label htmlFor="manual-dial-number">{props.dialing ? "TOUCH TONES" : "NUMBER TO CALL"}</label>
      <div className="number-input-shell"><input id="manual-dial-number" type="tel" inputMode="tel" autoComplete="off"
        aria-label={props.dialing ? "Touch tones: type numbers, star or pound" : "Phone number to call"}
        aria-describedby="keypad-feedback" value={props.dialing ? props.sentDigits : props.number} readOnly={props.dialing}
        onKeyDown={event => { if (event.key === "Enter" && !props.dialing) props.onCall(); }}
        onPaste={event => {
          if (!props.dialing) return;
          event.preventDefault();
          const digits = event.clipboardData.getData("text").replace(/\s/g, "");
          props.onDigits(digits);
        }}
        onChange={event => props.onNumberChange(event.target.value.replace(/[^0-9+*#() -]/g, ""))}
        placeholder={props.dialing ? "Type or press keys" : "Enter a number"}/></div>
    </div>
    <div className="key-grid">{keys.map(([digit, letters]) => <button key={digit} type="button" aria-label={props.dialing ? `Send ${digit}` : `Key ${digit}`} onClick={() => props.onDigits(digit)}><b>{digit}</b><small>{letters}</small></button>)}</div>
    <p id="keypad-feedback" className={`keypad-feedback ${props.feedback.error ? "error" : ""}`} role="status" aria-live="polite">
      {props.feedback.message || (props.connected ? "Type here or press a key to respond to the call." : props.dialing ? "Waiting for the call to connect…" : "Enter a number or use the keypad.")}
    </p>
    {!props.dialing && <div className="phone-actions"><button className="erase" type="button" aria-label="Delete last digit" onClick={() => props.onNumberChange(props.number.slice(0, -1))} disabled={!props.number}>⌫</button><button className="phone-call" type="button" aria-label="Call entered number" title={props.phoneReady ? "Call now" : "Phone setup is required"} onClick={props.onCall} disabled={!props.phoneReady || props.number.replace(/\D/g, "").length < 7}>Call now</button></div>}
  </aside>;
}
