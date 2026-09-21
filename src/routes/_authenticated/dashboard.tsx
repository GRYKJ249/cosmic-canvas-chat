import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Code2, Cpu, ImageIcon, Loader2, Save, ShieldCheck, Sparkles } from "lucide-react";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your account — Opera AI" },
      { name: "description", content: "Manage your Opera AI profile, verification status and usage." },
      { property: "og:title", content: "Your account — Opera AI" },
      { property: "og:description", content: "Manage your Opera AI profile, verification status and usage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, lang, setLang } = useLang();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, tokens_used, created_at")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setUsername(profile.username ?? "");
    }
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), username: username.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("Profile saved.", "تم حفظ الملف الشخصي."));
    void queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
  };

  const verified = !!user?.email_confirmed_at;

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <OperaLogoMark className="h-10 w-10" />
            <span className="font-display text-lg font-bold">
              Opera<span className="text-primary">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="btn-ghost !px-3 !py-2 text-xs">
              {lang === "ar" ? "English" : "العربية"}
            </button>
          </div>
        </header>

        <div className="glass-strong mt-8 rounded-3xl p-8">
          <div className="flex flex-wrap items-center gap-4">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-glass-border" />
            ) : (
              <OperaLogoMark className="h-16 w-16" label="Opera AI" />
            )}
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold">
                {t("Welcome", "أهلاً")}, {profile?.display_name || user?.email}
              </h1>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <span
              className={`ms-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
                verified ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              <BadgeCheck className="h-4 w-4" />
              {verified ? t("Verified account", "حساب موثّق") : t("Email not confirmed", "البريد غير مؤكد")}
            </span>
          </div>

          {isLoading ? (
            <div className="mt-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("Display name", "الاسم المعروض")}</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-glass-border bg-background/40 px-3.5 py-3 text-sm outline-none focus:border-primary/60"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("Username", "اسم المستخدم")}</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-glass-border bg-background/40 px-3.5 py-3 text-sm outline-none focus:border-primary/60"
                />
              </label>
              <div className="sm:col-span-2">
                <button type="button" onClick={save} disabled={saving} className="btn-hero justify-center disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t("Save changes", "حفظ التغييرات")}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass rounded-2xl p-6">
            <Cpu className="h-5 w-5 text-primary" />
            <p className="mt-3 text-3xl font-bold">{profile?.tokens_used ?? 0}</p>
            <p className="text-sm text-muted-foreground">{t("AI tokens used", "الرصيد المستخدم للذكاء الاصطناعي")}</p>
          </div>
          <Link to="/chat" className="glass rounded-2xl p-6 transition hover:border-primary/50">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="mt-3 font-semibold">{t("Chat workspace", "مساحة المحادثة")}</p>
            <p className="text-sm text-muted-foreground">
              {t("Talk to Opera AI with streaming answers and saved conversations.", "تحدّث مع أوبرا الذكي بردود فورية ومحادثات محفوظة.")}
            </p>
          </Link>
          <Link to="/studio" className="glass rounded-2xl p-6 transition hover:border-primary/50">
            <ImageIcon className="h-5 w-5 text-primary" />
            <p className="mt-3 font-semibold">{t("Creative Studio", "الاستوديو الإبداعي")}</p>
            <p className="text-sm text-muted-foreground">
              {t("Generate original images and revisit your private archive.", "أنشئ صوراً أصلية واستعرض أرشيفك الخاص.")}
            </p>
          </Link>
          <Link to="/code" className="glass rounded-2xl p-6 transition hover:border-primary/50">
            <Code2 className="h-5 w-5 text-primary" />
            <p className="mt-3 font-semibold">{t("Code Workspace", "مساحة الأكواد")}</p>
            <p className="text-sm text-muted-foreground">
              {t("Cloud IDE with a live terminal and AI refactoring.", "بيئة برمجة سحابية بطرفية حيّة ومساعد ذكي للتحسين.")}
            </p>
          </Link>
          <Link to="/security" className="glass rounded-2xl p-6 transition hover:border-primary/50">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <p className="mt-3 font-semibold">{t("Security center", "مركز الأمان")}</p>
            <p className="text-sm text-muted-foreground">
              {t("Activity history and personal API keys, stored in this browser.", "سجل النشاط ومفاتيح API الشخصية، محفوظة في هذا المتصفح.")}
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
