import { NextResponse } from "next/server";
import { assertSameOrigin, readDeviceToken } from "@/lib/auth-server";
import { getClerkIdentityHash } from "@/lib/optional-auth-server";
import { claimDeviceIdentity, hashSecret } from "@/lib/store-server";
import { blockedBySetup, respondToFailure } from "@/lib/request-failure";

export async function POST(request: Request) {
  const blocked = blockedBySetup("guest");
  if (blocked) return blocked;
  try {
    assertSameOrigin(request);
    const accountHash = await getClerkIdentityHash();
    if (!accountHash) {
      return NextResponse.json({ claimed: false }, { status: 401 });
    }
    const deviceToken = await readDeviceToken();
    if (deviceToken) {
      await claimDeviceIdentity(hashSecret(deviceToken), accountHash);
    }
    return NextResponse.json({ claimed: true });
  } catch (error) {
    const failure = respondToFailure(error, "Couldn’t save this device. Try again.", "guest");
    if (failure.status === 503) return failure;
    return NextResponse.json({ claimed: false }, { status: 400 });
  }
}
