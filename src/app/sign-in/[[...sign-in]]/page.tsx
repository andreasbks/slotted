import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_") &&
      process.env.CLERK_SECRET_KEY?.startsWith("sk_")
  );
  if (!configured) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#F6F5F2] px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Guest access is ready</h1>
          <p className="mt-2 text-sm text-[#56534D]">
            Account sign-in isn’t configured. Use a recovery key to move access
            between devices.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm underline">
            Go home
          </Link>
        </div>
      </main>
    );
  }
  return (
    <main className="grid min-h-dvh place-items-center bg-[#F6F5F2] px-4">
      <SignIn forceRedirectUrl="/" />
    </main>
  );
}
