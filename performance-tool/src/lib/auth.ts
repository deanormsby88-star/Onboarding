import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { db } from "@/lib/db";

/**
 * Entra ID SSO only. No password table, no auto-provisioning.
 *
 * Sign-in flow:
 *  1. A user record must already exist (created by an admin).
 *  2. First sign-in matches the Entra object ID (`oid`) if stored, otherwise
 *     the verified email from the tenant, and binds the object ID to the
 *     record. Unmatched sign-ins are rejected and land on /no-access.
 *  3. Deactivation in Entra locks the user out: sessions carry an Entra
 *     refresh token, and once the short-lived access token expires the
 *     refresh is re-attempted against Entra. A disabled Entra account fails
 *     that refresh and the session is invalidated. The local is_active flag
 *     is additionally checked on every request in requireUser().
 */

declare module "next-auth" {
  interface Session {
    userId?: string;
    tokenError?: "RefreshFailed";
  }
}

type EntraToken = {
  userId?: string;
  accessTokenExpiresAt?: number; // epoch ms
  refreshToken?: string;
  error?: "RefreshFailed";
};

function issuerTokenEndpoint(): string {
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "";
  // https://login.microsoftonline.com/<tenant>/v2.0 -> .../oauth2/v2.0/token
  return issuer.replace(/\/v2\.0\/?$/, "/oauth2/v2.0/token");
}

async function refreshEntraToken(token: EntraToken): Promise<EntraToken> {
  if (!token.refreshToken) return { ...token, error: "RefreshFailed" };
  try {
    const response = await fetch(issuerTokenEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "",
        client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
        scope: "openid profile email offline_access",
      }),
    });
    if (!response.ok) return { ...token, error: "RefreshFailed" };
    const refreshed = (await response.json()) as {
      expires_in: number;
      refresh_token?: string;
    };
    return {
      ...token,
      accessTokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    // Network failure, not a revocation: keep the session but retry on the
    // next request rather than locking everyone out on a blip.
    return token;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      authorization: {
        params: { scope: "openid profile email offline_access" },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    async signIn({ profile }) {
      const oid = typeof profile?.oid === "string" ? profile.oid : undefined;
      const email =
        typeof profile?.email === "string"
          ? profile.email
          : typeof profile?.preferred_username === "string"
            ? profile.preferred_username
            : undefined;
      if (!oid) return "/no-access";

      const byOid = await db.user.findUnique({ where: { entraObjectId: oid } });
      if (byOid) return byOid.isActive ? true : "/no-access";

      // First sign-in: bind the Entra object ID to a pre-provisioned record.
      if (!email) return "/no-access";
      const byEmail = await db.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (!byEmail || !byEmail.isActive || byEmail.entraObjectId) {
        return "/no-access";
      }
      await db.user.update({
        where: { id: byEmail.id },
        data: { entraObjectId: oid },
      });
      return true;
    },

    async jwt({ token, account, profile }) {
      const t = token as typeof token & EntraToken;

      if (account && profile) {
        // Fresh sign-in. signIn() has already verified/bound the record.
        const oid = typeof profile.oid === "string" ? profile.oid : "";
        const user = await db.user.findUnique({
          where: { entraObjectId: oid },
          select: { id: true },
        });
        t.userId = user?.id;
        t.refreshToken = account.refresh_token;
        t.accessTokenExpiresAt = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 55 * 60 * 1000;
        t.error = undefined;
        return t;
      }

      if (t.accessTokenExpiresAt && Date.now() < t.accessTokenExpiresAt) {
        return t;
      }
      // Access token expired: re-validate against Entra. A user disabled in
      // Entra fails here and loses the session.
      return { ...t, ...(await refreshEntraToken(t)) };
    },

    async session({ session, token }) {
      const t = token as EntraToken;
      if (t.userId) session.userId = t.userId;
      session.tokenError = t.error;
      return session;
    },
  },
});
