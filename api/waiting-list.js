export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({
      ok: false,
      message: "Method not allowed"
    });
  }

  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || "";
  const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const activeKey = (supabaseSecretKey || supabasePublicKey).trim();

  function cleanValue(value) {
    return String(value || "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\/+$/g, "");
  }

  function buildEndpoints(rawUrl) {
    const raw = cleanValue(rawUrl);
    const endpoints = [];

    if (!raw) return endpoints;

    try {
      const parsed = new URL(raw);
      const origin = parsed.origin;

      endpoints.push(`${origin}/rest/v1/oromma_germany_waiting_list`);

      if (raw.endsWith("/rest/v1")) {
        endpoints.push(`${raw}/oromma_germany_waiting_list`);
      }

      if (!raw.includes("/rest/v1")) {
        endpoints.push(`${raw}/rest/v1/oromma_germany_waiting_list`);
      }
    } catch (error) {
      return endpoints;
    }

    return [...new Set(endpoints)];
  }

  try {
    if (!rawSupabaseUrl || !activeKey) {
      return response.status(500).json({
        ok: false,
        message: "Server configuration error. Missing Supabase URL or key."
      });
    }

    const body = request.body || {};

    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const instagramId = String(body.instagram_id || "").trim();
    const honeypot = String(body.website || "").trim();

    if (honeypot) {
      return response.status(200).json({
        ok: true
      });
    }

    if (!fullName || !email) {
      return response.status(400).json({
        ok: false,
        message: "Please complete your full name and email."
      });
    }

    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailLooksValid) {
      return response.status(400).json({
        ok: false,
        message: "Please enter a valid email address."
      });
    }

    const payload = {
      full_name: fullName,
      email: email,
      phone: phone || null,
      instagram_id: instagramId || null,
      source: "qr_event",
      event_name: "OROMMA Experience Germany 2026",
      status: "new",
      user_agent: request.headers["user-agent"] || null
    };

    const endpoints = buildEndpoints(rawSupabaseUrl);

    if (!endpoints.length) {
      return response.status(500).json({
        ok: false,
        message: "Server configuration error. Invalid Supabase URL."
      });
    }

    const errors = [];

    for (const endpoint of endpoints) {
      try {
        const insertResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": activeKey,
            "Authorization": `Bearer ${activeKey}`,
            "Prefer": "return=minimal"
          },
          body: JSON.stringify(payload)
        });

        if (insertResponse.ok) {
          return response.status(200).json({
            ok: true,
            message: "Saved correctly."
          });
        }

        const errorText = await insertResponse.text();

        errors.push({
          endpoint: endpoint.replace(/https:\/\/([^./]+)\./, "https://***."),
          status: insertResponse.status,
          error: errorText
        });
      } catch (fetchError) {
        errors.push({
          endpoint: endpoint.replace(/https:\/\/([^./]+)\./, "https://***."),
          status: "fetch_failed",
          error: fetchError.message || "fetch failed"
        });
      }
    }

    console.error("All Supabase insert attempts failed:", errors);

    return response.status(500).json({
      ok: false,
      message: `Connection error. Supabase attempts failed: ${JSON.stringify(errors)}`
    });
  } catch (error) {
    console.error("Waiting list API error:", error);

    return response.status(500).json({
      ok: false,
      message: `Connection error: ${error.message || "Unknown error"}`
    });
  }
}
