import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Agent Toolkit configuration.
        </p>
      </div>

      <div className="space-y-6">
        <div className="border rounded-xl p-5">
          <h2 className="font-semibold mb-3">Toolkit Info</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Runtime</span>
              <span className="font-mono">Next.js 15 + React 19</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adapter Pattern</span>
              <span className="font-mono">
                5 tools + AGENTS.md (extensible)
              </span>
            </div>
          </div>
        </div>

        <div className="border rounded-xl p-5">
          <h2 className="font-semibold mb-3">Safety Features</h2>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>Atomic writes (temp file + rename)</li>
            <li>Backup before modify (~/.agent-toolkit-backup/)</li>
            <li>JSON merge safety with key-level preservation</li>
            <li>Duplicate detection with toolkit ownership markers</li>
            <li>AGENTS.md section markers for safe merge</li>
            <li>Character limit enforcement per tool</li>
            <li>Manifest tracking for all deployed files</li>
          </ul>
        </div>

        <div className="border rounded-xl p-5">
          <h2 className="font-semibold mb-3">Supported Tools</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Claude Code
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Cursor
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Windsurf
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              OpenCode
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Codex
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              AGENTS.md (cross-tool)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
