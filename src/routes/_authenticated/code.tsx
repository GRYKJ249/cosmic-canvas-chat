import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import {
  Bot,
  Bug,
  ChevronDown,
  ChevronRight,
  Download,
  FileCode2,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  LayoutDashboard,
  Loader2,
  Menu,
  Pencil,
  Play,
  Save,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/lib/i18n";
import { Markdown } from "@/components/chat/Markdown";
import {
  buildRunnerHtml,
  displayLanguage,
  languageFromPath,
  type TerminalLine,
} from "@/lib/code-runner";

export const Route = createFileRoute("/_authenticated/code")({
  head: () => ({
    meta: [
      { title: "Code Workspace — Opera AI" },
      {
        name: "description",
        content: "Cloud IDE with a multi-file editor, live terminal for JavaScript and Python, and an AI refactoring assistant.",
      },
      { property: "og:title", content: "Code Workspace — Opera AI" },
      {
        property: "og:description",
        content: "Cloud IDE with a multi-file editor, live terminal for JavaScript and Python, and an AI refactoring assistant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CodeWorkspace,
});

type WorkspaceFile = { id: string; path: string; content: string; updated_at: string };

const STARTER_FILES: Array<{ path: string; content: string }> = [
  {
    path: "src/main.js",
    content: `// Welcome to the Opera AI Code Workspace 🐾
// Press Ctrl+Enter (⌘+Enter) to run this file in the live terminal.

const planets = ["Mercury", "Venus", "Earth", "Mars"];

function orbit(name, index) {
  const speed = (index + 1) * 12.5;
  return \`\${name} orbits at \${speed} km/s\`;
}

planets.forEach((p, i) => console.log(orbit(p, i)));

const total = planets.reduce((sum, p) => sum + p.length, 0);
console.info("Total characters:", total);

// The value of the last expression is shown as the result:
total * 2;
`,
  },
  {
    path: "src/hello.py",
    content: `# Python runs right in your browser (first run downloads the runtime).
import math

def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

for i in range(10):
    print(f"fib({i}) = {fib(i)}")

print("pi ≈", round(math.pi, 5))
`,
  },
  {
    path: "README.md",
    content: `# My Opera AI project

- Files auto-save to your Opera AI account.
- Select code and use the AI panel to explain, refactor or fix it.
- Download everything as a ZIP any time.
`,
  },
];

const EDITOR_THEMES = {
  opera: { name: "Opera", bg: "oklch(0.16 0.03 260)", fg: "oklch(0.93 0.01 250)", gutter: "oklch(0.55 0.02 250)", line: "oklch(0.22 0.03 260)" },
  dracula: { name: "Dracula", bg: "oklch(0.27 0.03 285)", fg: "oklch(0.95 0.01 90)", gutter: "oklch(0.6 0.05 285)", line: "oklch(0.33 0.03 285)" },
  monokai: { name: "Monokai", bg: "oklch(0.27 0.01 100)", fg: "oklch(0.95 0.02 100)", gutter: "oklch(0.6 0.01 100)", line: "oklch(0.34 0.01 100)" },
  nord: { name: "Nord", bg: "oklch(0.32 0.03 260)", fg: "oklch(0.92 0.02 230)", gutter: "oklch(0.62 0.04 250)", line: "oklch(0.38 0.03 260)" },
} as const;
type EditorTheme = keyof typeof EDITOR_THEMES;

type TreeNode = { name: string; path: string; children?: TreeNode[]; file?: WorkspaceFile };

function buildTree(files: WorkspaceFile[], folders: Set<string>): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [] };
  const ensureFolder = (parts: string[]) => {
    let node = root;
    let acc = "";
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      let next = node.children!.find((c) => c.children && c.name === part);
      if (!next) {
        next = { name: part, path: acc, children: [] };
        node.children!.push(next);
      }
      node = next;
    }
    return node;
  };
  folders.forEach((f) => ensureFolder(f.split("/")));
  for (const file of files) {
    const parts = file.path.split("/");
    const name = parts.pop()!;
    const parent = ensureFolder(parts);
    parent.children!.push({ name, path: file.path, file });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.children ? 0 : 1) - (b.children ? 0 : 1) || a.name.localeCompare(b.name));
    nodes.forEach((n) => n.children && sort(n.children));
  };
  sort(root.children!);
  return root.children!;
}

