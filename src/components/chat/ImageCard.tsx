import { Download, ImageOff, Loader2, Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

type ImageCardProps = {
  prompt: string;
  /** Live preview / final result as a data URL (fresh generations). */
  dataUrl?: string | undefined;
  /** Storage path for persisted images. */
  path?: string | null | undefined;
  status: "loading" | "done" | "error";
  error?: string | undefined;
};

export function ImageCard({ prompt, dataUrl, path, status, error }: ImageCardProps) {
  const { t } = useLang();
  const [signed, setSigned] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (dataUrl || !path) return;
    void supabase.storage
      .from("generations")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (!cancelled) setSigned(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [dataUrl, path]);

  const src = dataUrl ?? signed ?? undefined;

  const download = async () => {
    if (!src) return;
    const res = await fetch(src);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `opera-ai-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <figure className="glass w-full max-w-md overflow-hidden rounded-2xl">
        <div className="relative aspect-square w-full bg-background/40">
          {src ? (
            <img
              src={src}
              alt={prompt}
              className={`h-full w-full object-cover transition ${status === "loading" ? "blur-sm" : ""}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {status === "error" ? (
                <ImageOff className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              )}
            </div>
          )}

          {status === "loading" && (
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-background/70 px-3 py-2 text-xs backdrop-blur">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              {t("Generating image…", "جارٍ توليد الصورة…")}
            </div>
          )}

          {status === "done" && src && (
            <div className="absolute end-2 top-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={t("View full size", "عرض بالحجم الكامل")}
                className="glass-strong rounded-lg p-2 transition hover:border-primary/50"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void download()}
                aria-label={t("Download image", "تنزيل الصورة")}
                className="glass-strong rounded-lg p-2 transition hover:border-primary/50"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <figcaption className="px-4 py-3 text-xs text-muted-foreground">
          {status === "error" ? (error ?? t("Image generation failed", "فشل توليد الصورة")) : prompt}
        </figcaption>
      </figure>

      {open && src && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur"
        >
          <button
            type="button"
            aria-label={t("Close", "إغلاق")}
            className="glass-strong absolute end-4 top-4 rounded-lg p-2"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={src}
            alt={prompt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        </div>
      )}
    </>
  );
}
