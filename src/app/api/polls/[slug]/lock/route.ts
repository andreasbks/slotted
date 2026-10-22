import { NextResponse } from "next/server";
import { assertSameOrigin, readHostToken } from "@/lib/auth-server";
import { requireHost, updatePollLockState } from "@/lib/store-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    assertSameOrigin(request);
    const { slug } = await context.params;
    if (!(await requireHost(slug, await readHostToken(slug)))) {
      return NextResponse.json(
        { error: "Host access required" },
        { status: 403 }
      );
    }
    const body = await request.json();
    const updated = await updatePollLockState(slug, {
      status: body.status === "OPEN" ? "OPEN" : "LOCKED",
      lockedSlotStart: body.lockedSlotStart,
      lockedSlotEnd: body.lockedSlotEnd,
      lockedLocation: body.lockedLocation,
      durationMinutes: body.durationMinutes,
    });
    if (!updated) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }
    return NextResponse.json({ poll: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update lock" },
      { status: 400 }
    );
  }
}
