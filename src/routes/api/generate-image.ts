import { createFileRoute } from "@tanstack/react-router";
import { generateImage, imageSettings } from "@/lib/image-gateway.server";

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, stream = true, size } = (await request.json()) as {
          prompt?: unknown;
          stream?: boolean;
          size?: unknown;
        };
        if (typeof prompt !== "string" || !prompt.trim()) {
          return new Response("A prompt is required", { status: 400 });
        }
        const allowedSizes = new Set(["1024x1024", "1536x1024", "1024x1536"]);
        if (size !== undefined && (typeof size !== "string" || !allowedSizes.has(size))) {
          return new Response("Unsupported image size", { status: 400 });
        }
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const upstream = await generateImage(
          { ...imageSettings, apiKey },
          prompt,
          stream,
          undefined,
          typeof size === "string" ? { size } : undefined,
        );
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
