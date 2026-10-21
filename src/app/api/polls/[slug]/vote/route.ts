import { NextResponse } from "next/server";
import { upsertParticipantVote } from "@/lib/store-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await request.json();
    const updated = await upsertParticipantVote(slug, {
      guestSessionId: body.guestSessionId || "slt_guest_local",
      name: body.name || "Alex",
      timezone: body.timezone || "America/New_York",
      city: body.city || "NYC",
      slots: body.slots || {},
    });
    if (!updated) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }
    return NextResponse.json({ poll: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save vote" },
      { status: 400 }
    );
  }
}
