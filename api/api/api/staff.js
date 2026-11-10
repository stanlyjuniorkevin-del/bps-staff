
import { db, getUser, methodNotAllowed } from "./_lib/server.js";

export default async function handler(req, res) {
  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(401).json({ error: "Please log in." });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }

    if (req.method === "GET") {
      const { data, error } = await db
        .from("bps_staff")
        .select("id, name, position, status, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({ staff: data || [] });
    }

    if (req.method === "POST") {
      const { name, position } = req.body || {};

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Enter a staff name." });
      }

      const { data, error } = await db
        .from("bps_staff")
        .insert({
          name: name.trim(),
          position: typeof position === "string" ? position.trim() : "",
          status: "active"
        })
        .select("id, name, position, status")
        .single();

      if (error) throw error;

      return res.status(201).json({ staff: data });
    }

    return methodNotAllowed(res, "GET, POST");

  } catch (error) {
    console.error("Staff error:", error);
    return res.status(500).json({ error: "Staff operation failed." });
  }
}
