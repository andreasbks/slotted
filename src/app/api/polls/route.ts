import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  hostCookieName,
  newDeviceToken,
  readDeviceToken,
  secureCookie,
} from "@/lib/auth-server";
import {
  createNewPoll,
  hashSecret,
  listPollsForViewer,
} from "@/lib/store-server";
import { getClerkIdentityHash } from "@/lib/optional-auth-server";

export async function GET() {
  const deviceToken = await readDeviceToken();
  const identityHash = await getClerkIdentityHash();
  const polls = await listPollsForViewer(
    identityHash || (deviceToken ? hashSecret(deviceToken) : undefined)
  );
  return NextResponse.json({ polls });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    if (body.passwordProtected && !String(body.accessPassword || "").trim()) {
      return NextResponse.json(
        { error: "Enter a password or choose Anyone with the link." },
        { status: 400 }
      );
    }
    const existingDeviceToken = await readDeviceToken();
    const deviceToken = existingDeviceToken || newDeviceToken();
    const clerkHash = await getClerkIdentityHash();
    const identityHash = clerkHash || hashSecret(deviceToken);
    const { poll, hostToken } = await createNewPoll({
      title: body.title || "Untitled Poll",
      description: body.description || "",
      location: body.location || "",
      pollMode: body.pollMode === "full_days" ? "full_days" : "dates_and_hours",
      scheduleType:
        body.scheduleType === "days_of_week"
          ? "days_of_week"
          : "specific_dates",
      recurrenceRule: body.recurrenceRule || null,
      hostName: body.hostName || "Alex",
      deviceHash: identityHash,
      timezone: body.timezone || "America/New_York",
      candidateDates: Array.isArray(body.candidateDates)
        ? body.candidateDates
        : ["2026-10-27", "2026-10-28", "2026-10-29"],
      dayStartHour: Number(body.dayStartHour ?? 9),
      dayEndHour: Number(body.dayEndHour ?? 17),
      slotMinutes: Number(body.slotMinutes ?? 30),
      durationMinutes: Number(body.durationMinutes ?? 30),
      accessPassword: body.accessPassword || null,
      visibilityMode: body.visibilityMode || "public",
      allowIfNeeded: body.allowIfNeeded !== false,
      deadlineAt: body.deadlineAt || null,
    });

    const response = NextResponse.json({ poll }, { status: 201 });
    if (!existingDeviceToken && !clerkHash) {
      response.cookies.set(
        "__Host-slotted-device",
        deviceToken,
        secureCookie
      );
    }
    response.cookies.set(hostCookieName(poll.slug), hostToken, {
      ...secureCookie,
      maxAge: 400 * 24 * 60 * 60,
    });
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create poll" },
      { status: 400 }
    );
  }
}
