
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function setCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `bps_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
  );
}

export function clearCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "bps_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  );
}

export function getCookie(req) {
  const cookies = req.headers.cookie || "";
  const match = cookies.match(/(?:^|;\s*)bps_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function createSession(res, role, accountId) {
  const token = makeToken();

  const session = {
    token_hash: hashToken(token),
    role,
    admin_id: role === "admin" ? accountId : null,
    staff_id: role === "staff" ? accountId : null,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };

  const { error } = await db.from("bps_sessions").insert(session);

  if (error) throw error;

  setCookie(res, token);
}

export async function getUser(req) {
  const token = getCookie(req);
  if (!token) return null;

  const { data: session, error } = await db
    .from("bps_sessions")
    .select("*")
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !session) return null;

  if (session.role === "admin" && session.admin_id) {
    const { data } = await db
      .from("bps_admins")
      .select("id, name")
      .eq("id", session.admin_id)
      .maybeSingle();

    return data ? { role: "admin", id: data.id, name: data.name } : null;
  }

  if (session.role === "staff" && session.staff_id) {
    const { data } = await db
      .from("bps_staff")
      .select("id, name, position, status")
      .eq("id", session.staff_id)
      .maybeSingle();

    return data && data.status === "active"
      ? { role: "staff", id: data.id, name: data.name }
      : null;
  }

  return null;
}

export function methodNotAllowed(res, allowed = "POST") {
  res.setHeader("Allow", allowed);
  res.status(405).json({ error: "Method not allowed" });
}
