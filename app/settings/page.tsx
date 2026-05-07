import { Info, ShieldCheck, Wrench, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Agent Toolkit configuration.
        </p>
      </div>

      <div className="space-y-6 max-w-3xl">
        <div className="border rounded-xl p-6 bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Toolkit Info</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b last:border-0 border-border/50">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">0.1.0</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b last:border-0 border-border/50">
              <span className="text-muted-foreground">Runtime</span>
              <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">Next.js 15 + React 19</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b last:border-0 border-border/50">
              <span className="text-muted-foreground">Adapter Pattern</span>
              <span className="font-mono text-xs text-right max-w-[200px]">
                5 tools + AGENTS.md (extensible)
              </span>
            </div>
          </div>
        </div>

        <div className="border rounded-xl p-6 bg-card">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Safety Features</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "Atomic writes (temp file + rename)",
              "Backup before modify (~/.agent-toolkit-backup/)",
              "JSON merge safety (key-level preservation)",
              "Duplicate detection with ownership markers",
              "AGENTS.md section markers for safe merge",
              "Character limit enforcement per tool",
              "Manifest tracking for all deployed files",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-success shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border rounded-xl p-6 bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Supported Tools</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "Claude Code", status: "stable" },
              { name: "Cursor", status: "stable" },
              { name: "Windsurf", status: "stable" },
              { name: "OpenCode", status: "stable" },
              { name: "Codex", status: "stable" },
              { name: "AGENTS.md", status: "cross-tool" },
            ].map((tool) => (
              <div
                key={tool.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/50 text-sm font-medium"
              >
                <div className={`w-2 h-2 rounded-full ${tool.status === "stable" ? "bg-success" : "bg-blue-500"}`} />
                {tool.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
