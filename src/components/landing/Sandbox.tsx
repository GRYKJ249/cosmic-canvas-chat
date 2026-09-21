import { useEffect, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";

type Msg = { role: "user" | "assistant"; text: string };

const replies: Record<string, string> = {
  hello: "Hi there, explorer! I'm Opera AI. Ask me about the workspace, the themes, or the studio.",
  theme: "There are exactly 100 palettes — 10 families × 10 hues. Scroll to the swatch grid and try Cyber Neon Magenta.",
  code: "The workspace runs JavaScript and Python in a browser sandbox with a live terminal. Type /fix and I'll patch your bugs.",
  image: "The studio turns text into art with style presets, negative prompts and seed control. Inpainting included.",
  security: "Real accounts with OTP email verification, hashed passwords and a session tracker you can revoke from anywhere.",
  who: "Opera AI was engineered from the ground up by Mahgoub Abdallah Mohammed Osman.",
};

function answer(q: string) {
  const s = q.toLowerCase();
  for (const k of Object.keys(replies)) if (s.includes(k)) return replies[k];
  if (s.includes("logo")) return "The Opera AI mark combines an intelligent core with two dynamic orbital paths.";
  return "Great question. This is a preview sandbox — create an account to talk to the full multi-model engine with streaming, code execution and image generation.";
}

export function Sandbox() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", text: "Welcome aboard! Try asking about themes, code, images or security." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, typing]);

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q || typing) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setTyping(true);
    const full = answer(q) ?? "";
    setTimeout(() => {
      setTyping(false);
      let i = 0;
        setMsgs((m) => [...m, { role: "assistant", text: "" }]);
      const id = setInterval(() => {
        i += 2;
        setMsgs((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", text: full.slice(0, i) };
          return copy;
        });
        if (i >= full.length) clearInterval(id);
      }, 18);
    }, 700);
  };

  return (
    <section id="sandbox" className="relative px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="reveal mx-auto mb-10 max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">06 — Sandbox</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-5xl">Say hi before you sign up.</h2>
          <p className="mt-4 text-muted-foreground">A lightweight preview of the chat workspace, right here on the landing page.</p>
        </div>

        <div className="reveal glass-strong overflow-hidden rounded-3xl">
          <div className="flex items-center gap-3 border-b border-glass-border px-5 py-3">
            <OperaLogoMark className={`h-9 w-9 ${typing ? "animate-pulse-glow" : ""}`} />
            <div>
              <p className="text-sm font-semibold">Opera AI</p>
              <p className="font-mono text-[11px] text-muted-foreground">{typing ? "thinking…" : "online · preview mode"}</p>
            </div>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto p-5">
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.text}</div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] text-sm leading-relaxed text-foreground">{m.text}</div>
                </div>
              ),
            )}
            {typing && (
              <div className="flex gap-1 pl-1">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </div>
            )}
            <div ref={bottom} />
          </div>
          <form onSubmit={send} className="flex items-center gap-2 border-t border-glass-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about themes, code, images…"
              aria-label="Message Opera AI"
              className="min-w-0 flex-1 rounded-full bg-space-deep/50 px-4 py-2.5 text-sm outline-none ring-1 ring-glass-border placeholder:text-muted-foreground focus:ring-primary"
            />
            <button type="submit" aria-label="Send" className="btn-hero !p-3">
              <SendHorizonal className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
