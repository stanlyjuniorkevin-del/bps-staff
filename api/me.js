
import { getUser, methodNotAllowed } from "./_lib/server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, "GET");
  }

  try {
    const user = await getUser(req);

    if (!user) {
      return res.status(401).json({ error: "Not logged in." });
    }

    return res.status(200).json({
      user: {
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    console.error("Session check error:", error);
    return res.status(500).json({ error: "Could not check login." });
  }
}
