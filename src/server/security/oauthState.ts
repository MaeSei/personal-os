import { randomBytes, timingSafeEqual } from "node:crypto";

const GOOGLE_CALENDAR_STATE_COOKIE = "atlas_google_calendar_oauth_state";

function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

function matchesOAuthState(expected: string | undefined, received: string | null): boolean {
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.byteLength === receivedBytes.byteLength &&
    timingSafeEqual(expectedBytes, receivedBytes);
}

export {
  GOOGLE_CALENDAR_STATE_COOKIE,
  createOAuthState,
  matchesOAuthState,
};
