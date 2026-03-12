"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TOOL_IDS, TOOL_LABELS, type ToolId } from "@/lib/types";
import { buildAction } from "@/lib/actions/build";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AddSkillPage() {
  const router = useRouter();
  const [selectedTools, setSelectedTools] = useState<ToolId[]>([
    "claude-code",
    "cursor",
    "windsurf",
    "opencode",
    "codex",
  ]);
  const [scope, setScope] = useState<"global" | "project">("global");
  const [installing, setInstalling] = useState(false);

  function toggleTool(toolId: ToolId) {
    setSelectedTools((prev) =>
      prev.includes(toolId)
        ? prev.filter((t) => t !== toolId)
        : [...prev, toolId]
    );
  }

  async function handleInstall() {
    setInstalling(true);
    try {
      const result = await buildAction("default", false);
      if (result.errors.length > 0) {
        toast.warning("Build completed with warnings", {
          description: result.errors.join(", "),
        });
      } else {
        toast.success("Skills built successfully", {
          description: `${result.totalSkills} skills → ${result.totalFiles} files`,
        });
      }
      router.push("/skills");
    } catch (err) {
      toast.error("Failed to install skill", { description: String(err) });
    }
    setInstalling(false);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link
          href="/skills"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Skills
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Install to Tools</h1>
        <p className="text-muted-foreground mt-1">
          Select which AI tools to deploy skills to.
        </p>
      </div>

      {/* Scope */}
      <div>
        <h2 className="text-sm font-medium mb-2">Scope</h2>
        <div className="flex gap-2">
          {(["global", "project"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                scope === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-accent"
              }`}
            >
              {s === "global" ? "Global (~/.tool)" : "Project (.tool/)"}
            </button>
          ))}
        </div>
      </div>

      {/* Tool selection */}
      <div>
        <h2 className="text-sm font-medium mb-2">Target Tools</h2>
        <div className="space-y-2">
          {TOOL_IDS.filter((id) => id !== "agents-md").map((toolId) => (
            <button
              key={toolId}
              onClick={() => toggleTool(toolId)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                selectedTools.includes(toolId)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <span className="text-sm font-medium">
                {TOOL_LABELS[toolId]}
              </span>
              {selectedTools.includes(toolId) && (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleInstall}
        disabled={installing || selectedTools.length === 0}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {installing ? "Building & Installing..." : "Build & Install"}
      </button>
    </div>
  );
}
