import LandingClient from "./landing/LandingClient";
import { isClerkConfigured } from "./lib/clerk-config";

export default function HomePage(){
  return <LandingClient clerkEnabled={isClerkConfigured()}/>;
}
