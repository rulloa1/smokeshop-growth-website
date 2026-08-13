function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function formField(formData, field, fallback, maxLength) {
  const value = formData.get(field)

  if (typeof value !== 'string') return fallback

  const normalized = value.trim().slice(0, maxLength)
  return normalized || fallback
}

export async function onRequestPost({ request, env }) {
  const telegramBotToken = env.TELEGRAM_BOT_TOKEN
  const telegramChatId = env.TELEGRAM_CHAT_ID

  if (!telegramBotToken || !telegramChatId) {
    return jsonResponse({ error: 'Contact delivery is not configured.' }, 503)
  }

  try {
    const formData = await request.formData()
    const name = formField(formData, 'name', 'Not provided', 120)
    const shop = formField(formData, 'shop', 'Not provided', 160)
    const city = formField(formData, 'city', 'Not provided', 120)
    const phone = formField(formData, 'phone', 'Not provided', 80)
    const website = formField(formData, 'website', 'Not provided', 500)
    const message = formField(formData, 'message', 'No additional details.', 2000)
    const submission = { name, shop, city, phone, website, message }

    const n8nWebhookUrl = env.N8N_WEBHOOK_URL
    if (n8nWebhookUrl) {
      try {
        await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission),
        })
      } catch {
        // Telegram remains the primary delivery path when an optional workflow is unavailable.
      }
    }

    const text = [
      'New Demo Request (Smokeshop Growth)',
      '',
      `Name: ${name}`,
      `Shop: ${shop}`,
      `City: ${city}`,
      `Phone: ${phone}`,
      `Website: ${website}`,
      '',
      `Message: ${message}`,
    ].join('\n')

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChatId, text }),
      }
    )

    if (!telegramResponse.ok) {
      throw new Error('Telegram delivery failed.')
    }

    return jsonResponse({ ok: true }, 200)
  } catch {
    return jsonResponse({ error: 'Unable to send your request. Please try again later.' }, 500)
  }
}
