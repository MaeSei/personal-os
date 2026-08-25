import { NextResponse, type NextRequest } from "next/server";

import { applicationContainer } from "@/application/container";
import {
  GOOGLE_CALENDAR_STATE_COOKIE,
  createOAuthState,
} from "@/server/security/oauthState";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function GET(request: NextRequest): NextResponse {
  try {
    const state = createOAuthState();
    const target = applicationContainer.calendarOAuth.createAuthorizationUrl(state);
    const response = NextResponse.redirect(target);
    response.cookies.set(GOOGLE_CALENDAR_STATE_COOKIE, state, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: "/api/calendar/google/callback",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/planner?calendar=not-configured", request.nextUrl.origin),
    );
  }
}

export { GET };