let lineCounter = 0;
const mkLine = (kind: TerminalLine["kind"], text: string): TerminalLine => ({ id: `${Date.now()}-${lineCounter++}`, kind, text });

function CodeWorkspace() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [extraFolders, setExtraFolders] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [terminal, setTerminal] = useState<TerminalLine[]>([mkLine("system", "Opera AI terminal ready. Ctrl+Enter to run, Ctrl+S to save.")]);
  const [running, setRunning] = useState(false);
  const [editorTheme, setEditorTheme] = useState<EditorTheme>("opera");
  const [aiOutput, setAiOutput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const runnerRef = useRef<HTMLIFrameElement | null>(null);
  const runIdRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("opera-editor-theme") as EditorTheme | null;
    if (stored && stored in EDITOR_THEMES) setEditorTheme(stored);
  }, []);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["workspace-files", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_files")
        .select("id, path, content, updated_at")
        .eq("user_id", user!.id)
        .order("path");
      if (error) throw error;
      if (data && data.length === 0) {
        const { data: seeded, error: seedErr } = await supabase
          .from("workspace_files")
          .insert(STARTER_FILES.map((f) => ({ ...f, user_id: user!.id })))
          .select("id, path, content, updated_at");
        if (seedErr) throw seedErr;
        return (seeded ?? []) as WorkspaceFile[];
      }
      return (data ?? []) as WorkspaceFile[];
    },
  });

  useEffect(() => {
    if (files.length && !activePath) {
      const first = files.find((f) => f.path === "src/main.js") ?? files[0];
      if (!first) return;
      setOpenTabs([first.path]);
      setActivePath(first.path);
    }
  }, [files, activePath]);

  const fileMap = useMemo(() => Object.fromEntries(files.map((f) => [f.path, f])), [files]);
  const tree = useMemo(() => buildTree(files, extraFolders), [files, extraFolders]);
  const activeFile = activePath ? fileMap[activePath] : undefined;
  const activeContent = activePath ? (drafts[activePath] ?? activeFile?.content ?? "") : "";
  const activeLang = activePath ? languageFromPath(activePath) : null;

  const persist = useCallback(
    async (path: string, content: string) => {
      if (!user) return;
      setSaving(true);
      const { error } = await supabase
        .from("workspace_files")
        .upsert({ user_id: user.id, path, content }, { onConflict: "user_id,path" });
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setDirty((d) => {
        const n = new Set(d);
        n.delete(path);
        return n;
      });
      queryClient.setQueryData<WorkspaceFile[]>(["workspace-files", user.id], (old) =>
        (old ?? []).map((f) => (f.path === path ? { ...f, content } : f)),
      );
    },
    [user, queryClient],
  );

  const updateContent = (value: string) => {
    if (!activePath) return;
    setDrafts((d) => ({ ...d, [activePath]: value }));
    setDirty((d) => new Set(d).add(activePath));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(activePath, value), 1500);
  };

  const saveNow = useCallback(() => {
    if (!activePath) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    void persist(activePath, drafts[activePath] ?? activeFile?.content ?? "");
    toast.success(t("Saved", "تم الحفظ"));
  }, [activePath, drafts, activeFile, persist, t]);

  const openFile = (path: string) => {
    setOpenTabs((tabs) => (tabs.includes(path) ? tabs : [...tabs, path]));
    setActivePath(path);
    setSidebarOpen(false);
  };

  const closeTab = (path: string) => {
    setOpenTabs((tabs) => {
      const next = tabs.filter((p) => p !== path);
      if (activePath === path) setActivePath(next[next.length - 1] ?? null);
      return next;
    });
  };

  const createFile = async (folder = "") => {
    if (!user) return;
    const name = window.prompt(t("File name (e.g. utils.js)", "اسم الملف (مثال utils.js)"));
    if (!name?.trim()) return;
    const path = folder ? `${folder}/${name.trim()}` : name.trim();
    if (fileMap[path]) { toast.error(t("File already exists", "الملف موجود مسبقاً")); return; }
    const { data, error } = await supabase
      .from("workspace_files")
      .insert({ user_id: user.id, path, content: "" })
      .select("id, path, content, updated_at")
      .single();
    if (error) { toast.error(error.message); return; }
    queryClient.setQueryData<WorkspaceFile[]>(["workspace-files", user.id], (old) => [...(old ?? []), data as WorkspaceFile]);
    openFile(path);
  };

  const createFolder = (parent = "") => {
    const name = window.prompt(t("Folder name", "اسم المجلد"));
    if (!name?.trim()) return;
    const path = parent ? `${parent}/${name.trim()}` : name.trim();
    setExtraFolders((s) => new Set(s).add(path));
  };

  const renameFile = async (file: WorkspaceFile) => {
    if (!user) return;
    const next = window.prompt(t("New path", "المسار الجديد"), file.path);
    if (!next?.trim() || next === file.path) return;
    const { error } = await supabase.from("workspace_files").update({ path: next.trim() }).eq("id", file.id);
    if (error) { toast.error(error.message); return; }
    queryClient.setQueryData<WorkspaceFile[]>(["workspace-files", user.id], (old) =>
      (old ?? []).map((f) => (f.id === file.id ? { ...f, path: next.trim() } : f)),
    );
    setOpenTabs((tabs) => tabs.map((p) => (p === file.path ? next.trim() : p)));
    if (activePath === file.path) setActivePath(next.trim());
    setDrafts((d) => {
      const { [file.path]: v, ...rest } = d;
      return v === undefined ? rest : { ...rest, [next.trim()]: v };
    });
  };

  const deleteFile = async (file: WorkspaceFile) => {
    if (!user) return;
    if (!window.confirm(t(`Delete ${file.path}?`, `حذف ${file.path}؟`))) return;
    const { error } = await supabase.from("workspace_files").delete().eq("id", file.id);
    if (error) { toast.error(error.message); return; }
    queryClient.setQueryData<WorkspaceFile[]>(["workspace-files", user.id], (old) => (old ?? []).filter((f) => f.id !== file.id));
    closeTab(file.path);
  };

  const importDropped = async (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!user) return;
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.size < 512_000);
    if (!dropped.length) return;
    const rows = await Promise.all(dropped.map(async (f) => ({ user_id: user.id, path: `imports/${f.name}`, content: await f.text() })));
    const { data, error } = await supabase
      .from("workspace_files")
      .upsert(rows, { onConflict: "user_id,path" })
      .select("id, path, content, updated_at");
    if (error) { toast.error(error.message); return; }
    void queryClient.invalidateQueries({ queryKey: ["workspace-files", user.id] });
    toast.success(t(`Imported ${data?.length ?? 0} file(s)`, `تم استيراد ${data?.length ?? 0} ملف`));
    if (data?.[0]) openFile(data[0].path);
  };

  const downloadZip = async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    files.forEach((f) => zip.file(f.path, drafts[f.path] ?? f.content));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opera-ai-project.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Runner ----------
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.source !== "opera-runner" || d.runId !== runIdRef.current) return;
      if (d.kind === "done") {
        setTerminal((l) => [...l, mkLine("system", `✓ ${t("Finished in", "انتهى خلال")} ${d.text} ms`)]);
        setRunning(false);
        runIdRef.current = null;
        return;
      }
      setTerminal((l) => [...l, mkLine(d.kind, d.text)]);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [t]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ block: "end" });
  }, [terminal]);

  const stopRun = useCallback(() => {
    if (runnerRef.current) runnerRef.current.srcdoc = "";
    runIdRef.current = null;
    setRunning(false);
    setTerminal((l) => [...l, mkLine("system", t("■ Stopped", "■ تم الإيقاف"))]);
  }, [t]);

  const run = useCallback(() => {
    if (!activePath || !activeLang) {
      toast.error(t("Only .js/.ts and .py files can run", "يمكن تشغيل ملفات .js/.ts و .py فقط"));
      return;
    }
    if (running) stopRun();
    const id = `${Date.now()}`;
    runIdRef.current = id;
    setRunning(true);
    setTerminal((l) => [...l, mkLine("system", `▶ ${activePath}`)]);
    const isTs = /\.tsx?$/.test(activePath);
    if (runnerRef.current) runnerRef.current.srcdoc = buildRunnerHtml(activeLang, activeContent, id, isTs);
  }, [activePath, activeLang, activeContent, running, stopRun, t]);

  // ---------- Keybindings ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "s") {
        e.preventDefault();
        saveNow();
      } else if (e.key === "Enter") {
        e.preventDefault();
        run();
      } else if (e.key === "b") {
        e.preventDefault();
        setSidebarOpen((o) => !o);
      } else if (e.key === "k") {
        e.preventDefault();
        setTerminal([mkLine("system", t("Terminal cleared.", "تم مسح الطرفية."))]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNow, run, t]);

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const { selectionStart, selectionEnd, value } = ta;
      const next = value.slice(0, selectionStart) + "  " + value.slice(selectionEnd);
      updateContent(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = selectionStart + 2;
      });
    }
  };

  // ---------- AI assistant ----------
  const askAi = async (action: "explain" | "refactor" | "fix" | "ask") => {
    if (!activePath) return;
    const ta = textareaRef.current;
    const selection = ta && ta.selectionStart !== ta.selectionEnd ? activeContent.slice(ta.selectionStart, ta.selectionEnd) : "";
    const code = selection || activeContent;
    if (!code.trim()) { toast.error(t("Nothing to analyse", "لا يوجد كود لتحليله")); return; }
    aiAbort.current?.abort();
    const controller = new AbortController();
    aiAbort.current = controller;
    setAiOpen(true);
    setAiBusy(true);
    setAiOutput("");
    try {
      const res = await fetch("/api/code-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          action,
          code,
          filename: activePath,
          language: displayLanguage(activePath),
          instruction: action === "ask" ? aiQuestion : undefined,
          terminal: action === "fix" ? terminal.filter((l) => l.kind === "error").map((l) => l.text).join("\n").slice(-4000) : undefined,
        }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setAiOutput(acc);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error((err as Error).message || t("AI request failed", "فشل طلب الذكاء الاصطناعي"));
    } finally {
      setAiBusy(false);
    }
  };

  const firstCodeBlock = useMemo(() => {
    const m = aiOutput.match(/```[\w+-]*\n([\s\S]*?)```/);
    return m?.[1] ?? null;
  }, [aiOutput]);

  const applyAiCode = () => {
    if (!firstCodeBlock || !activePath) return;
    updateContent(firstCodeBlock.replace(/\n$/, ""));
    toast.success(t("Applied to editor", "تم التطبيق في المحرر"));
  };

  const lineCount = activeContent.split("\n").length;
  const theme = EDITOR_THEMES[editorTheme];

  // ---------- Tree renderer ----------
  const renderNodes = (nodes: TreeNode[], depth = 0) =>
    nodes.map((node) => {
      const pad = { paddingInlineStart: `${8 + depth * 14}px` };
      if (node.children) {
        const isCollapsed = collapsed.has(node.path);
        return (
          <div key={node.path}>
            <div className="group flex items-center gap-1 rounded-md py-1 pe-1 text-sm hover:bg-accent/40" style={pad}>
              <button
                type="button"
                className="flex flex-1 items-center gap-1.5 text-start"
                onClick={() =>
                  setCollapsed((s) => {
                    const n = new Set(s);
                    isCollapsed ? n.delete(node.path) : n.add(node.path);
                    return n;
                  })
                }
              >
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {isCollapsed ? <Folder className="h-4 w-4 text-primary" /> : <FolderOpen className="h-4 w-4 text-primary" />}
                <span className="truncate">{node.name}</span>
              </button>
              <button type="button" title={t("New file", "ملف جديد")} onClick={() => void createFile(node.path)} className="rounded p-1 opacity-0 hover:bg-accent group-hover:opacity-100">
                <FilePlus2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {!isCollapsed && renderNodes(node.children, depth + 1)}
          </div>
        );
      }
      const active = node.path === activePath;
      return (
        <div
          key={node.path}
          className={`group flex items-center gap-1 rounded-md py-1 pe-1 text-sm ${active ? "bg-primary/15 text-primary" : "hover:bg-accent/40"}`}
          style={pad}
        >
          <button type="button" className="flex flex-1 items-center gap-1.5 truncate text-start" onClick={() => openFile(node.path)}>
            <FileCode2 className="h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">{node.name}</span>
            {dirty.has(node.path) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </button>
          <button type="button" onClick={() => void renameFile(node.file!)} className="rounded p-1 opacity-0 hover:bg-accent group-hover:opacity-100" title={t("Rename", "إعادة تسمية")}>
            <Pencil className="h-3 w-3" />
          </button>
          <button type="button" onClick={() => void deleteFile(node.file!)} className="rounded p-1 opacity-0 hover:bg-destructive/20 group-hover:opacity-100" title={t("Delete", "حذف")}>
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      );
    });

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-e border-glass-border bg-card/60 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-glass-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Explorer", "المستكشف")}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void createFile()} className="rounded p-1.5 hover:bg-accent" title={t("New file", "ملف جديد")}>
            <FilePlus2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => createFolder()} className="rounded p-1.5 hover:bg-accent" title={t("New folder", "مجلد جديد")}>
            <FolderPlus className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setSidebarOpen(false)} className="rounded p-1.5 hover:bg-accent md:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        className={`flex-1 overflow-y-auto p-2 ${dragOver ? "outline-dashed outline-2 outline-primary/60" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => void importDropped(e)}
      >
        {isLoading ? <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin text-primary" /> : renderNodes(tree)}
        <p className="mt-6 px-2 text-center text-[11px] text-muted-foreground">{t("Drop files here to import", "أفلت الملفات هنا للاستيراد")}</p>
      </div>
      <div className="border-t border-glass-border p-3">
        <Link to="/dashboard" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <LayoutDashboard className="h-3.5 w-3.5" /> {t("Dashboard", "لوحة التحكم")}
        </Link>
      </div>
    </aside>
  );

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center gap-2 border-b border-glass-border bg-card/60 px-2 py-1.5 backdrop-blur-xl md:px-3">
        <button type="button" onClick={() => setSidebarOpen(true)} className="rounded p-1.5 hover:bg-accent md:hidden" aria-label="menu">
          <Menu className="h-5 w-5" />
        </button>
        <OperaLogoMark className="hidden h-7 w-7 sm:block" />
        <span className="hidden text-sm font-semibold sm:block">Opera AI · {t("Code", "الأكواد")}</span>
        <div className="mx-1 hidden h-5 w-px bg-glass-border sm:block" />
        <button
          type="button"
          onClick={running ? stopRun : run}
          className="btn-hero !gap-1.5 !px-3 !py-1.5 !text-xs"
        >
          {running ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {running ? t("Stop", "إيقاف") : t("Run", "تشغيل")}
        </button>
        <button type="button" onClick={saveNow} className="btn-ghost !gap-1.5 !px-3 !py-1.5 !text-xs">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{t("Save", "حفظ")}</span>
        </button>
        <button type="button" onClick={() => void downloadZip()} className="btn-ghost !gap-1.5 !px-3 !py-1.5 !text-xs">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">ZIP</span>
        </button>
        <div className="ms-auto flex items-center gap-2">
          <select
            value={editorTheme}
            onChange={(e) => {
              const v = e.target.value as EditorTheme;
              setEditorTheme(v);
              window.localStorage.setItem("opera-editor-theme", v);
            }}
            className="rounded-md border border-glass-border bg-transparent px-2 py-1 text-xs"
            aria-label="editor theme"
          >
            {Object.entries(EDITOR_THEMES).map(([k, v]) => (
              <option key={k} value={k} className="bg-card text-foreground">
                {v.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAiOpen((o) => !o)}
            className={`btn-ghost !gap-1.5 !px-3 !py-1.5 !text-xs ${aiOpen ? "!border-primary/60 !text-primary" : ""}`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("AI", "الذكاء")}</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar (desktop) */}
        <div className="hidden md:block">{sidebar}</div>
        {/* Sidebar (mobile drawer) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="relative z-10 h-full">{sidebar}</div>
          </div>
        )}

        {/* Editor + terminal */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Tabs */}
          <div className="flex items-stretch overflow-x-auto border-b border-glass-border bg-card/40 text-xs">
            {openTabs.map((p) => (
              <div
                key={p}
                className={`flex shrink-0 items-center gap-1.5 border-e border-glass-border ${p === activePath ? "bg-background text-foreground" : "text-muted-foreground hover:bg-accent/30"}`}
              >
                <button type="button" onClick={() => setActivePath(p)} className="flex items-center gap-1.5 py-2 ps-3">
                  <FileCode2 className="h-3.5 w-3.5 opacity-70" />
                  {p.split("/").pop()}
                  {dirty.has(p) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
                <button type="button" onClick={() => closeTab(p)} className="me-1 rounded p-0.5 hover:bg-accent" aria-label="close tab">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {openTabs.length === 0 && <span className="px-3 py-2 text-muted-foreground">{t("Open a file from the explorer", "افتح ملفاً من المستكشف")}</span>}
          </div>

          {/* Editor */}
          <div className="relative flex min-h-0 flex-1" style={{ background: theme.bg, color: theme.fg }}>
            {activePath ? (
              <>
                <div
                  ref={gutterRef}
                  aria-hidden
                  className="select-none overflow-hidden py-3 pe-2 ps-3 text-end font-mono text-[13px] leading-6"
                  style={{ color: theme.gutter, background: theme.line, minWidth: 44 }}
                >
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  dir="ltr"
                  value={activeContent}
                  onChange={(e) => updateContent(e.target.value)}
                  onKeyDown={onEditorKeyDown}
                  onScroll={(e) => {
                    if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
                  }}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="flex-1 resize-none bg-transparent px-3 py-3 font-mono text-[13px] leading-6 outline-none"
                  style={{ color: theme.fg, tabSize: 2, whiteSpace: "pre", overflowWrap: "normal", overflowX: "auto" }}
                />
                <div className="pointer-events-none absolute bottom-2 end-3 rounded-md bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground backdrop-blur">
                  {displayLanguage(activePath)} · {lineCount} {t("lines", "سطر")} {dirty.has(activePath) ? "· ●" : ""}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <OperaLogoMark className="h-28 w-28 opacity-90" label="Opera AI" />
                <p className="text-sm text-muted-foreground">{t("Pick a file or create a new one to start coding.", "اختر ملفاً أو أنشئ ملفاً جديداً لتبدأ البرمجة.")}</p>
              </div>
            )}
          </div>

          {/* Terminal */}
          <section className="flex h-44 flex-col border-t border-glass-border bg-card/70 backdrop-blur-xl md:h-52">
            <div className="flex items-center gap-2 border-b border-glass-border px-3 py-1 text-xs">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold uppercase tracking-wider text-muted-foreground">{t("Terminal", "الطرفية")}</span>
              {running && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
              <button
                type="button"
                onClick={() => setTerminal([mkLine("system", t("Terminal cleared.", "تم مسح الطرفية."))])}
                className="ms-auto text-muted-foreground hover:text-foreground"
              >
                {t("Clear", "مسح")}
              </button>
            </div>
            <div dir="ltr" className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-5">
              {terminal.map((l) => (
                <pre
                  key={l.id}
                  className={`whitespace-pre-wrap break-words ${
                    l.kind === "error"
                      ? "text-destructive"
                      : l.kind === "warn"
                        ? "text-chart-4"
                        : l.kind === "result"
                          ? "text-primary"
                          : l.kind === "system"
                            ? "text-muted-foreground"
                            : ""
                  }`}
                >
                  {l.kind === "result" ? "← " : ""}
                  {l.text}
                </pre>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </section>
        </main>

        {/* AI panel */}
        {aiOpen && (
          <aside className="fixed inset-y-0 end-0 z-30 flex w-full max-w-md flex-col border-s border-glass-border bg-card/90 backdrop-blur-2xl md:static md:w-96 md:bg-card/60">
            <div className="flex items-center gap-2 border-b border-glass-border px-3 py-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t("AI assistant", "المساعد الذكي")}</span>
              <button type="button" onClick={() => setAiOpen(false)} className="ms-auto rounded p-1 hover:bg-accent" aria-label="close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              <button type="button" disabled={aiBusy || !activePath} onClick={() => void askAi("explain")} className="btn-ghost !flex-col !gap-1 !px-2 !py-2 !text-xs disabled:opacity-50">
                <Bot className="h-4 w-4" /> {t("Explain", "اشرح")}
              </button>
              <button type="button" disabled={aiBusy || !activePath} onClick={() => void askAi("refactor")} className="btn-ghost !flex-col !gap-1 !px-2 !py-2 !text-xs disabled:opacity-50">
                <Wand2 className="h-4 w-4" /> {t("Refactor", "حسّن")}
              </button>
              <button type="button" disabled={aiBusy || !activePath} onClick={() => void askAi("fix")} className="btn-ghost !flex-col !gap-1 !px-2 !py-2 !text-xs disabled:opacity-50">
                <Bug className="h-4 w-4" /> {t("Fix bugs", "أصلح")}
              </button>
            </div>
            <form
              className="flex gap-2 px-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (aiQuestion.trim()) void askAi("ask");
              }}
            >
              <input
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder={t("Ask about this file…", "اسأل عن هذا الملف…")}
                className="flex-1 rounded-md border border-glass-border bg-background/40 px-3 py-1.5 text-sm outline-none focus:border-primary/60"
              />
              <button type="submit" disabled={aiBusy || !aiQuestion.trim()} className="btn-hero !px-3 !py-1.5 !text-xs disabled:opacity-50">
                {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("Ask", "اسأل")}
              </button>
            </form>
            <p className="px-3 pt-2 text-[11px] text-muted-foreground">
              {t("Tip: select a part of the code to focus the AI on it.", "نصيحة: حدّد جزءاً من الكود ليركّز عليه المساعد.")}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 text-sm">
              {aiOutput ? (
                <Markdown content={aiOutput} />
              ) : (
                <div className="flex flex-col items-center gap-2 pt-8 text-center text-muted-foreground">
                  <OperaLogoMark className="h-20 w-20" label="Opera AI" />
                  <p className="text-xs">{t("Explain, refactor or fix your code with one click.", "اشرح كودك أو حسّنه أو أصلحه بنقرة واحدة.")}</p>
                </div>
              )}
            </div>
            {firstCodeBlock && !aiBusy && (
              <div className="border-t border-glass-border p-3">
                <button type="button" onClick={applyAiCode} className="btn-hero w-full !py-2 !text-xs">
                  <Wand2 className="h-3.5 w-3.5" /> {t("Apply code to editor", "تطبيق الكود في المحرر")}
                </button>
              </div>
            )}
          </aside>
        )}
      </div>

      <iframe ref={runnerRef} title="runner" sandbox="allow-scripts" className="hidden" />
    </div>
  );
}
