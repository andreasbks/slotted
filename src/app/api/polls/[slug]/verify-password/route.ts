import { NextResponse } from "next/server";
import { verifyPollPassword } from "@/lib/store-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await request.json();
    const valid = await verifyPollPassword(slug, String(body.password || ""));
    if (!valid) {
      return NextResponse.json(
        { valid: false, error: "Incorrect password" },
        { status: 401 }
      );
    }
    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json(
      { valid: false, error: "Verification failed" },
      { status: 400 }
    );
  }
}
