import { NextResponse } from "next/server";
import { deletePollBySlug, getPollBySlug } from "@/lib/store-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const poll = await getPollBySlug(slug);
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }
  return NextResponse.json({ poll });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const ok = await deletePollBySlug(slug);
  return NextResponse.json({ deleted: ok });
}
