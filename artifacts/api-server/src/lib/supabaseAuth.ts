import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getSupabaseUrl(): string {
  const url = process.env["SUPABASE_URL"];
  if (!url) throw new Error("SUPABASE_URL is not configured");
  return url.replace(/\/+$/, "");
}

function getJwks() {
  if (!jwks) {
    const base = getSupabaseUrl();
    jwks = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

/** Returns Supabase Auth user id (JWT `sub`). */
export async function verifySupabaseAccessToken(token: string): Promise<string> {
  const base = getSupabaseUrl();
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: `${base}/auth/v1`,
    audience: "authenticated",
  });
  const sub = payload.sub;
  if (!sub || typeof sub !== "string") throw new Error("Invalid token subject");
  return sub;
}
