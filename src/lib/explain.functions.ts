import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Level = "beginner" | "intermediate" | "expert";
export type LineExplanation = { line: number; code: string; explanation: string };

const LEVEL_PROMPTS: Record<Level, string> = {
  beginner:
    "The reader is a complete beginner. Use simple everyday words, avoid jargon, and use small analogies. Explain what each keyword or symbol does.",
  intermediate:
    "The reader knows programming basics. Be clear and concise, mention relevant concepts by name, and explain why the line matters.",
  expert:
    "The reader is an expert engineer. Be terse and precise. Focus on semantics, edge cases, performance and idioms. Skip the obvious.",
};

export const explainCode = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      code: z.string().min(1).max(8000),
      level: z.enum(["beginner", "intermediate", "expert"]),
    }),
  )
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("AI is not configured.");

    const system = `You are a patient senior software engineer acting as a code tutor. ${LEVEL_PROMPTS[data.level]}
Explain the user's code LINE BY LINE. Skip lines that are empty. Group nothing; every non-empty line gets its own entry.
Respond ONLY with JSON: {"language": string, "summary": string, "lines": [{"line": number, "code": string, "explanation": string}]}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.code },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Too many requests. Please wait a moment and try again.");
    if (res.status === 402) throw new Error("AI credits are used up. Please add credits to continue.");
    if (!res.ok) throw new Error("The AI could not explain this code right now.");

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/^```(?:json)?\s*|\s*```$/g, "");
    const parsed = JSON.parse(cleaned) as {
      language?: string;
      summary?: string;
      lines?: LineExplanation[];
    };
    return {
      language: parsed.language ?? "code",
      summary: parsed.summary ?? "",
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
    };
  });
