import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Brain, ImagePlus, Loader2, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";
import { Markdown } from "@/components/chat/Markdown";
import { ImageCard } from "@/components/chat/ImageCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { detectImageRequest } from "@/lib/image-intent";
import { streamImage } from "@/lib/stream-image";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Conversation — Opera AI" },
      { name: "description", content: "Continue a private, browser-saved conversation with Opera AI." },
      { property: "og:title", content: "Conversation — Opera AI" },
      { property: "og:description", content: "Continue a private, browser-saved conversation with Opera AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThreadPage,
});

type ImageTurn = {
  id: string;
  prompt: string;
  /** Number of text messages that precede this image in the thread. */
  anchor: number;
  status: "loading" | "done" | "error";
  dataUrl?: string;
  path?: string | null;
  error?: string;
};

type LoadedThread = { messages: UIMessage[]; images: ImageTurn[] };

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { user } = useAuth();

  const { data, isLoading } = useQuery<LoadedThread>({
    queryKey: ["chat-messages", threadId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, image_url")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const messages: UIMessage[] = [];
      const images: ImageTurn[] = [];
      for (const row of data ?? []) {
        if (row.image_url) {
          images.push({
            id: row.id,
            prompt: row.content,
            anchor: messages.length,
            status: "done",
            path: row.image_url,
          });
        } else {
          messages.push({
            id: row.id,
            role: row.role as "user" | "assistant",
            parts: [{ type: "text" as const, text: row.content }],
          });
        }
      }
      return { messages, images };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return <Thread key={threadId} threadId={threadId} initial={data} />;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const head = dataUrl.slice(0, dataUrl.indexOf(","));
  const body = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const mime = head.match(/data:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function Thread({ threadId, initial }: { threadId: string; initial: LoadedThread }) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [imageTurns, setImageTurns] = useState<ImageTurn[]>(initial.images);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    id: threadId,
    messages: initial.messages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => toast.error(error.message),
    onFinish: ({ message }) => {
      const text = message.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");
      if (!user || !text) return;
      void supabase
        .from("chat_messages")
        .insert({ thread_id: threadId, user_id: user.id, role: "assistant", content: text });
      void supabase
        .from("chat_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", threadId);
    },
  });

  const generatingImage = imageTurns.some((turn) => turn.status === "loading");
  const busy = status === "submitted" || status === "streaming" || generatingImage;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status, imageTurns]);

  const updateTurn = (id: string, patch: Partial<ImageTurn>) =>
    setImageTurns((turns) => turns.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)));

  const runImageGeneration = async (prompt: string, anchor: number) => {
    const id = crypto.randomUUID();
    setImageTurns((turns) => [...turns, { id, prompt, anchor, status: "loading" }]);

    try {
      let finalUrl: string | undefined;
      await streamImage("/api/generate-image", { prompt }, (frame, isFinal) => {
        updateTurn(id, { dataUrl: frame });
        if (isFinal) finalUrl = frame;
      });

      if (!finalUrl) throw new Error("No image returned");
      updateTurn(id, { dataUrl: finalUrl, status: "done" });

      if (!user) return;
      const path = `${user.id}/${id}.png`;
      const { error: uploadError } = await supabase.storage
        .from("generations")
        .upload(path, dataUrlToBlob(finalUrl), { contentType: "image/png", upsert: true });
      if (uploadError) throw uploadError;

      updateTurn(id, { path });
      await supabase.from("generated_images").insert({ user_id: user.id, prompt, image_path: path });
      await supabase.from("chat_messages").insert({
        thread_id: threadId,
        user_id: user.id,
        role: "assistant",
        content: prompt,
        image_url: path,
      });
      void supabase
        .from("chat_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", threadId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateTurn(id, { status: "error", error: message });
      toast.error(message);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy || !user) return;
    setInput("");

    void supabase
      .from("chat_messages")
      .insert({ thread_id: threadId, user_id: user.id, role: "user", content: text });

    const isFirst = messages.length === 0 && imageTurns.length === 0;
    if (isFirst) {
      const title = text.slice(0, 48) + (text.length > 48 ? "…" : "");
      await supabase.from("chat_threads").update({ title }).eq("id", threadId);
      void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    }

    const intent = detectImageRequest(text);
    if (intent.isImage) {
      // Show the user's request in the transcript without calling the text model.
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] },
      ]);
      void runImageGeneration(intent.prompt, messages.length + 1);
      return;
    }

    sendMessage({ text });
  };

  const renderImagesAt = (index: number) =>
    imageTurns
      .filter((turn) => turn.anchor === index)
      .map((turn) => (
        <div key={turn.id} className="flex gap-3">
          <OperaLogoMark className="h-8 w-8 shrink-0" />
          <ImageCard
            prompt={turn.prompt}
            dataUrl={turn.dataUrl}
            path={turn.path}
            status={turn.status}
            error={turn.error}
          />
        </div>
      ));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && imageTurns.length === 0 && (
            <div className="glass-strong mt-10 rounded-3xl p-10 text-center">
              <OperaLogoMark className="mx-auto h-20 w-20" label="Opera AI" />
              <h1 className="mt-5 font-display text-2xl font-bold">
                {t("How can I help you today?", "كيف أقدر أساعدك اليوم؟")}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  "Ask anything — code, ideas, writing, analysis or images.",
                  "اسأل عن أي شيء — برمجة، أفكار، كتابة، تحليل أو صور.",
                )}
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {[
                  t("Explain React Server Components", "اشرح لي مكونات الخادم في React"),
                   t("/image an orbital city above Earth", "ولد صورة مدينة مدارية فوق الأرض"),
                  t("Debug this SQL query", "صحّح استعلام SQL هذا"),
                  t("Plan a 7-day study schedule", "خطّط جدول مذاكرة لسبعة أيام"),
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setInput(sample)}
                    className="glass rounded-xl px-4 py-3 text-start text-sm transition hover:border-primary/50"
                  >
                    <Sparkles className="mb-1.5 h-4 w-4 text-primary" />
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          )}

          {renderImagesAt(0)}

          {messages.map((message, index) => {
            const isUser = message.role === "user";
            const text = message.parts
              .filter((p) => p.type === "text")
              .map((p) => (p as { text: string }).text)
              .join("");
            const reasoning = message.parts
              .filter((p) => p.type === "reasoning")
              .map((p) => (p as { text?: string }).text ?? "")
              .join("")
              .trim();

            return (
              <div key={message.id}>
                <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  {!isUser && (
                    <OperaLogoMark className="h-8 w-8 shrink-0" />
                  )}
                  <div className={`min-w-0 max-w-[85%] ${isUser ? "text-end" : ""}`}>
                    {reasoning && !isUser && (
                      <details className="glass mb-2 rounded-xl px-3 py-2 text-xs text-muted-foreground">
                        <summary className="flex cursor-pointer items-center gap-1.5">
                          <Brain className="h-3.5 w-3.5" />
                          {t("Thinking", "التفكير")}
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap">{reasoning}</p>
                      </details>
                    )}
                    {text && (
                      <div
                        className={
                          isUser
                            ? "inline-block rounded-2xl bg-primary/15 px-4 py-2.5 text-start text-[15px]"
                            : "glass rounded-2xl px-4 py-3 text-start"
                        }
                      >
                        {isUser ? <p className="whitespace-pre-wrap">{text}</p> : <Markdown content={text} />}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 space-y-6">{renderImagesAt(index + 1)}</div>
              </div>
            );
          })}

          {status === "submitted" && !generatingImage && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {t("Opera AI is thinking…", "أوبرا الذكي يفكّر…")}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={submit} className="border-t border-glass-border px-4 py-4">
        <div className="glass-strong mx-auto flex max-w-3xl items-end gap-2 rounded-2xl p-2">
          <button
            type="button"
            onClick={() => setInput((value) => (value.startsWith("/image ") ? value : `/image ${value}`))}
            className="btn-ghost !rounded-xl !p-3"
            aria-label={t("Generate an image", "توليد صورة")}
            title={t("Generate an image", "توليد صورة")}
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(e);
              }
            }}
            dir={lang === "ar" ? "rtl" : "ltr"}
            rows={1}
            placeholder={t("Message Opera AI… or /image an orbital city", "اكتب رسالتك لأوبرا… أو /image مدينة مدارية")}
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none"
          />
          {busy ? (
            <button type="button" onClick={stop} className="btn-ghost !rounded-xl !p-3" aria-label="stop">
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="btn-hero !rounded-xl !px-3.5 !py-3 disabled:opacity-40"
              aria-label="send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
