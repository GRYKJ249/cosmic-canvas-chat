import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Phone, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Opera AI" },
      { name: "description", content: "Sign in to Opera AI with your phone number and a one-time SMS code." },
      { property: "og:title", content: "Sign in — Opera AI" },
      { property: "og:description", content: "Sign in to Opera AI with your phone number and a one-time SMS code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Step = "phone" | "code" | "profile";

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function AuthPage() {
  const { t, lang } = useLang();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in: go to the profile step if it is incomplete, otherwise to chat.
  useEffect(() => {
    if (loading || !user) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.username) {
        navigate({ to: "/chat", replace: true });
        return;
      }
      setDisplayName(data?.display_name ?? "");
      setStep("profile");
    })();
  }, [loading, user, navigate]);

  const sendCode = async () => {
    const value = normalizePhone(phone);
    if (value.length < 8) {
      toast.error(t("Enter a valid phone number with country code.", "اكتب رقم هاتف صحيح مع رمز الدولة."));
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: value });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPhone(value);
    setStep("code");
    toast.success(t("Code sent by SMS.", "تم إرسال الكود برسالة نصية."));
  };

  const verify = async () => {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStep("profile");
  };

  const saveProfile = async () => {
    const handle = username.trim().replace(/^@/, "");
    if (!displayName.trim() || !handle) {
      toast.error(t("Add your name and a username.", "أضف اسمك واسم المستخدم."));
      return;
    }
    const { data: current } = await supabase.auth.getUser();
    if (!current.user) return;

    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: current.user.id,
        display_name: displayName.trim(),
        username: handle,
        phone: current.user.phone ?? phone,
      });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? t("That username is taken.", "اسم المستخدم محجوز.") : error.message);
      return;
    }
    navigate({ to: "/chat", replace: true });
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-strong w-full max-w-md rounded-3xl p-8">
        <Link to="/" className="flex items-center justify-center gap-2.5">
          <OperaLogoMark className="h-9 w-9" />
          <span className="font-display text-lg font-bold">
            Opera<span className="text-primary">AI</span>
          </span>
        </Link>

        {step === "phone" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendCode();
            }}
            className="mt-7 space-y-4"
          >
            <h1 className="text-center font-display text-xl font-bold">
              {t("Sign in with your phone", "سجّل دخولك برقم هاتفك")}
            </h1>
            <p className="text-center text-sm text-muted-foreground">
              {t("We'll text you a one-time code.", "راح نرسل ليك كود لمرة واحدة.")}
            </p>
            <label className="glass flex items-center gap-2 rounded-xl px-3 py-2.5">
              <Phone className="h-4 w-4 text-primary" />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                dir="ltr"
                inputMode="tel"
                placeholder="+249901234567"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <button type="submit" disabled={busy} className="btn-hero w-full justify-center !py-2.5 text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {t("Send code", "أرسل الكود")}
            </button>
          </form>
        )}

        {step === "code" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void verify();
            }}
            className="mt-7 space-y-4"
          >
            <h1 className="text-center font-display text-xl font-bold">{t("Enter the code", "أدخل الكود")}</h1>
            <p className="text-center text-sm text-muted-foreground" dir="ltr">
              {phone}
            </p>
            <label className="glass flex items-center gap-2 rounded-xl px-3 py-2.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                dir="ltr"
                inputMode="numeric"
                placeholder="123456"
                className="flex-1 bg-transparent text-center text-lg tracking-[0.4em] outline-none"
              />
            </label>
            <button type="submit" disabled={busy} className="btn-hero w-full justify-center !py-2.5 text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {t("Verify", "تأكيد")}
            </button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="btn-ghost w-full justify-center !py-2 text-xs"
            >
              {t("Change number", "تغيير الرقم")}
            </button>
          </form>
        )}

        {step === "profile" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveProfile();
            }}
            className="mt-7 space-y-4"
          >
            <h1 className="text-center font-display text-xl font-bold">{t("Your profile", "ملفك الشخصي")}</h1>
            <p className="text-center text-sm text-muted-foreground">
              {t("Pick the name and username people will see.", "اختر الاسم واسم المستخدم الظاهر للناس.")}
            </p>
            <label className="glass flex items-center gap-2 rounded-xl px-3 py-2.5">
              <UserRound className="h-4 w-4 text-primary" />
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={t("Display name", "الاسم الظاهر")}
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <label className="glass flex items-center gap-2 rounded-xl px-3 py-2.5">
              <span className="text-sm text-muted-foreground">@</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                dir="ltr"
                placeholder="username"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <button type="submit" disabled={busy} className="btn-hero w-full justify-center !py-2.5 text-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {t("Save and continue", "احفظ وواصل")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
