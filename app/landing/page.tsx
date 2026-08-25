import type { Metadata } from "next";
import { isClerkConfigured } from "../lib/clerk-config";
import LandingClient from "./LandingClient";

export const metadata:Metadata={
  title:"Pacifica | Producer CRM and Browser Dialer",
  description:"Organize Life, Home, and Auto leads, call through Twilio, and manage every follow-up—starting at $25 per month.",
};

export default function LandingPage(){return <LandingClient clerkEnabled={isClerkConfigured()}/>}
