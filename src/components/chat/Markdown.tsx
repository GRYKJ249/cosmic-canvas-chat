import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

function CodeBlock({ code, lang }: { code: string; lang?: string | undefined }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div dir="ltr" className="my-3 overflow-hidden rounded-xl border border-glass-border bg-background/60">
      <div className="flex items-center justify-between border-b border-glass-border px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{lang || "code"}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-[13px] leading-relaxed">
        <code className={lang ? `language-${lang}` : undefined}>{code}</code>
      </pre>
    </div>
  );
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-chat text-[15px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const text = String(children ?? "").replace(/\n$/, "");
            const match = /language-(\w+)/.exec(className ?? "");
            if (!match && !text.includes("\n")) {
              return (
                <code className="rounded bg-primary/12 px-1.5 py-0.5 font-mono text-[13px] text-primary" {...props}>
                  {text}
                </code>
              );
            }
            return <CodeBlock code={text} lang={match?.[1]} />;
          },
          pre({ children }) {
            return <>{children}</>;
          },
          a({ children, ...props }) {
            return (
              <a {...props} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">
                {children}
              </a>
            );
          },
          ul({ children }) {
            return <ul className="my-2 list-disc space-y-1 ps-5">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2 list-decimal space-y-1 ps-5">{children}</ol>;
          },
          h1({ children }) {
            return <h1 className="mt-4 mb-2 font-display text-xl font-bold">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="mt-4 mb-2 font-display text-lg font-bold">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="mt-3 mb-1.5 font-display text-base font-semibold">{children}</h3>;
          },
          p({ children }) {
            return <p className="my-2 whitespace-pre-wrap">{children}</p>;
          },
          blockquote({ children }) {
            return <blockquote className="my-3 border-s-2 border-primary/50 ps-3 text-muted-foreground">{children}</blockquote>;
          },
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return <th className="border border-glass-border px-2.5 py-1.5 text-start font-semibold">{children}</th>;
          },
          td({ children }) {
            return <td className="border border-glass-border px-2.5 py-1.5">{children}</td>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
