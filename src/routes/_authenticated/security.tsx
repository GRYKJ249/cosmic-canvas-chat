import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Monitor,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { describeDevice, generateApiKey, hashApiKey, logAuthEvent } from "@/lib/security";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({
    meta: [
      { title: "Security center — Opera AI" },
      { name: "description", content: "Review activity saved in your browser and manage personal API keys for Opera AI." },
      { property: "og:title", content: "Security center — Opera AI" },
      { property: "og:description", content: "Review activity saved in your browser and manage personal API keys." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [label, setLabel] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const events = useQuery({
    queryKey: ["auth-events", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auth_events")
        .select("id, event, provider, user_agent, created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

  const keys = useQuery({
    queryKey: ["api-keys", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, label, key_prefix, created_at, revoked_at, last_used_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createKey = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No session");
      const clean = label.trim() || t("Untitled key", "مفتاح بلا اسم");
      const key = generateApiKey();
      const { error } = await supabase.from("api_keys").insert({
        user_id: user.id,
        label: clean,
        key_prefix: key.slice(0, 12),
        key_hash: await hashApiKey(key),
      });
      if (error) throw error;
      await logAuthEvent(user.id, "api_key_created");
      return key;
    },
    onSuccess: async (key) => {
      setFreshKey(key);
      setLabel("");
      await queryClient.invalidateQueries({ queryKey: ["api-keys", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["auth-events", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      if (user) await logAuthEvent(user.id, "api_key_revoked");
    },
    onSuccess: async () => {
      toast.success(t("Key revoked.", "تم إلغاء المفتاح."));
      await queryClient.invalidateQueries({ queryKey: ["api-keys", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const eventLabel = (event: string) =>
    ({
      sign_in: t("Signed in", "تسجيل دخول"),
      sign_up: t("Account created", "إنشاء حساب"),
      sign_out_all: t("Signed out of all devices", "خروج من كل الأجهزة"),
      password_changed: t("Password changed", "تغيير كلمة المرور"),
      api_key_created: t("API key created", "إنشاء مفتاح API"),
      api_key_revoked: t("API key revoked", "إلغاء مفتاح API"),
    })[event] ?? event;

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center gap-3">
          <Link to="/dashboard" aria-label={t("Back to account", "العودة إلى الحساب")} className="text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold">{t("Security center", "مركز الأمان")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("Activity history and personal API keys, stored in this browser.", "سجل النشاط ومفاتيح API الشخصية، محفوظة في هذا المتصفح.")}
            </p>
          </div>
        </header>

        <section className="glass-strong mt-6 rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold">{t("Personal API keys", "مفاتيح API الشخصية")}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("A key is shown once at creation. Only its fingerprint is stored.", "يظهر المفتاح مرة واحدة عند إنشائه، ولا نحفظ إلا بصمته.")}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={t("Key name (e.g. My script)", "اسم المفتاح (مثلاً: سكربتي)")}
              className="min-w-48 flex-1 rounded-xl border border-glass-border bg-background/40 px-3.5 py-3 text-sm outline-none focus:border-primary/60"
            />
            <Button type="button" disabled={createKey.isPending} onClick={() => createKey.mutate()}>
              {createKey.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
              {t("Create key", "إنشاء مفتاح")}
            </Button>
          </div>

          {freshKey && (
            <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">{t("Copy it now — it will not be shown again.", "انسخه الآن — لن يظهر مرة أخرى.")}</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate font-mono text-sm">{freshKey}</code>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label={t("Copy", "نسخ")}
                  onClick={async () => {
                    await navigator.clipboard.writeText(freshKey);
                    toast.success(t("Key copied.", "تم نسخ المفتاح."));
                  }}
                >
                  <Copy />
                </Button>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-2">
            {keys.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (keys.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No keys yet.", "لا توجد مفاتيح بعد.")}</p>
            ) : (
              (keys.data ?? []).map((item: any) => (
                <div key={item.id} className="glass flex flex-wrap items-center gap-3 rounded-xl p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.label}</p>
                    <p className="font-mono text-xs text-muted-foreground">{item.key_prefix}••••••</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] ${item.revoked_at ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                    {item.revoked_at ? t("Revoked", "ملغى") : t("Active", "نشط")}
                  </span>
                  {!item.revoked_at && (
                    <Button type="button" size="icon" variant="destructive" aria-label={t("Revoke", "إلغاء")} onClick={() => revokeKey.mutate(item.id)}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="glass-strong mt-6 mb-10 rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold">{t("Recent activity", "النشاط الأخير")}</h2>
          </div>
          <div className="mt-4 space-y-2">
            {events.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (events.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("Nothing recorded yet.", "لا يوجد نشاط مسجّل بعد.")}</p>
            ) : (
              (events.data ?? []).map((item: any) => (
                <div key={item.id} className="glass flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">{eventLabel(item.event)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {describeDevice(item.user_agent)} · {item.provider ?? "email"}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">{formatDate(item.created_at)}</time>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
