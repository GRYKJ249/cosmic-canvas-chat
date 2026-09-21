import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";

export const PENDING_KEY = "opera-pending-message";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [
      { title: "New conversation — Opera AI" },
      { name: "description", content: "Start a saved conversation with the Opera AI assistant." },
      { property: "og:title", content: "New conversation — Opera AI" },
      { property: "og:description", content: "Start a saved conversation with the Opera AI assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatIndex,
});

function ChatIndex() {
  const { t, lang } = useLang();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resumed = useRef(false);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const start = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;

    if (typeof window !== "undefined") sessionStorage.setItem(PENDING_KEY, message);

    if (!user) {
      navigate({ to: "/auth" });
      return;
    }

    setBusy(true);
    const title = message.slice(0, 48) + (message.length > 48 ? "…" : "");
    const { data, error } = await supabase
      .from("chat_threads")
      .insert({ user_id: user.id, title })
      .select("id")
      .single();

    if (error || !data) {
      setBusy(false);
      toast.error(error?.message ?? "Could not start the conversation");
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    navigate({ to: "/chat/$threadId", params: { threadId: data.id } });
  };

  // Resume the message the visitor typed before signing in.
  useEffect(() => {
    if (loading || !user || resumed.current || typeof window === "undefined") return;
    const pending = sessionStorage.getItem(PENDING_KEY);
    if (!pending) return;
    resumed.current = true;
    void start(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
      <OperaLogoMark className="h-14 w-14" label="Opera AI" />
      <h1 className="mt-5 text-center font-display text-2xl font-bold sm:text-3xl">
        {t("What should we build today?", "شنو نبني اليوم؟")}
      </h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void start(input);
        }}
        className="mt-7 w-full max-w-2xl"
      >
        <div className="glass-strong flex items-end gap-2 rounded-2xl p-2">
          <button
            type="button"
            onClick={() => setInput((value) => (value.startsWith("/image ") ? value : `/image ${value}`))}
            className="btn-ghost !rounded-xl !p-3"
            aria-label={t("Generate an image", "توليد صورة")}
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void start(input);
              }
            }}
            dir={lang === "ar" ? "rtl" : "ltr"}
            rows={2}
            placeholder={t("Ask Opera AI anything…", "اسأل أوبرا عن أي حاجة…")}
            className="max-h-40 min-h-[56px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="btn-hero !rounded-xl !px-3.5 !py-3 disabled:opacity-40"
            aria-label="send"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
