function extractOutputText(payload) {
  if (!Array.isArray(payload?.output)) return "";

  return payload.output
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function buildOpsPrompt(data) {
  return `
You are an operations agent for a smoke shop outbound sales pipeline.
Your job is to keep outreach flowing, identify bottlenecks, recommend safe fixes, and coach the next call.

Return strict JSON only with this shape:
{
  "summary": "short status summary",
  "pipeline_health": "healthy | warning | critical",
  "issues": [
    {
      "title": "short issue title",
      "severity": "low | medium | high",
      "detail": "specific diagnosis",
      "safe_fix": "specific safe repair action",
      "lead_id": "optional lead id"
    }
  ],
  "safe_repairs": [
    {
      "lead_id": "lead id",
      "changes": {
        "contact": "optional",
        "demoUrl": "optional",
        "status": "optional",
        "notes_append": "optional",
        "history_append": "optional"
      },
      "reason": "why this is safe and useful"
    }
  ],
  "top_priority_lead_id": "best lead id or empty string",
  "coach": {
    "lead_id": "lead id or empty string",
    "opener": "tailored opener",
    "pitch_angle": "tailored angle",
    "follow_up": "recommended follow up line",
    "next_step": "recommended next action",
    "objections": ["...", "..."]
  }
}

Rules:
- Keep fixes conservative and safe.
- Never invent phone numbers or overwrite existing contact names.
- You may create placeholder demo links only when missing, using https://demo.smokeshopgrowth.com/<slug>.
- If a callback is stalled, add a follow-up note.
- Prefer moving a lead from new to ready-to-call only when there is enough context to call.
- Use the selected lead for coaching when available, otherwise choose the top priority lead.
- Objections should be concise and practical.
  `.trim() + `\n\nPipeline data:\n${JSON.stringify(data, null, 2)}`;
}

export async function onRequestPost({ request, env }) {
  const OPENAI_API_KEY = env.OPENAI_API_KEY || "";
  const OPENAI_MODEL = env.OPENAI_MODEL || "gpt-5.4-mini";

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({
      error: "OPENAI_API_KEY is not set securely on Cloudflare.",
      configured: false
    }), { status: 503, headers: { "Content-Type": "application/json" } });
  }

  try {
    const body = await request.json();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        reasoning: { effort: "low" },
        input: buildOpsPrompt(body),
        text: {
          format: {
            type: "json_schema",
            name: "pipeline_ops_agent",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string" },
                pipeline_health: {
                  type: "string",
                  enum: ["healthy", "warning", "critical"]
                },
                issues: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      title: { type: "string" },
                      severity: { type: "string", enum: ["low", "medium", "high"] },
                      detail: { type: "string" },
                      safe_fix: { type: "string" },
                      lead_id: { type: "string" }
                    },
                    required: ["title", "severity", "detail", "safe_fix", "lead_id"]
                  }
                },
                safe_repairs: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      lead_id: { type: "string" },
                      changes: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          contact: { type: "string" },
                          demoUrl: { type: "string" },
                          status: { type: "string" },
                          notes_append: { type: "string" },
                          history_append: { type: "string" }
                        },
                        required: []
                      },
                      reason: { type: "string" }
                    },
                    required: ["lead_id", "changes", "reason"]
                  }
                },
                top_priority_lead_id: { type: "string" },
                coach: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    lead_id: { type: "string" },
                    opener: { type: "string" },
                    pitch_angle: { type: "string" },
                    follow_up: { type: "string" },
                    next_step: { type: "string" },
                    objections: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: ["lead_id", "opener", "pitch_angle", "follow_up", "next_step", "objections"]
                }
              },
              required: ["summary", "pipeline_health", "issues", "safe_repairs", "top_priority_lead_id", "coach"]
            }
          }
        }
      })
    });

    const payload = await response.json();
    
    if (!response.ok) {
      const message = payload?.error?.message || "OpenAI request failed.";
      throw new Error(message);
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      throw new Error("OpenAI returned no structured output.");
    }

    return new Response(JSON.stringify({ 
        ok: true, 
        configured: true, 
        result: JSON.parse(outputText), 
        model: OPENAI_MODEL 
    }), {
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      configured: true,
      error: error instanceof Error ? error.message : "Unknown server error."
    }), { 
        status: 500, 
        headers: { "Content-Type": "application/json; charset=utf-8" } 
    });
  }
}
