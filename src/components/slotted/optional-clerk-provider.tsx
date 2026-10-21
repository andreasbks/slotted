"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";

export function OptionalClerkProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (pubKey && pubKey.startsWith("pk_")) {
    return <ClerkProvider publishableKey={pubKey}>{children}</ClerkProvider>;
  }
  return <>{children}</>;
}
