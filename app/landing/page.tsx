import type { Metadata } from "next";
import LandingClient from "./LandingClient";

export const metadata:Metadata={
  title:"PacificaTools | The AI CRM and Dialer for Insurance Teams",
  description:"Organize Life, Home, and Auto leads, call through Twilio, compare quotes, and let AI surface the next best action—starting at $49 per month.",
};

export default function LandingPage(){return <LandingClient/>}
