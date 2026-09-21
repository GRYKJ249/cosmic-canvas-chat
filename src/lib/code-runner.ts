export type RunLang = "javascript" | "python";

export type TerminalLine = {
  id: string;
  kind: "log" | "error" | "warn" | "info" | "result" | "system";
  text: string;
};

export function languageFromPath(path: string): RunLang | null {
  if (/\.(js|mjs|cjs|jsx|ts|tsx)$/i.test(path)) return "javascript";
  if (/\.py$/i.test(path)) return "python";
  return null;
}

export function displayLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    js: "JavaScript",
    mjs: "JavaScript",
    jsx: "JSX",
    ts: "TypeScript",
    tsx: "TSX",
    py: "Python",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    md: "Markdown",
    txt: "Text",
  };
  return map[ext] ?? (ext.toUpperCase() || "Text");
}

/** Strips TypeScript type annotations in a rough, best-effort way so simple TS runs as JS. */
function stripTypes(code: string) {
  return code
    .replace(/^\s*import\s+type\s.*$/gm, "")
    .replace(/^\s*(export\s+)?(interface|type)\s+\w+[\s\S]*?(\n}|;)\s*$/gm, "")
    .replace(/:\s*[A-Za-z_$][\w$<>\[\]|&,\s.]*?(?=\s*[=,)\{])/g, "")
    .replace(/\bas\s+[A-Za-z_$][\w$<>\[\]]*/g, "");
}

/**
 * Builds the HTML for a fully sandboxed iframe that runs the code and posts
 * console output back to the parent window.
 */
export function buildRunnerHtml(lang: RunLang, code: string, runId: string, isTs = false) {
  const payload = JSON.stringify(isTs ? stripTypes(code) : code);
  const rid = JSON.stringify(runId);
  const common = `
    const RID = ${rid};
    const send = (kind, text) => parent.postMessage({ source: "opera-runner", runId: RID, kind, text: String(text) }, "*");
    const fmt = (a) => { try { return typeof a === "string" ? a : JSON.stringify(a, null, 2) ?? String(a); } catch { return String(a); } };
    const done = (ms) => parent.postMessage({ source: "opera-runner", runId: RID, kind: "done", text: String(ms) }, "*");
    ["log","info","warn","error"].forEach(k => { const orig = console[k]; console[k] = (...args) => { send(k, args.map(fmt).join(" ")); orig?.apply(console, args); }; });
    window.onerror = (m, s, l, c, e) => { send("error", (e && e.stack) || m); };
    window.onunhandledrejection = (e) => { send("error", (e.reason && e.reason.stack) || String(e.reason)); };
  `;

  if (lang === "javascript") {
    return `<!doctype html><html><body><script>
      ${common}
      const code = ${payload};
      (async () => {
        const t0 = performance.now();
        try {
          const fn = new Function("return (async () => {\\n" + code + "\\n})()");
          const result = await fn();
          if (result !== undefined) send("result", fmt(result));
        } catch (e) { send("error", (e && e.stack) || String(e)); }
        done(Math.round(performance.now() - t0));
      })();
    <\/script></body></html>`;
  }

  return `<!doctype html><html><body>
    <script src="https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js"><\/script>
    <script>
      ${common}
      const code = ${payload};
      (async () => {
        const t0 = performance.now();
        try {
          send("system", "Loading Python runtime…");
          const py = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" });
          py.setStdout({ batched: (s) => send("log", s) });
          py.setStderr({ batched: (s) => send("error", s) });
          const result = await py.runPythonAsync(code);
          if (result !== undefined && result !== null) send("result", String(result));
        } catch (e) { send("error", (e && e.message) || String(e)); }
        done(Math.round(performance.now() - t0));
      })();
    <\/script></body></html>`;
}
