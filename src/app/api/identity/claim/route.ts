import { NextResponse } from "next/server";
import { assertSameOrigin, readDeviceToken } from "@/lib/auth-server";
import { getClerkIdentityHash } from "@/lib/optional-auth-server";
import { claimDeviceIdentity, hashSecret } from "@/lib/store-server";

export async function POST(request: Request) {
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
  } catch {
    return NextResponse.json({ claimed: false }, { status: 400 });
  }
}
