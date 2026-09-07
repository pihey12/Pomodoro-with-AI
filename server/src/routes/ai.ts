import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { env } from "../config/env.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const planRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(2000),
  create_tasks: z.boolean().default(true),
});

const aiPlanSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional().nullable(),
      estimated_minutes: z.number().int().positive().optional().nullable(),
      priority: z.enum(["low", "medium", "high"]).optional(),
    }),
  ),
  breaks: z.array(
    z.object({
      after_task_index: z.number().int().min(0),
      minutes: z.number().int().positive(),
      label: z.string().optional(),
    }),
  ),
  summary: z.string().optional(),
});

router.post("/plan", requireAuth, async (req, res) => {
  const { db, user } = req as AuthedRequest;
  const parsed = planRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const system = `You are a productivity planner for a Pomodoro / Task Track Timer app.
Given a user's natural language request, return ONLY valid JSON with this shape:
{
  "tasks": [{ "title": string, "description"?: string, "estimated_minutes"?: number, "priority"?: "low"|"medium"|"high" }],
  "breaks": [{ "after_task_index": number, "minutes": number, "label"?: string }],
  "summary"?: string
}
Rules:
- Create concrete, actionable task titles.
- If the user asks for N tasks, create exactly N tasks (invent sensible titles if they only gave a count).
- If they mention a break, include at least one break entry.
- Default focus block estimates to 25 minutes when unspecified.
- after_task_index is 0-based index into the tasks array.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: parsed.data.prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return res.status(502).json({ error: "AI returned invalid JSON" });
    }

    const planParsed = aiPlanSchema.safeParse(json);
    if (!planParsed.success) {
      return res.status(502).json({
        error: "AI response did not match expected plan shape",
        details: planParsed.error.flatten(),
        raw: json,
      });
    }

    const plan = planParsed.data;

    await db.from("ai_plans").insert({
      user_id: user.id,
      prompt: parsed.data.prompt,
      response_json: plan,
    });

    let createdTasks: unknown[] = [];
    if (parsed.data.create_tasks && plan.tasks.length > 0) {
      const rows = plan.tasks.map((t) => ({
        user_id: user.id,
        title: t.title,
        description: t.description ?? null,
        estimated_minutes: t.estimated_minutes ?? 25,
        priority: t.priority ?? "medium",
        status: "todo" as const,
      }));

      const { data, error } = await db.from("tasks").insert(rows).select("*");
      if (error) {
        return res.status(500).json({ error: error.message, plan });
      }
      createdTasks = data ?? [];
    }

    return res.json({
      plan,
      created_tasks: createdTasks,
    });
  } catch (err) {
    console.error("OpenAI plan error:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to generate plan",
    });
  }
});

export default router;
