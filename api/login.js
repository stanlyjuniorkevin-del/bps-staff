
import bcrypt from "bcryptjs";
import { db, hashToken, createSession, methodNotAllowed } from "./_lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }

  try {
    const { role, name, password, licenseKey } = req.body || {};

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Enter your name." });
    }

    let account;

    if (role === "admin") {
      const adminName = process.env.ADMIN_NAME;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminName || !adminPassword) {
        return res.status(500).json({
          error: "Admin environment variables are not configured."
        });
      }

      if (name.trim() !== adminName || !password) {
        return res.status(401).json({ error: "Invalid login details." });
      }

      let { data: admin, error } = await db
        .from("bps_admins")
        .select("*")
        .eq("name", adminName)
        .maybeSingle();

      if (error) throw error;

      if (!admin) {
        const passwordHash = await bcrypt.hash(adminPassword, 12);

        const result = await db
          .from("bps_admins")
          .insert({
            name: adminName,
            password_hash: passwordHash
          })
          .select()
          .single();

        if (result.error) throw result.error;
        admin = result.data;
      }

      const valid = await bcrypt.compare(password, admin.password_hash);

      if (!valid) {
        return res.status(401).json({ error: "Invalid login details." });
      }

      account = admin;

    } else if (role === "staff") {
      if (!licenseKey || typeof licenseKey !== "string") {
        return res.status(400).json({ error: "Enter your license key." });
      }

      const { data: license, error } = await db
        .from("bps_licenses")
        .select("id, staff_id, status, key_hash")
        .eq("key_hash", hashToken(licenseKey.trim()))
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      if (!license || !license.staff_id) {
        return res.status(401).json({ error: "Invalid or inactive license." });
      }

      const { data: staff, error: staffError } = await db
        .from("bps_staff")
        .select("id, name, position, status")
        .eq("id", license.staff_id)
        .eq("status", "active")
        .maybeSingle();

      if (staffError) throw staffError;

      if (!staff || staff.name.toLowerCase() !== name.trim().toLowerCase()) {
        return res.status(401).json({ error: "Invalid login details." });
      }

      account = staff;

    } else {
      return res.status(400).json({ error: "Invalid account type." });
    }

    await createSession(
      res,
      role,
      account.id
    );

    return res.status(200).json({
      user: {
        role,
        name: account.name
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
}
