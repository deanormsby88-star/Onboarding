import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

/**
 * Outbound email via Microsoft Graph, through whichever transport is
 * configured:
 *
 *  1. App-only (preferred): GRAPH_* env vars — client-credentials app
 *     registration with APPLICATION permission Mail.Send, sending from a
 *     neutral shared mailbox. Needs tenant-admin consent.
 *  2. Delegated fallback: an admin connects their own mailbox once
 *     (Admin → Settings → Notification mailbox) and mail is sent AS that
 *     person via a stored, encrypted refresh token. Works with plain user
 *     consent — no Exchange admin or tenant-admin required.
 *
 * POPIA rule (brief §8/§10): notifications LINK to the app and never
 * contain scores or performance data — only names, weeks and actions.
 *
 * When neither transport is configured (e.g. local dev), sends are logged
 * and skipped rather than failing the caller.
 */

export const MAIL_CONNECTION_KEY = "mail_delegated_connection";

export type DelegatedConnection = {
  email: string;
  connectedByName: string;
  connectedAt: string;
  /** Encrypted refresh token (AES-GCM under AUTH_SECRET). */
  refreshTokenEnc: string;
};

export async function getDelegatedConnection(): Promise<DelegatedConnection | null> {
  const row = await db.appSetting.findUnique({ where: { key: MAIL_CONNECTION_KEY } });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as DelegatedConnection;
  } catch {
    return null;
  }
}

export async function saveDelegatedConnection(conn: {
  email: string;
  connectedByName: string;
  refreshToken: string;
}): Promise<void> {
  const value: DelegatedConnection = {
    email: conn.email,
    connectedByName: conn.connectedByName,
    connectedAt: new Date().toISOString(),
    refreshTokenEnc: encryptSecret(conn.refreshToken),
  };
  await db.appSetting.upsert({
    where: { key: MAIL_CONNECTION_KEY },
    update: { value: JSON.stringify(value) },
    create: { key: MAIL_CONNECTION_KEY, value: JSON.stringify(value) },
  });
}

export async function deleteDelegatedConnection(): Promise<void> {
  await db.appSetting.deleteMany({ where: { key: MAIL_CONNECTION_KEY } });
}

export function entraTokenEndpoint(): string {
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "";
  return issuer.replace(/\/v2\.0\/?$/, "/oauth2/v2.0/token");
}

type GraphConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  sender: string; // UPN of the mailbox to send from, e.g. performance@heya.team
};

function graphConfig(): GraphConfig | null {
  const {
    GRAPH_TENANT_ID: tenantId,
    GRAPH_CLIENT_ID: clientId,
    GRAPH_CLIENT_SECRET: clientSecret,
    GRAPH_SENDER: sender,
  } = process.env;
  if (!tenantId || !clientId || !clientSecret || !sender) return null;
  return { tenantId, clientId, clientSecret, sender };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function graphToken(cfg: GraphConfig): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const res = await fetch(
    `https://login.microsoftonline.com/${cfg.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: "client_credentials",
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Graph token request failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export type Mail = { to: string; subject: string; bodyText: string };

function mailPayload(mail: Mail, saveToSentItems: boolean) {
  return JSON.stringify({
    message: {
      subject: mail.subject,
      body: { contentType: "Text", content: mail.bodyText },
      toRecipients: [{ emailAddress: { address: mail.to } }],
    },
    saveToSentItems,
  });
}

/** Delegated transport: refresh the stored token, send as the connected user. */
async function sendDelegated(conn: DelegatedConnection, mail: Mail): Promise<void> {
  const res = await fetch(entraTokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "",
      client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: decryptSecret(conn.refreshTokenEnc),
      scope: "openid offline_access https://graph.microsoft.com/Mail.Send",
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Mailbox connection for ${conn.email} could not be refreshed (${res.status}). ` +
        "Reconnect it under Admin → Settings → Notification mailbox."
    );
  }
  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
  };
  if (tokens.refresh_token) {
    // Refresh tokens rotate; persist the newest one.
    await saveDelegatedConnection({
      email: conn.email,
      connectedByName: conn.connectedByName,
      refreshToken: tokens.refresh_token,
    });
  }
  const send = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
    },
    body: mailPayload(mail, true),
  });
  if (!send.ok) {
    throw new Error(`Graph sendMail (delegated) failed: ${send.status} ${await send.text()}`);
  }
}

export async function sendMail(mail: Mail): Promise<"sent" | "skipped"> {
  const cfg = graphConfig();
  if (cfg) {
    const token = await graphToken(cfg);
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.sender)}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: mailPayload(mail, false),
      }
    );
    if (!res.ok) {
      throw new Error(`Graph sendMail failed: ${res.status} ${await res.text()}`);
    }
    return "sent";
  }

  const delegated = await getDelegatedConnection();
  if (delegated) {
    await sendDelegated(delegated, mail);
    return "sent";
  }

  console.log(`[mail skipped — no transport configured] to=${mail.to} subject="${mail.subject}"`);
  return "skipped";
}

export function appUrl(path = "/"): string {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
