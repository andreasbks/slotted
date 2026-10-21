import { NextResponse } from "next/server";
import { createNewPoll, listAllPolls } from "@/lib/store-server";

export async function GET() {
  const polls = await listAllPolls();
  return NextResponse.json({ polls });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { poll, hostToken } = await createNewPoll({
      title: body.title || "Untitled Poll",
      description: body.description || "",
      location: body.location || "",
      pollMode: body.pollMode === "full_days" ? "full_days" : "dates_and_hours",
      hostName: body.hostName || "Alex",
      guestSessionId: body.guestSessionId || "slt_guest_local",
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

    return NextResponse.json({ poll, hostToken }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create poll" },
      { status: 400 }
    );
  }
}
