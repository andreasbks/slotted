import { NextResponse } from "next/server";
import { getPollBySlug } from "@/lib/store-server";
import { computeRankedWindows, generateIcsContent } from "@/lib/slotted-data";
import { blockedBySetup, respondToFailure } from "@/lib/request-failure";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const blocked = blockedBySetup("guest");
  if (blocked) return blocked;
  try {
    const { slug } = await context.params;
    const poll = await getPollBySlug(slug);
    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const ranked = computeRankedWindows(poll);
    const targetWindow =
      ranked.find((w) => w.startSlotKey === poll.lockedSlotStart) || ranked[0];

    if (!targetWindow) {
      return NextResponse.json(
        { error: "No candidate window available" },
        { status: 400 }
      );
    }

    const ics = generateIcsContent(poll, targetWindow);
    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${poll.slug}.ics"`,
      },
    });
  } catch (error) {
    return respondToFailure(error, "Couldn’t build the calendar file. Try again.", "guest");
  }
}
