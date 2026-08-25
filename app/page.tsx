import LandingClient from "./landing/LandingClient";

export default function HomePage(){
  return <LandingClient clerkEnabled={Boolean(process.env.VERCEL)}/>;
}
