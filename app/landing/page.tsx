import type { Metadata } from "next";
import { isClerkConfigured } from "../lib/clerk-config";
import LandingClient from "./LandingClient";

export const metadata:Metadata={
  title:"Pacifica CRM | Every Lead Worked",
  description:"Call, text, organize, and follow up with every business lead from one simple workspace—starting at $25 per month.",
};

export default function LandingPage(){return <LandingClient clerkEnabled={isClerkConfigured()}/>}
