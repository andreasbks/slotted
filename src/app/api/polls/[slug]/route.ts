import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  readAccessToken,
  readDeviceToken,
  readHostToken,
} from "@/lib/auth-server";
import {
  deletePollBySlug,
  getPollBySlug,
  getPollForViewer,
  hasValidAccessGrant,
  hashSecret,
  requireHost,
} from "@/lib/store-server";
import { getClerkIdentityHash } from "@/lib/optional-auth-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const basePoll = await getPollBySlug(slug);
  if (!basePoll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }
  const hostToken = await readHostToken(slug);
  const isHost = await requireHost(slug, hostToken);
  if (
    basePoll.hasPassword &&
    !isHost &&
    !(await hasValidAccessGrant(slug, await readAccessToken(slug)))
  ) {
    return NextResponse.json(
      {
        poll: {
          slug: basePoll.slug,
          title: basePoll.title,
          hasPassword: true,
          requiresPassword: true,
        },
      },
      {
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
  const deviceToken = await readDeviceToken();
  const identityHash = await getClerkIdentityHash();
  const poll = await getPollForViewer(
    slug,
    identityHash || (deviceToken ? hashSecret(deviceToken) : undefined),
    hostToken
  );
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }
  return NextResponse.json(
    { poll },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  }
  const token = await readHostToken(slug);
  if (!(await requireHost(slug, token))) {
    return NextResponse.json({ error: "Host access required" }, { status: 403 });
  }
  const ok = await deletePollBySlug(slug, token || "");
  return NextResponse.json({ deleted: ok }, { status: ok ? 200 : 404 });
}
