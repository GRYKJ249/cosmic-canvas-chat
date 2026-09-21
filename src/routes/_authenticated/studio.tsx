import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Expand,
  Globe,
  ImageIcon,
  Loader2,
  Lock,
  MessageSquare,
  Orbit,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { streamImage } from "@/lib/stream-image";

export const Route = createFileRoute("/_authenticated/studio")({
  head: () => ({
    meta: [
      { title: "Creative Studio — Opera AI" },
      { name: "description", content: "Create, refine and manage original AI images in the Opera AI Creative Studio." },
      { property: "og:title", content: "Creative Studio — Opera AI" },
      { property: "og:description", content: "Create, refine and manage original AI images in the Opera AI Creative Studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioPage,
});

type StyleName = "Anime" | "Cyberpunk" | "3D Realistic" | "Cinematic" | "Oil Painting";
type RatioName = "1:1" | "16:9" | "9:16";
type GenerationRow = {
  id: string;
  prompt: string;
  style: string | null;
  image_path: string;
  created_at: string;
  is_public?: boolean | null;
};
type GalleryItem = GenerationRow & { signedUrl: string | null };
type Result = {
  prompt: string;
  dataUrl?: string;
  signedUrl?: string;
  status: "loading" | "done" | "error";
  error?: string;
};

const STYLES: { name: StyleName; detail: string }[] = [
  { name: "Anime", detail: "polished anime illustration, expressive linework, vivid cel shading" },
  { name: "Cyberpunk", detail: "cyberpunk visual language, neon city light, futuristic atmosphere" },
  { name: "3D Realistic", detail: "photorealistic 3D render, physically based materials, intricate detail" },
  { name: "Cinematic", detail: "cinematic composition, dramatic lighting, rich depth and film color grading" },
  { name: "Oil Painting", detail: "traditional oil painting, visible brushwork, layered pigments and gallery quality" },
];

const RATIOS: { name: RatioName; label: string; size: string; frame: string }[] = [
  { name: "1:1", label: "Square", size: "1024x1024", frame: "aspect-square" },
  { name: "16:9", label: "Landscape", size: "1536x1024", frame: "aspect-[16/9]" },
  { name: "9:16", label: "Portrait", size: "1024x1536", frame: "aspect-[9/16]" },
];

const IDEAS = [
  "A silver observatory tending a glowing garden inside an orbital station",
  "An ancient library floating above Saturn, filled with tiny astronauts",
  "A bioluminescent city hidden beneath an alien ocean at midnight",
  "A lunar fashion portrait with crystal fabric and Earth in the distance",
  "A friendly robot serving tea at the edge of a colorful nebula",
];

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const mime = dataUrl.slice(0, comma).match(/data:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

function StudioPage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<StyleName>("Cinematic");
  const [ratio, setRatio] = useState<RatioName>("1:1");
  const [negativeEnabled, setNegativeEnabled] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [lightbox, setLightbox] = useState<{ src: string; prompt: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);
  const [reference, setReference] = useState<{ file: File; preview: string } | null>(null);

  const sign = async (rows: GenerationRow[]): Promise<GalleryItem[]> =>
    Promise.all(
      rows.map(async (row) => {
        const { data: signed } = await supabase.storage.from("generations").createSignedUrl(row.image_path, 60 * 60);
        return { ...row, signedUrl: signed?.signedUrl ?? null };
      }),
    );

  const galleryQuery = useQuery({
    queryKey: ["generated-images", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<GalleryItem[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("generated_images")
        .select("id, prompt, style, image_path, created_at, is_public")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return sign(data ?? []);
    },
  });

  const communityQuery = useQuery({
    queryKey: ["community-images"],
    enabled: !!user,
    queryFn: async (): Promise<GalleryItem[]> => {
      const { data, error } = await supabase
        .from("generated_images")
        .select("id, prompt, style, image_path, created_at, is_public")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return sign(data ?? []);
    },
  });

  const toggleShare = async (item: GalleryItem) => {
    const next = !item.is_public;
    const { error } = await supabase.from("generated_images").update({ is_public: next }).eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["generated-images", user?.id] });
    await queryClient.invalidateQueries({ queryKey: ["community-images"] });
    toast.success(next ? t("Shared to the community gallery.", "تمت المشاركة في معرض المجتمع.") : t("Made private again.", "أصبحت خاصة مرة أخرى."));
  };

  const pickReference = (file: File | undefined) => {
    if (!file) return;
    if (reference) URL.revokeObjectURL(reference.preview);
    setReference({ file, preview: URL.createObjectURL(file) });
  };

  const clearReference = () => {
    if (reference) URL.revokeObjectURL(reference.preview);
    setReference(null);
  };

  const filteredGallery = useMemo(
    () => (galleryQuery.data ?? []).filter((item) => filter === "All" || item.style === filter),
    [filter, galleryQuery.data],
  );
  const currentRatio = RATIOS.find((item) => item.name === ratio) ?? RATIOS[0];

  const randomize = () => {
    const currentIndex = IDEAS.indexOf(prompt);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % IDEAS.length : Math.floor(Math.random() * IDEAS.length);
    setPrompt(IDEAS[nextIndex] ?? IDEAS[0] ?? "");
  };

  const enhance = () => {
    const clean = prompt.trim();
    if (!clean) {
      randomize();
      return;
    }
    const additions = "intentional composition, coherent details, atmospheric depth, studio-quality finish";
    if (!clean.toLowerCase().includes("intentional composition")) setPrompt(`${clean}, ${additions}`);
  };

  const generate = async () => {
    if (!user || !prompt.trim() || result?.status === "loading") return;
    const basePrompt = prompt.trim();
    const selectedStyle = STYLES.find((item) => item.name === style) ?? STYLES[3];
    const effectivePrompt = [basePrompt, selectedStyle?.detail, negativeEnabled && negativePrompt.trim() ? `Avoid: ${negativePrompt.trim()}` : ""]
      .filter(Boolean)
      .join(". ");
    setResult({ prompt: basePrompt, status: "loading" });

    try {
      let finalDataUrl: string | undefined;
      await streamImage(
        "/api/generate-image",
        { prompt: effectivePrompt, size: currentRatio?.size ?? "1024x1024" },
        (dataUrl, isFinal) => {
          setResult((current) => ({ ...(current ?? { prompt: basePrompt }), status: "loading", dataUrl }));
          if (isFinal) finalDataUrl = dataUrl;
        },
      );
      if (!finalDataUrl) throw new Error(t("The image service returned no final image.", "لم تُرجع خدمة الصور نتيجة نهائية."));

      const id = crypto.randomUUID();
      const path = `${user.id}/${id}.png`;
      const { error: uploadError } = await supabase.storage
        .from("generations")
        .upload(path, dataUrlToBlob(finalDataUrl), { contentType: "image/png", upsert: true });
      if (uploadError) throw uploadError;
      const { error: saveError } = await supabase.from("generated_images").insert({
        id,
        user_id: user.id,
        prompt: basePrompt,
        style,
        image_path: path,
      });
      if (saveError) throw saveError;
      const { data: signed } = await supabase.storage.from("generations").createSignedUrl(path, 60 * 60);
      setResult({
        prompt: basePrompt,
        status: "done",
        dataUrl: finalDataUrl,
        ...(signed?.signedUrl ? { signedUrl: signed.signedUrl } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["generated-images", user.id] });
      toast.success(t("Image created and saved.", "تم إنشاء الصورة وحفظها."));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setResult((current) => ({
        prompt: current?.prompt ?? basePrompt,
        ...(current?.dataUrl ? { dataUrl: current.dataUrl } : {}),
        status: "error",
        error: message,
      }));
      toast.error(message);
    }
  };

  const download = async (src: string) => {
    const response = await fetch(src);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `opera-studio-${Date.now()}.png`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  const copyLink = async (src?: string | null) => {
    if (!src) return;
    await navigator.clipboard.writeText(src);
    toast.success(t("Temporary image link copied.", "تم نسخ رابط الصورة المؤقت."));
  };

  const removeImage = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const { error: storageError } = await supabase.storage.from("generations").remove([target.image_path]);
    if (storageError) {
      toast.error(storageError.message);
      return;
    }
    const { error: rowError } = await supabase.from("generated_images").delete().eq("id", target.id);
    if (rowError) {
      toast.error(rowError.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["generated-images", user?.id] });
    toast.success(t("Image deleted.", "تم حذف الصورة."));
  };

  const reusePrompt = (item: GalleryItem) => {
    setPrompt(item.prompt);
    if (STYLES.some((preset) => preset.name === item.style)) setStyle(item.style as StyleName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="relative min-h-screen overflow-hidden bg-background">
      <div className="fx-layer pointer-events-none fixed inset-0 bg-grid opacity-40" />
      <header className="sticky top-0 z-30 border-b border-glass-border bg-background/75 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/dashboard" aria-label={t("Back to account", "العودة إلى الحساب")} className="text-muted-foreground transition hover:text-foreground">
              <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
            </Link>
            <OperaLogoMark className="h-10 w-10" />
            <div className="min-w-0">
              <p className="font-display text-sm font-bold">Opera AI</p>
              <p className="truncate text-xs text-muted-foreground">{t("Creative Studio", "الاستوديو الإبداعي")}</p>
            </div>
          </div>
          <nav className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm"><Link to="/chat"><MessageSquare /> <span className="hidden sm:inline">{t("Chat", "المحادثة")}</span></Link></Button>
            <Button asChild variant="secondary" size="sm"><Link to="/studio"><ImageIcon /> <span className="hidden sm:inline">{t("Studio", "الاستوديو")}</span></Link></Button>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <section className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase text-primary">
              <Orbit className="h-4 w-4" /> {t("Phase 5 · visual creation", "المرحلة 5 · الإبداع البصري")}
            </div>
            <h1 className="text-4xl font-extrabold sm:text-5xl">{t("Turn ideas into worlds.", "حوّل الأفكار إلى عوالم.")}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("Shape the scene, choose a visual language, and let Opera AI bring it into orbit.", "صمّم المشهد واختر أسلوبه، ودع أوبرا الذكي ينقله إلى المدار.")}
            </p>
          </div>
          <OperaLogoMark className="hidden h-24 w-24 md:block" label="Opera AI" />
        </section>

        <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
          <div className="glass-strong rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display font-bold">{t("Describe your image", "صف صورتك")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("Be specific about subject, setting and mood.", "حدّد الموضوع والمكان والمزاج.")}</p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{prompt.length}/1200</span>
            </div>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value.slice(0, 1200))}
              placeholder={t("An orbital laboratory exploring a crystal moon…", "مختبر مداري يستكشف قمراً من الكريستال…")}
              className="mt-4 min-h-36 resize-none rounded-xl bg-background/35 p-4 leading-relaxed"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={enhance}><WandSparkles />{t("Enhance", "تحسين")}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={randomize}><RefreshCw />{t("Random idea", "فكرة عشوائية")}</Button>
            </div>

            <div className="mt-7">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Art style", "النمط الفني")}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STYLES.map((preset) => (
                  <Button
                    key={preset.name}
                    type="button"
                    variant={style === preset.name ? "default" : "outline"}
                    className="h-11 justify-between px-3"
                    onClick={() => setStyle(preset.name)}
                  >
                    <span className="truncate">{preset.name}</span>{style === preset.name && <Check />}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-7">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Canvas", "أبعاد اللوحة")}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {RATIOS.map((option) => (
                  <Button
                    key={option.name}
                    type="button"
                    variant={ratio === option.name ? "secondary" : "outline"}
                    className="h-auto min-h-16 flex-col gap-1 px-2 py-2"
                    onClick={() => setRatio(option.name)}
                  >
                    <span className="font-mono text-sm">{option.name}</span>
                    <span className="text-[10px] text-muted-foreground">{option.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-7 border-t border-glass-border pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label htmlFor="negative-prompt" className="text-sm font-semibold">{t("Negative prompt", "الوصف المستبعد")}</label>
                  <p className="mt-1 text-xs text-muted-foreground">{t("Tell the generator what to leave out.", "حدّد ما تريد استبعاده من الصورة.")}</p>
                </div>
                <Switch id="negative-prompt" checked={negativeEnabled} onCheckedChange={setNegativeEnabled} />
              </div>
              {negativeEnabled && (
                <Textarea
                  value={negativePrompt}
                  onChange={(event) => setNegativePrompt(event.target.value)}
                  placeholder={t("Blur, text, extra limbs…", "ضبابية، نص، أطراف زائدة…")}
                  className="mt-3 min-h-20 resize-none rounded-xl bg-background/35"
                />
              )}
            </div>

            <Button type="button" size="lg" disabled={!prompt.trim() || result?.status === "loading"} onClick={() => void generate()} className="mt-7 h-12 w-full font-display font-bold">
              {result?.status === "loading" ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {result?.status === "loading" ? t("Creating your world…", "جارٍ إنشاء عالمك…") : t("Generate image", "توليد الصورة")}
            </Button>
          </div>

          <div className="lg:sticky lg:top-24">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display font-bold">{t("Latest creation", "أحدث إبداع")}</p>
              <span className="font-mono text-xs text-muted-foreground">{ratio} · {style}</span>
            </div>
            <div className={`glass-strong relative mx-auto flex w-full max-h-[70vh] items-center justify-center overflow-hidden rounded-2xl ${currentRatio?.frame ?? "aspect-square"}`}>
              {result?.dataUrl ? (
                <img src={result.dataUrl} alt={result.prompt} className={`h-full w-full object-cover transition duration-500 ${result.status === "loading" ? "scale-[1.02] blur-md" : ""}`} />
              ) : (
                <div className="flex h-full w-full min-h-96 flex-col items-center justify-center p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-glass-border bg-primary/10 text-primary"><ImageIcon className="h-7 w-7" /></div>
                  <p className="mt-5 font-display font-bold">{t("Your canvas is ready", "لوحتك جاهزة")}</p>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("Describe an idea and generate your first image.", "صف فكرتك ثم أنشئ صورتك الأولى.")}</p>
                </div>
              )}
              {result?.status === "loading" && (
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-glass-border bg-background/80 px-4 py-3 text-sm backdrop-blur-xl">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                   <span>{t("Opera AI is rendering every detail…", "أوبرا الذكي يرسم كل التفاصيل…")}</span>
                </div>
              )}
              {result?.status === "error" && (
                <div className="absolute inset-x-4 bottom-4 rounded-xl border border-destructive/40 bg-background/90 p-3 text-sm text-destructive">{result.error}</div>
              )}
              {result?.status === "done" && result.dataUrl && (
                <div className="absolute end-3 top-3 flex gap-2">
                  <Button type="button" size="icon" variant="secondary" aria-label={t("Full screen", "ملء الشاشة")} onClick={() => setLightbox({ src: result.dataUrl ?? "", prompt: result.prompt })}><Expand /></Button>
                  <Button type="button" size="icon" variant="secondary" aria-label={t("Download", "تنزيل")} onClick={() => void download(result.dataUrl ?? "")}><Download /></Button>
                  <Button type="button" size="icon" variant="secondary" aria-label={t("Copy link", "نسخ الرابط")} disabled={!result.signedUrl} onClick={() => void copyLink(result.signedUrl)}><Copy /></Button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-16 border-t border-glass-border pt-10">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="font-mono text-xs uppercase text-primary">{t("Personal archive", "الأرشيف الشخصي")}</p>
              <h2 className="mt-2 text-3xl font-bold">{t("Your generations", "إبداعاتك")}</h2>
            </div>
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {["All", ...STYLES.map((preset) => preset.name)].map((option) => (
                <Button key={option} type="button" size="sm" variant={filter === option ? "default" : "outline"} onClick={() => setFilter(option)}>
                  {option === "All" ? t("All", "الكل") : option}
                </Button>
              ))}
            </div>
          </div>

          {galleryQuery.isLoading ? (
            <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : galleryQuery.isError ? (
            <div className="mt-6 rounded-xl border border-destructive/40 p-5 text-sm text-destructive">{t("Your archive could not be loaded.", "تعذّر تحميل أرشيفك.")}</div>
          ) : filteredGallery.length === 0 ? (
            <div className="mt-6 flex min-h-64 flex-col items-center justify-center border-y border-glass-border text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">{t("No images in this orbit yet.", "لا توجد صور في هذا المدار بعد.")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("Create one above or choose another filter.", "أنشئ صورة أعلاه أو اختر تصنيفاً آخر.")}</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredGallery.map((item) => (
                <article key={item.id} className="glass group overflow-hidden rounded-xl">
                  <div className="relative aspect-square bg-background/40">
                    {item.signedUrl ? <img src={item.signedUrl} alt={item.prompt} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="text-muted-foreground" /></div>}
                    {item.signedUrl && (
                      <div className="absolute inset-x-2 top-2 flex justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <Button size="icon" variant="secondary" aria-label={t("Full screen", "ملء الشاشة")} onClick={() => setLightbox({ src: item.signedUrl ?? "", prompt: item.prompt })}><Expand /></Button>
                        <Button size="icon" variant="secondary" aria-label={t("Download", "تنزيل")} onClick={() => void download(item.signedUrl ?? "")}><Download /></Button>
                        <Button size="icon" variant="secondary" aria-label={t("Copy link", "نسخ الرابط")} onClick={() => void copyLink(item.signedUrl)}><Copy /></Button>
                        <Button size="icon" variant="destructive" aria-label={t("Delete", "حذف")} onClick={() => setDeleteTarget(item)}><Trash2 /></Button>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary">{item.style ?? t("Unstyled", "بلا نمط")}</span>
                      <time className="text-[10px] text-muted-foreground">{new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", { month: "short", day: "numeric" }).format(new Date(item.created_at))}</time>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed">{item.prompt}</p>
                    <Button type="button" variant="ghost" size="sm" className="mt-2 w-full" onClick={() => reusePrompt(item)}><RefreshCw />{t("Reuse prompt", "إعادة استخدام الوصف")}</Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {lightbox && (
        <div role="dialog" aria-modal="true" aria-label={t("Full-size image", "الصورة بالحجم الكامل")} className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-xl" onClick={() => setLightbox(null)}>
          <Button type="button" size="icon" variant="secondary" className="absolute end-4 top-4" aria-label={t("Close", "إغلاق")} onClick={() => setLightbox(null)}><X /></Button>
          <img src={lightbox.src} alt={lightbox.prompt} className="max-h-full max-w-full rounded-xl object-contain" onClick={(event) => event.stopPropagation()} />
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete this image?", "هل تريد حذف هذه الصورة؟")}</AlertDialogTitle>
            <AlertDialogDescription>{t("It will be permanently removed from your archive and cannot be recovered.", "ستُحذف نهائياً من أرشيفك ولا يمكن استعادتها.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel", "إلغاء")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void removeImage()}>{t("Delete", "حذف")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
