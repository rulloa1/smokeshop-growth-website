export async function onRequestPost({ request, env }) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
  };

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return new Response(JSON.stringify({ error: "Telegram not configured in Cloudflare environment variables." }), { 
        status: 500,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json",
        }
    });
  }

  try {
    const data = await request.formData();
    const name = data.get("name") || "Unknown";
    const shop = data.get("shop") || "Unknown";
    const phone = data.get("phone") || "Unknown";
    const website = data.get("website") || "None";

    // Send to n8n
    const n8nWebhookUrl = env.N8N_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, shop, phone, website }),
      });
    }


    const text = `🚨 *New Demo Request (Smokeshop Growth)*\n\n*Name:* ${name}\n*Shop:* ${shop}\n*Phone:* ${phone}\n*Website:*\n${website}`;

    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "Markdown"
      })
    });

    if (!tgRes.ok) {
      throw new Error((await tgRes.text()) || "Failed to send to Telegram.");
    }

    return new Response(JSON.stringify({ ok: true }), { 
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        }
    });
  }
}
