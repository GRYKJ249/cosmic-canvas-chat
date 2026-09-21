import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/chat/")({
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const started = useRef(false);

  useEffect(() => {
    if (!user || started.current) return;
    started.current = true;

    void (async () => {
      const { data: existing } = await supabase
        .from("chat_threads")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        navigate({ to: "/chat/$threadId", params: { threadId: existing.id }, replace: true });
        return;
      }

      const { data: created } = await supabase
        .from("chat_threads")
        .insert({ user_id: user.id, title: "New chat" })
        .select("id")
        .single();

      void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      if (created) {
        navigate({ to: "/chat/$threadId", params: { threadId: created.id }, replace: true });
      }
    })();
  }, [user, navigate, queryClient]);

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
