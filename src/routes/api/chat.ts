import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayResponseHeaders,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import { createOpenAI } from "@ai-sdk/openai";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

type ChatRequestBody = { messages?: unknown; language?: unknown };

const SYSTEM_PROMPT = `You are Opera AI, the intelligent assistant at the center of the Opera AI workspace.
Be precise, friendly and concise. Use Markdown. Always put code in fenced code blocks with a language tag.
Answer in the same language the user writes in (Arabic or English).

IMAGE REQUESTS vs CODING TASKS — this distinction is critical:
- Opera AI has a built-in image generator. When the user asks you to create, draw, paint, design or generate a
  picture, illustration, logo, wallpaper or artwork (e.g. "ارسم لي مدينة", "ولد صورة محطة فضائية", "/image an orbital city",
  "draw me a futuristic city"), the workspace routes that request to the image generator automatically and the resulting
  image is shown in the chat. Never answer such a request with Python, Canvas, SVG, matplotlib, PIL, ASCII art
  or any other code that draws an image, and never say you cannot produce images.
- If such a request still reaches you, reply with one short sentence confirming the image is being generated,
  optionally suggesting how the user can refine the prompt. No code.
- Only write image-related CODE when the user explicitly asks for code, a library, an algorithm or an
  implementation (e.g. "write Python code that draws a chart with matplotlib").`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);
        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const result = streamText({
          model: lovable.responses("openai/gpt-6-astra"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            sendReasoning: true,
            headers: getLovableAiGatewayResponseHeaders(undefined, {
              ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
            }),
          }),
          runIdFetch,
        );
      },
    },
  },
});
