import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const configured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_") &&
    process.env.CLERK_SECRET_KEY?.startsWith("sk_")
);

const optionalClerkMiddleware = configured
  ? clerkMiddleware()
  : () => NextResponse.next();

export default optionalClerkMiddleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
