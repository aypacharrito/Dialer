"use client";

type Props = {
  name: string;
  number: string;
  connected: boolean;
  held: boolean;
  muted: boolean;
  elapsed: string;
  queueRunning: boolean;
  onOpen: () => void;
  onKeypad: () => void;
  onMute: () => void;
  onHold: () => void;
  onEnd: () => void;
  onPause: () => void;
};

/** The same active call stays reachable while working in another CRM view. */
export default function ActiveCallBar(props: Props) {
  const status = props.held ? "On hold" : props.connected ? "Live call" : "Connecting";
  return <section className="active-call-bar" aria-label="Current call">
    <div className="active-call-person">
      <span className="active-call-state" role="status"><i aria-hidden="true"/>{status}</span>
      <b>{props.name || props.number}</b>
      {props.name && <span className="active-call-number">{props.number}</span>}
      {props.connected && <time aria-label="Call duration">{props.elapsed}</time>}
    </div>
    <div className="active-call-actions">
      <button type="button" onClick={props.onOpen}>Open dialer</button>
      {props.connected && <>
        <button type="button" onClick={props.onKeypad}>Keypad</button>
        <button type="button" aria-pressed={props.muted} disabled={props.held} onClick={props.onMute}>{props.muted ? "Unmute" : "Mute"}</button>
        <button type="button" aria-pressed={props.held} onClick={props.onHold}>{props.held ? "Resume" : "Hold"}</button>
      </>}
      {props.queueRunning && <button type="button" onClick={props.onPause}>Pause dialing</button>}
      <button type="button" className="active-call-end" onClick={props.onEnd}>{props.connected ? "End call" : "Cancel call"}</button>
    </div>
  </section>;
}
