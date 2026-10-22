import { auth } from "@clerk/nextjs/server";
import { hashSecret } from "@/lib/store-server";

export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_") &&
      process.env.CLERK_SECRET_KEY?.startsWith("sk_")
  );
}

export async function getClerkIdentityHash(): Promise<string | undefined> {
  if (!isClerkConfigured()) return undefined;
  const session = await auth();
  return session.userId
    ? hashSecret(`clerk:${session.userId}`)
    : undefined;
}
