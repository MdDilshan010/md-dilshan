import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { explainCode, type Level, type LineExplanation } from "@/lib/explain.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Linewise — AI Code Explainer" },
      { name: "description", content: "Paste code and get a line-by-line explanation at beginner, intermediate or expert level." },
      { property: "og:title", content: "Linewise — AI Code Explainer" },
      { property: "og:description", content: "Line-by-line AI code explanations at your level." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Result = { language: string; summary: string; lines: LineExplanation[] };
type HistoryItem = { id: string; code: string; level: Level; createdAt: number; result: Result };

const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "beginner", label: "Beginner", hint: "plain words" },
  { id: "intermediate", label: "Intermediate", hint: "concepts" },
  { id: "expert", label: "Expert", hint: "terse & deep" },
];
const STORAGE = "linewise-history";

function Index() {
  const explain = useServerFn(explainCode);
  const [code, setCode] = useState("");
  const [level, setLevel] = useState<Level>("beginner");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(STORAGE) ?? "[]"));
    } catch {}
  }, []);

  const save = (items: HistoryItem[]) => {
    setHistory(items);
    localStorage.setItem(STORAGE, JSON.stringify(items));
  };

  async function run() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await explain({ data: { code, level } });
      setResult(r);
      const item: HistoryItem = { id: crypto.randomUUID(), code, level, createdAt: Date.now(), result: r };
      setActiveId(item.id);
      save([item, ...history].slice(0, 30));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function open(item: HistoryItem) {
    setCode(item.code);
    setLevel(item.level);
    setResult(item.result);
    setActiveId(item.id);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xl font-bold text-primary">{"</>"}</span>
            <h1 className="font-display text-xl font-bold tracking-tight">Linewise</h1>
            <span className="hidden text-sm text-muted-foreground sm:inline">AI code explainer</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="order-2 lg:order-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">History</h2>
            {history.length > 0 && (
              <button onClick={() => save([])} className="text-xs text-muted-foreground hover:text-destructive">
                Clear
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your past explanations appear here.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="group relative">
                  <button
                    onClick={() => open(h)}
                    className={`w-full rounded-md border p-3 text-left transition-colors ${
                      activeId === h.id ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="truncate font-mono text-xs text-foreground">{h.code.split("\n")[0]}</div>
                    <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                      <span className="capitalize">{h.level} · {h.result.language}</span>
                      <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                  <button
                    aria-label="Delete"
                    onClick={() => save(history.filter((x) => x.id !== h.id))}
                    className="absolute right-2 top-2 hidden text-xs text-muted-foreground hover:text-destructive group-hover:block"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="order-1 space-y-6 lg:order-2">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="font-mono text-xs text-muted-foreground">paste your code</span>
              {code && (
                <button onClick={() => { setCode(""); setResult(null); setActiveId(null); }} className="text-xs text-muted-foreground hover:text-foreground">
                  New
                </button>
              )}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              placeholder={"function greet(name) {\n  return `Hello, ${name}!`;\n}"}
              className="h-64 w-full resize-y bg-transparent p-4 font-mono text-sm leading-6 outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-md border border-border bg-card p-1">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className={`rounded px-4 py-2 text-sm transition-colors ${
                    level === l.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="font-medium">{l.label}</span>
                  <span className="ml-2 hidden text-xs opacity-70 md:inline">{l.hint}</span>
                </button>
              ))}
            </div>
            <button
              onClick={run}
              disabled={loading || !code.trim()}
              className="ml-auto rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {loading ? "Explaining…" : "Explain line by line →"}
            </button>
          </div>

          {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          {loading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />)}
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              {result.summary && (
                <div className="rounded-lg border-l-4 border-primary bg-secondary p-4">
                  <div className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">{result.language} · overview</div>
                  <p className="text-sm leading-relaxed">{result.summary}</p>
                </div>
              )}
              <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {result.lines.map((l, i) => (
                  <li key={i} className="grid gap-2 p-4 md:grid-cols-[48px_minmax(0,1fr)_minmax(0,1.2fr)] md:gap-4">
                    <span className="font-mono text-xs text-muted-foreground">{l.line}</span>
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm text-primary">{l.code}</pre>
                    <p className="text-sm leading-relaxed text-foreground/90">{l.explanation}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
