import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getCurrentUser } from "@/lib/current-user";
import { appUrl } from "@/lib/mail";

/**
 * Begin the one-time "connect notification mailbox" flow (admin only).
 * Requests DELEGATED Mail.Send so the app can send as the connecting
 * admin — plain user consent, no tenant admin needed.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.redirect(appUrl("/"));
  }

  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "";
  const authorize = issuer.replace(/\/v2\.0\/?$/, "/oauth2/v2.0/authorize");
  const state = randomBytes(24).toString("base64url");

  const params = new URLSearchParams({
    client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "",
    response_type: "code",
    redirect_uri: appUrl("/api/mail-connect/callback"),
    response_mode: "query",
    scope: "openid email offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Calendars.ReadWrite",
    state,
    // Force the consent screen so the Mail.Send grant (and a refresh token
    // carrying it) is definitely issued.
    prompt: "consent",
  });

  const response = NextResponse.redirect(`${authorize}?${params}`);
  response.cookies.set("mail_connect_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/mail-connect",
  });
  return response;
}
