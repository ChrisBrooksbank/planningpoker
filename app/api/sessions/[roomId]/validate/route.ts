// NOTE: In production, this route is intercepted by the custom server (server/index.ts).
// This handler only runs during local development via `next dev`.
import { NextRequest, NextResponse } from "next/server";
import { sessionStorage } from "../../../../../server/sessionStorage";

/**
 * GET /api/sessions/[roomId]/validate - Validate that a room exists
 * Returns 200 if room exists, 404 if not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  if (!roomId || typeof roomId !== "string") {
    return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
  }

  const exists = sessionStorage.sessionExists(roomId);

  if (!exists) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ exists: true });
}
