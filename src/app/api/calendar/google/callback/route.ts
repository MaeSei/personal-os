import { NextResponse, type NextRequest } from "next/server";

import { applicationContainer } from "@/application/container";
import {
  GOOGLE_CALENDAR_STATE_COOKIE,
  matchesOAuthState,
} from "@/server/security/oauthState";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function GET(request: NextRequest): Promise<NextResponse> {
  const expectedState = request.cookies.get(GOOGLE_CALENDAR_STATE_COOKIE)?.value;
  const state = request.nextUrl.searchParams.get("state");
  let outcome = "connected";
  if (!matchesOAuthState(expectedState, state)) {
    outcome = "invalid-state";
  } else if (request.nextUrl.searchParams.has("error")) {
    outcome = "denied";
  } else {
    const code = request.nextUrl.searchParams.get("code");
    try {
      if (!code) throw new Error("Missing authorization code.");
      await applicationContainer.calendarOAuth.completeAuthorization(code);
    } catch {
      outcome = "failed";
    }
  }
  const response = NextResponse.redirect(
    new URL(`/planner?calendar=${outcome}`, request.nextUrl.origin),
  );
  response.cookies.set(GOOGLE_CALENDAR_STATE_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/api/calendar/google/callback",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export { GET };
