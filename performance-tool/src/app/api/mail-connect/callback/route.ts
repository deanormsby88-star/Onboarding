import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { appUrl, entraTokenEndpoint, saveDelegatedConnection } from "@/lib/mail";

/** Completes the mailbox connection: code -> tokens -> encrypted storage. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.redirect(appUrl("/"));
  }

  const url = new URL(request.url);
  const fail = (reason: string) =>
    NextResponse.redirect(appUrl(`/admin/settings?mail_error=${encodeURIComponent(reason)}`));

  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    return fail(url.searchParams.get("error_description")?.slice(0, 200) ?? errorParam);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)mail_connect_state=([^;]+)/)?.[1];
  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("The connection attempt expired or did not match. Try again.");
  }

  const res = await fetch(entraTokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "",
      client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "",
      grant_type: "authorization_code",
      code,
      redirect_uri: appUrl("/api/mail-connect/callback"),
      scope: "openid email offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Calendars.ReadWrite",
    }),
  });
  if (!res.ok) {
    return fail(`Token exchange failed (${res.status}).`);
  }
  const tokens = (await res.json()) as {
    refresh_token?: string;
    id_token?: string;
  };
  if (!tokens.refresh_token) {
    return fail("Microsoft did not issue a refresh token. Try again.");
  }

  // Display email from the id_token payload (no signature check needed —
  // it arrived over TLS directly from the token endpoint).
  let email = user.email;
  try {
    const payload = JSON.parse(
      Buffer.from(tokens.id_token!.split(".")[1]!, "base64url").toString("utf8")
    ) as { email?: string; preferred_username?: string };
    email = payload.email ?? payload.preferred_username ?? user.email;
  } catch {
    // fall back to the signed-in admin's email
  }

  await saveDelegatedConnection({
    email,
    connectedByName: user.name,
    refreshToken: tokens.refresh_token,
  });

  const response = NextResponse.redirect(appUrl("/admin/settings?mail=connected"));
  response.cookies.delete("mail_connect_state");
  return response;
}
