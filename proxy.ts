import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isProtectedRoute=createRouteMatcher([
  "/dashboard(.*)",
  "/api/ai/(.*)",
  "/api/twilio/token(.*)",
]);

const clerkConfigured=Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim().startsWith("pk_") &&
  process.env.CLERK_SECRET_KEY?.trim().startsWith("sk_"),
);

const clerkHandler=clerkMiddleware(async(auth,request)=>{
  if(isProtectedRoute(request))await auth.protect();
});

function missingClerkHandler(request:NextRequest){
  if(!isProtectedRoute(request))return NextResponse.next();
  if(request.nextUrl.pathname.startsWith("/api/")){
    return NextResponse.json({error:"Secure login is not configured."},{status:503});
  }
  const loginUrl=new URL("/login",request.url);
  loginUrl.searchParams.set("error","auth_not_configured");
  return NextResponse.redirect(loginUrl);
}

export default clerkConfigured?clerkHandler:missingClerkHandler;

export const config={
  matcher:[
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
