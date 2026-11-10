
import { db, getUser, methodNotAllowed } from "../../_lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }

  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(401).json({ error: "Please log in." });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }

    const { id } = req.query;

    const { data, error } = await db
      .from("bps_licenses")
      .update({ status: "inactive" })
      .eq("id", id)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        error: "Active license not found."
      });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Deactivation error:", error);
    return res.status(500).json({ error: "Could not deactivate license." });
  }
}
