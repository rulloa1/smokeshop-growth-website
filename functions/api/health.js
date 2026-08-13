export async function onRequest({ env }) {
  const openAiApiKey = env.OPENAI_API_KEY || ''
  const accessToken = env.OPS_AGENT_ACCESS_TOKEN || ''
  const model = env.OPENAI_MODEL || 'gpt-5.4-mini'
  const configured = Boolean(openAiApiKey && accessToken)

  return new Response(
    JSON.stringify({
      ok: true,
      configured,
      model: configured ? model : '',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  )
}
