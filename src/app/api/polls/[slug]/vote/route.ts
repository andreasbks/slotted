import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  newDeviceToken,
  readAccessToken,
  readDeviceToken,
  readHostToken,
  secureCookie,
} from "@/lib/auth-server";
import {
  getPollBySlug,
  hasValidAccessGrant,
  hashSecret,
  requireHost,
  upsertParticipantVote,
} from "@/lib/store-server";
import { getClerkIdentityHash } from "@/lib/optional-auth-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    assertSameOrigin(request);
    const { slug } = await context.params;
    const poll = await getPollBySlug(slug);
    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }
    const isHost = await requireHost(slug, await readHostToken(slug));
    if (
      poll.hasPassword &&
      !isHost &&
      !(await hasValidAccessGrant(slug, await readAccessToken(slug)))
    ) {
      return NextResponse.json({ error: "Poll access required" }, { status: 401 });
    }
    const body = await request.json();
    const existingDeviceToken = await readDeviceToken();
    const deviceToken = existingDeviceToken || newDeviceToken();
    const clerkHash = await getClerkIdentityHash();
    const updated = await upsertParticipantVote(slug, {
      deviceHash: clerkHash || hashSecret(deviceToken),
      name: body.name || "Alex",
      timezone: body.timezone || poll.timezone || "America/New_York",
      city: body.city,
      slots: body.slots || {},
    });
    if (!updated) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }
    const response = NextResponse.json({ poll: updated });
    if (!existingDeviceToken && !clerkHash) {
      response.cookies.set("__Host-slotted-device", deviceToken, {
        ...secureCookie,
        maxAge: 400 * 24 * 60 * 60,
      });
    }
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save vote" },
      { status: 400 }
    );
  }
}
