export async function onRequest(context) {
  const OPENAI_API_KEY = context.env.OPENAI_API_KEY || "";
  const OPENAI_MODEL = context.env.OPENAI_MODEL || "gpt-5.4-mini";

  return new Response(JSON.stringify({
    ok: true,
    configured: Boolean(OPENAI_API_KEY),
    model: OPENAI_MODEL
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    }
  });
}
