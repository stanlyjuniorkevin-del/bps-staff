
import { db, getUser, methodNotAllowed } from "./_lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, "GET");
  }

  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(401).json({ error: "Please log in." });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }

    const [staff, licenses, active] = await Promise.all([
      db.from("bps_staff").select("id", { count: "exact", head: true }),
      db.from("bps_licenses").select("id", { count: "exact", head: true }),
      db.from("bps_licenses").select("id", { count: "exact", head: true }).eq("status", "active")
    ]);

    if (staff.error || licenses.error || active.error) {
      throw staff.error || licenses.error || active.error;
    }

    return res.status(200).json({
      staffCount: staff.count || 0,
      keyCount: licenses.count || 0,
      activeCount: active.count || 0
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ error: "Could not load dashboard." });
  }
}
