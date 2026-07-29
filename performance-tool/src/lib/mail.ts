/**
 * Outbound email via Microsoft Graph (client-credentials app registration
 * with application permission Mail.Send, sent from a Heya mailbox).
 *
 * POPIA rule (brief §8/§10): notifications LINK to the app and never
 * contain scores or performance data — only names, weeks and actions.
 *
 * When Graph is not configured (e.g. local dev), sends are logged and
 * skipped rather than failing the caller.
 */

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

export async function sendMail(mail: Mail): Promise<"sent" | "skipped"> {
  const cfg = graphConfig();
  if (!cfg) {
    console.log(`[mail skipped — Graph not configured] to=${mail.to} subject="${mail.subject}"`);
    return "skipped";
  }
  const token = await graphToken(cfg);
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(cfg.sender)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: mail.subject,
          body: { contentType: "Text", content: mail.bodyText },
          toRecipients: [{ emailAddress: { address: mail.to } }],
        },
        saveToSentItems: false,
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Graph sendMail failed: ${res.status} ${await res.text()}`);
  }
  return "sent";
}

export function appUrl(path = "/"): string {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}
