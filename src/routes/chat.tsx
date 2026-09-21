import { createFileRoute, Link, Outlet, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Code2,
  ImageIcon,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/chat")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Chat workspace — Opera AI" },
      { name: "description", content: "Talk to Opera AI: a fast, streaming assistant with saved conversations." },
      { property: "og:title", content: "Chat workspace — Opera AI" },
      { property: "og:description", content: "Talk to Opera AI: a fast, streaming assistant with saved conversations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatLayout,
});

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function ChatLayout() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const params = useParams({ strict: false }) as { threadId?: string };

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: threads } = useQuery({
    queryKey: ["chat-threads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_threads")
        .select("id, title, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const removeThread = async (id: string) => {
    await supabase.from("chat_threads").delete().eq("id", id);
    void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
    if (params.threadId === id) navigate({ to: "/chat" });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/chat" });
  };

  const name = profile?.display_name || profile?.username || "";

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="flex h-screen overflow-hidden">
      {open && (
        <button
          type="button"
          aria-label="close"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`glass-strong fixed inset-y-0 z-40 flex w-72 flex-col border-glass-border transition-transform md:static md:translate-x-0 ${
          lang === "ar" ? "right-0 border-s" : "left-0 border-e"
        } ${open ? "translate-x-0" : lang === "ar" ? "translate-x-full" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="flex items-center justify-between gap-2 p-4">
          <Link to="/" className="flex items-center gap-2.5">
            <OperaLogoMark className="h-8 w-8" />
            <span className="font-display text-base font-bold">
              Opera<span className="text-primary">AI</span>
            </span>
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost !p-2 md:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Profile block */}
        <div className="flex flex-col items-center gap-2 px-4 pb-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-glass-border bg-primary/15 font-display text-lg font-bold text-primary">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initialsOf(name)
            )}
          </div>
          {user ? (
            <>
              <Link to="/dashboard" className="max-w-full truncate text-sm font-semibold">
                {name || t("Your account", "حسابك")}
              </Link>
              <button type="button" onClick={signOut} className="btn-ghost !py-1.5 text-xs">
                <LogOut className="h-3.5 w-3.5" />
                {t("Log out", "تسجيل الخروج")}
              </button>
            </>
          ) : (
            <Link to="/auth" className="btn-ghost !py-1.5 text-xs">
              <LogIn className="h-3.5 w-3.5" />
              {t("Log in", "تسجيل الدخول")}
            </Link>
          )}
        </div>

        {/* Nav buttons under the profile */}
        <div className="space-y-1 px-3">
          <Link to="/chat" onClick={() => setOpen(false)} className="btn-hero w-full justify-center !py-2.5 text-sm">
            <Plus className="h-4 w-4" />
            {t("New chat", "محادثة جديدة")}
          </Link>
          <Link to="/studio" className="btn-ghost w-full justify-start !py-2.5 text-xs">
            <ImageIcon className="h-4 w-4" />
            {t("Creative Studio", "الاستوديو الإبداعي")}
          </Link>
          <Link to="/code" className="btn-ghost w-full justify-start !py-2.5 text-xs">
            <Code2 className="h-4 w-4" />
            {t("Code", "الأكواد")}
          </Link>
          <Link to="/dashboard" className="btn-ghost w-full justify-start !py-2.5 text-xs">
            <LayoutDashboard className="h-4 w-4" />
            {t("Account", "الحساب")}
          </Link>
          <Link to="/security" className="btn-ghost w-full justify-start !py-2.5 text-xs">
            <ShieldCheck className="h-4 w-4" />
            {t("Security", "الأمان")}
          </Link>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {(threads ?? []).map((thread: { id: string; title: string }) => (
            <div
              key={thread.id}
              className={`group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                params.threadId === thread.id
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-glass-border/40"
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <Link
                to="/chat/$threadId"
                params={{ threadId: thread.id }}
                onClick={() => setOpen(false)}
                className="min-w-0 flex-1 truncate"
              >
                {thread.title}
              </Link>
              <button
                type="button"
                onClick={() => removeThread(thread.id)}
                className="opacity-0 transition group-hover:opacity-100"
                aria-label="delete"
              >
                <Trash2 className="h-3.5 w-3.5 hover:text-destructive" />
              </button>
            </div>
          ))}
          {user && threads?.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {t("No conversations yet.", "لا توجد محادثات بعد.")}
            </p>
          )}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-glass-border p-3 md:hidden">
          <button type="button" onClick={() => setOpen(true)} className="btn-ghost !p-2">
            <Menu className="h-4 w-4" />
          </button>
          <span className="font-display text-sm font-bold">Opera AI</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
