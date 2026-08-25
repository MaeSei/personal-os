import { GoogleCalendarProvider, type CalendarSyncProvider } from "@/calendar";
import { AesGcmTokenCipher, type TokenCipher } from "@/server/security/TokenCipher";

type GoogleCalendarIntegration = {
  readonly cipher: TokenCipher | null;
  readonly provider: CalendarSyncProvider | null;
};

/** Reads optional server-only Google configuration without exposing raw values. */
function createGoogleCalendarIntegration(
  environment: NodeJS.ProcessEnv = process.env,
): GoogleCalendarIntegration {
  const clientId = environment.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = environment.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  const redirectUri = environment.GOOGLE_CALENDAR_REDIRECT_URI?.trim();
  const encryptionKey = environment.CALENDAR_TOKEN_ENCRYPTION_KEY?.trim();
  if (!clientId || !clientSecret || !redirectUri || !encryptionKey) {
    return { cipher: null, provider: null };
  }
  const parsedRedirect = new URL(redirectUri);
  if (!/^https?:$/.test(parsedRedirect.protocol)) {
    throw new Error("GOOGLE_CALENDAR_REDIRECT_URI must use HTTP or HTTPS.");
  }
  return {
    cipher: AesGcmTokenCipher.fromBase64Key(encryptionKey),
    provider: new GoogleCalendarProvider({ clientId, clientSecret, redirectUri }),
  };
}

export { createGoogleCalendarIntegration };
export type { GoogleCalendarIntegration };
