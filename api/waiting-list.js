export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({
      ok: false,
      message: "Method not allowed"
    });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return response.status(500).json({
        ok: false,
        message: "Server configuration error."
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

    const insertResponse = await fetch(
      `${supabaseUrl}/rest/v1/oromma_germany_waiting_list`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          phone: phone || null,
          instagram_id: instagramId || null,
          source: "qr_event",
          event_name: "OROMMA Experience Germany 2026",
          status: "new",
          user_agent: request.headers["user-agent"] || null
        })
      }
    );

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();

      console.error("Supabase insert error:", errorText);

      return response.status(500).json({
        ok: false,
        message: "Something went wrong. Please try again."
      });
    }

    return response.status(200).json({
      ok: true 
    });
  } catch (error) {
    console.error("Waiting list API error:", error);

    return response.status(500).json({
      ok: false,
      message: "Connection error. Please try again."
    });
  }
}
