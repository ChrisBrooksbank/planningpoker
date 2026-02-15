import { NextRequest, NextResponse } from "next/server";
import { sessionStorage } from "../../../server/sessionStorage";
import { nanoid } from "nanoid";

/**
 * POST /api/sessions - Create a new session
 * Body: { sessionName: string, moderatorName: string }
 * Returns: { roomId: string, sessionName: string, moderatorId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionName, moderatorName, deckType: rawDeckType } = body;

    // Validate inputs
    if (!sessionName || typeof sessionName !== "string") {
      return NextResponse.json(
        { error: "Session name is required" },
        { status: 400 }
      );
    }

    if (!moderatorName || typeof moderatorName !== "string") {
      return NextResponse.json(
        { error: "Moderator name is required" },
        { status: 400 }
      );
    }

    // Validate deck type
    const deckType = rawDeckType === "tshirt" ? "tshirt" : "fibonacci";

    // Generate unique moderator ID
    const moderatorId = nanoid();

    // Create session (this generates the room code internally)
    const sessionState = sessionStorage.createSession(
      sessionName,
      moderatorId,
      moderatorName,
      deckType
    );

    return NextResponse.json({
      roomId: sessionState.session.id,
      sessionName: sessionState.session.name,
      moderatorId,
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
