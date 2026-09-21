import { OperaLogoMark } from "@/components/brand/OperaLogoMark";

const cols = [
  { title: "Platform", links: ["AI Chat", "Code Workspace", "Image Studio", "Theme Engine"] },
  { title: "Developers", links: ["Documentation", "API Keys", "SDK", "Status"] },
  { title: "Company", links: ["About", "Community", "Careers", "Contact"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
];

export function Footer() {
  return (
    <footer className="relative px-4 pb-10 pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="reveal glass-strong relative overflow-hidden rounded-[2rem] p-8 sm:p-14">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-3xl font-extrabold sm:text-5xl">
                Ready to leave <span className="text-gradient">orbit</span>?
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                Accounts, the full chat engine, the workspace and the studio are next on the launch schedule.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#sandbox" className="btn-hero">Try the sandbox</a>
                <a href="#themes" className="btn-ghost">Browse 100 themes</a>
              </div>
            </div>
            <OperaLogoMark className="mx-auto h-40 w-40 sm:h-56 sm:w-56" label="Opera AI" />
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-8 md:grid-cols-4">
          {cols.map((c) => (
            <div key={c.title}>
              <p className="font-display text-sm font-bold">{c.title}</p>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#top" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-glass-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Opera AI. Developed by Mahgoub Abdallah Mohammed Osman.</p>
          <p className="font-mono">v0.1 · landing orbit</p>
        </div>
      </div>
    </footer>
  );
}
