import { supabase } from "@/integrations/supabase/client";

/** Records a security-relevant account event for the signed-in user. */
export async function logAuthEvent(
  userId: string,
  event: "sign_in" | "sign_up" | "sign_out_all" | "password_changed" | "api_key_created" | "api_key_revoked",
  provider?: string,
) {
  try {
    await supabase.from("auth_events").insert({
      user_id: userId,
      event,
      provider: provider ?? "email",
      user_agent: typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 400),
      platform: typeof navigator === "undefined" ? null : (navigator.platform ?? null),
    });
  } catch {
    /* auditing must never block the user */
  }
}

/** Generates a random personal API key. Only its SHA-256 hash is ever stored. */
export function generateApiKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `opera_${body}`;
}

export async function hashApiKey(key: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function describeDevice(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : /Firefox\//.test(userAgent)
            ? "Firefox"
            : "Browser";
  const os = /Android/.test(userAgent)
    ? "Android"
    : /iPhone|iPad/.test(userAgent)
      ? "iOS"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}
