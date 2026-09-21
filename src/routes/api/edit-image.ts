import { createFileRoute } from "@tanstack/react-router";
import { imageSettings } from "@/lib/image-gateway.server";

const ALLOWED_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);

export const Route = createFileRoute("/api/edit-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const incoming = await request.formData();
        const prompt = incoming.get("prompt");
        if (typeof prompt !== "string" || !prompt.trim()) {
          return new Response("A prompt is required", { status: 400 });
        }

        const images = incoming.getAll("image[]").filter((value): value is File => value instanceof File);
        if (images.length === 0) return new Response("A reference image is required", { status: 400 });

        const size = incoming.get("size");
        if (typeof size === "string" && size && !ALLOWED_SIZES.has(size)) {
          return new Response("Unsupported image size", { status: 400 });
        }

        const stream = incoming.get("stream") !== "false";

        const form = new FormData();
        form.append("model", imageSettings.model);
        form.append("prompt", prompt);
        for (const image of images) form.append("image[]", image, image.name || "reference.png");
        const mask = incoming.get("mask");
        if (mask instanceof File) form.append("mask", mask, mask.name || "mask.png");
        if (typeof size === "string" && size) form.append("size", size);
        if (stream) {
          form.append("stream", "true");
          form.append("partial_images", "1");
        }

        const upstream = await fetch(`${imageSettings.baseURL}/v1/images/edits`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });

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
