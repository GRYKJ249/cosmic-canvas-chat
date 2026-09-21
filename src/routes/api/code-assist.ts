import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";

const bodySchema = z.object({
  action: z.enum(["explain", "refactor", "fix", "ask"]),
  code: z.string().max(60_000),
  filename: z.string().max(200),
  language: z.string().max(40),
  instruction: z.string().max(4000).optional(),
  terminal: z.string().max(8000).optional(),
});

const ACTION_PROMPTS: Record<z.infer<typeof bodySchema>["action"], string> = {
  explain:
    "Explain this code line-by-line (group trivial lines). Start with a one-paragraph summary, then a numbered breakdown. Keep it tight.",
  refactor:
    "Refactor this code for readability, performance and idiomatic style without changing behaviour. Return the FULL refactored file in one fenced code block first, then a short bullet list of what changed.",
  fix: "Find bugs and syntax errors (use the terminal output if provided). Return the FULL fixed file in one fenced code block first, then a short list of the fixes.",
  ask: "Answer the developer's question about this code. Be concrete and show code when useful.",
};

export const Route = createFileRoute("/api/code-assist")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });
        const { action, code, filename, language, instruction, terminal } = parsed.data;

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });

        const prompt = [
          `File: ${filename} (${language})`,
          "```" + language.toLowerCase(),
          code,
          "```",
          terminal ? `\nTerminal output:\n\`\`\`\n${terminal}\n\`\`\`` : "",
          instruction ? `\nDeveloper instruction: ${instruction}` : "",
        ].join("\n");

        const result = streamText({
          model: lovable.chat("google/gemini-3.8-flash"),
          system: `You are Opera AI's coding assistant inside a cloud IDE. Reply in the same language the developer writes in (Arabic or English), but keep code and identifiers in English. Use Markdown with fenced code blocks tagged with the language. ${ACTION_PROMPTS[action]}`,
          prompt,
          abortSignal: request.signal,
        });

        return result.toTextStreamResponse();
      },
    },
  },
});
