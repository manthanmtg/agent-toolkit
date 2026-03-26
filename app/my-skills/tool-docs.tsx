"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Sparkles,
  MousePointerClick,
  Wind,
  Terminal,
  Bot,
  Globe,
  Folder,
  FileText,
  RefreshCw,
} from "lucide-react";
import type { ToolId } from "@/lib/types";

interface ToolDoc {
  id: ToolId | "general";
  label: string;
  icon: React.ReactNode;
  sections: Array<{
    title: string;
    content: React.ReactNode;
  }>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  );
}

const DOCS: ToolDoc[] = [
  {
    id: "general",
    label: "How It Works",
    icon: <BookOpen className="w-4 h-4" />,
    sections: [
      {
        title: "Overview",
        content: (
          <div className="space-y-3">
            <p>
              Agent Toolkit manages skills as portable markdown files that get
              translated and deployed to each AI tool in its native format.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold">1. Author</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Write a single SKILL.md with YAML frontmatter + markdown body.
                  This is the source of truth.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold">2. Translate</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Each adapter converts the skill into the tool&apos;s native
                  format (rules + skills for Cursor/Windsurf, SKILL.md for Claude Code).
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-semibold">3. Deploy</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Translated files are written to the tool&apos;s skills directory
                  so the AI discovers and uses them automatically.
                </p>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Deployment Models",
        content: (
          <div className="space-y-3">
            <p>
              Different AI tools load skills in different ways. The toolkit
              handles two deployment models:
            </p>
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold">Model</th>
                  <th className="text-left py-2 pr-4 font-semibold">How it works</th>
                  <th className="text-left py-2 font-semibold">Tools</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium text-foreground">Per-skill</td>
                  <td className="py-2 pr-4">
                    Each skill is a separate <Code>SKILL.md</Code> file in a named directory.
                    Can add, update, or remove individually.
                  </td>
                  <td className="py-2">Claude Code, Cursor, Windsurf, OpenCode</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Bundled</td>
                  <td className="py-2 pr-4">
                    All skills are merged into a single <Code>AGENTS.md</Code> file.
                    Must rebuild via Sync to update.
                  </td>
                  <td className="py-2">Codex</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        title: "Skills vs Rules",
        content: (
          <div className="space-y-3">
            <p>
              Most tools distinguish between <strong>skills</strong> and <strong>rules</strong>.
              The toolkit generates both where applicable:
            </p>
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold">Type</th>
                  <th className="text-left py-2 pr-4 font-semibold">Loading</th>
                  <th className="text-left py-2 font-semibold">Best for</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium text-foreground">Skills</td>
                  <td className="py-2 pr-4">
                    Progressive disclosure — only name + description shown until invoked.
                    Keeps context lean.
                  </td>
                  <td className="py-2">Multi-step workflows, procedures with supporting files</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Rules</td>
                  <td className="py-2 pr-4">
                    Loaded into context based on activation mode
                    (always, auto, glob, manual).
                  </td>
                  <td className="py-2">Coding style, constraints, conventions</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        title: "Drift Detection",
        content: (
          <p>
            For per-skill tools, this page compares the deployed file&apos;s hash
            against what the toolkit would generate from the current source
            SKILL.md. If they differ, the skill is marked <strong>outdated</strong>.
            Click <strong>Update</strong> to re-translate and overwrite with the
            latest version. Skills found on disk that don&apos;t exist in the
            registry are marked <strong>untracked</strong>.
          </p>
        ),
      },
      {
        title: "Cross-Agent Skill Discovery",
        content: (
          <div className="space-y-3">
            <p>
              Some AI tools can read skills from other tools&apos; directories.
              For example, both <strong>Cursor</strong> and <strong>Windsurf</strong> can
              discover skills deployed to <Code>~/.claude/skills/</Code> (Claude Code&apos;s
              directory).
            </p>
            <p>
              Skills found this way appear in the <strong>Discovered via cross-agent
              compatibility</strong> section with a <strong>&quot;Shared from&quot;</strong> badge.
              They are read-only in this view — to update or remove them, manage
              them through the tool that owns them (e.g., Claude Code).
            </p>
            <p>
              This means deploying a skill to Claude Code can make it available to
              Cursor and Windsurf automatically, without separate deployment.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    id: "claude-code",
    label: "Claude Code",
    icon: <Sparkles className="w-4 h-4" />,
    sections: [
      {
        title: "Skill Locations",
        content: (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">Global</span>
                <p className="text-xs text-muted-foreground font-mono">~/.claude/skills/&lt;name&gt;/SKILL.md</p>
                <p className="text-xs text-muted-foreground">Loaded in every session across all projects.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Folder className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">Project</span>
                <p className="text-xs text-muted-foreground font-mono">.claude/skills/&lt;name&gt;/SKILL.md</p>
                <p className="text-xs text-muted-foreground">Loaded when working in that project.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">CLAUDE.md</span>
                <p className="text-xs text-muted-foreground font-mono">~/.claude/CLAUDE.md &amp; ./CLAUDE.md</p>
                <p className="text-xs text-muted-foreground">Top-level instructions loaded into system prompt.</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Activation Modes",
        content: (
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Code>model</Code> — Claude decides when to use the skill (default)</li>
            <li><Code>user-only</Code> — Only activated when user explicitly invokes</li>
            <li><Code>both</Code> — Active via both model decision and user invocation</li>
          </ul>
        ),
      },
      {
        title: "What the Toolkit Does",
        content: (
          <p className="text-sm text-muted-foreground">
            Translates each skill into Claude Code&apos;s native format with proper
            frontmatter (name, description, disable-model-invocation). Writes
            per-skill files to <Code>~/.claude/skills/</Code> for global deployment.
            Also generates a merged CLAUDE.md with all skill summaries.
          </p>
        ),
      },
    ],
  },
  {
    id: "cursor",
    label: "Cursor",
    icon: <MousePointerClick className="w-4 h-4" />,
    sections: [
      {
        title: "Skill Locations",
        content: (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">Global Skills</span>
                <p className="text-xs text-muted-foreground font-mono">~/.cursor/skills/&lt;name&gt;/SKILL.md</p>
                <p className="text-xs text-muted-foreground">Available in all workspaces. Progressive disclosure — loaded on demand.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Folder className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">Project Skills</span>
                <p className="text-xs text-muted-foreground font-mono">.cursor/skills/&lt;name&gt;/SKILL.md</p>
                <p className="text-xs text-muted-foreground">Workspace-specific. Committed with your repo.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">Project Rules</span>
                <p className="text-xs text-muted-foreground font-mono">.cursor/rules/&lt;name&gt;.mdc</p>
                <p className="text-xs text-muted-foreground">Always-loaded rules with activation modes (auto, always, glob, manual).</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Cross-Agent Compatibility",
        content: (
          <p className="text-sm text-muted-foreground">
            Cursor also discovers skills from <Code>.agents/skills/</Code>,{" "}
            <Code>.claude/skills/</Code>, and <Code>.codex/skills/</Code> directories
            (both project and user-level). This means Claude Code skills are
            automatically available in Cursor too.
          </p>
        ),
      },
      {
        title: "What the Toolkit Does",
        content: (
          <p className="text-sm text-muted-foreground">
            Generates both formats: <Code>.mdc</Code> rules for{" "}
            <Code>.cursor/rules/</Code> (with alwaysApply, description, globs) and{" "}
            <Code>SKILL.md</Code> files for <Code>~/.cursor/skills/</Code> (with
            name, description). Skills use progressive disclosure — only name and
            description are shown until the agent decides to invoke them.
          </p>
        ),
      },
    ],
  },
  {
    id: "windsurf",
    label: "Windsurf",
    icon: <Wind className="w-4 h-4" />,
    sections: [
      {
        title: "Skill Locations",
        content: (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">Global Skills</span>
                <p className="text-xs text-muted-foreground font-mono">~/.codeium/windsurf/skills/&lt;name&gt;/SKILL.md</p>
                <p className="text-xs text-muted-foreground">Available in all workspaces. Progressive disclosure.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Folder className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">Workspace Skills</span>
                <p className="text-xs text-muted-foreground font-mono">.windsurf/skills/&lt;name&gt;/SKILL.md</p>
                <p className="text-xs text-muted-foreground">Current workspace only. Committed with your repo.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">Global Rules</span>
                <p className="text-xs text-muted-foreground font-mono">~/.codeium/windsurf/global_rules.md</p>
                <p className="text-xs text-muted-foreground">Single file, max 6,000 chars. Always loaded. Built via Sync.</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Cross-Agent Compatibility",
        content: (
          <p className="text-sm text-muted-foreground">
            Windsurf also discovers skills from <Code>.agents/skills/</Code> and{" "}
            <Code>~/.agents/skills/</Code>. If Claude Code config reading is
            enabled, <Code>.claude/skills/</Code> and <Code>~/.claude/skills/</Code> are
            scanned as well.
          </p>
        ),
      },
      {
        title: "What the Toolkit Does",
        content: (
          <p className="text-sm text-muted-foreground">
            Generates both: rule files for <Code>.windsurf/rules/</Code> (with
            trigger mode) and <Code>SKILL.md</Code> files for{" "}
            <Code>~/.codeium/windsurf/skills/</Code>. Also produces a merged{" "}
            <Code>global_rules.md</Code> for the always-on global rules file.
            Skills use progressive disclosure — efficient context usage.
          </p>
        ),
      },
    ],
  },
  {
    id: "opencode",
    label: "OpenCode",
    icon: <Terminal className="w-4 h-4" />,
    sections: [
      {
        title: "Skill Locations",
        content: (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">Global</span>
                <p className="text-xs text-muted-foreground font-mono">~/.config/opencode/skills/&lt;name&gt;/SKILL.md</p>
                <p className="text-xs text-muted-foreground">Per-skill files loaded globally.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Folder className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">Project</span>
                <p className="text-xs text-muted-foreground font-mono">.opencode/skills/&lt;name&gt;/SKILL.md</p>
                <p className="text-xs text-muted-foreground">Project-level skills.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">AGENTS.md</span>
                <p className="text-xs text-muted-foreground font-mono">~/.config/opencode/AGENTS.md</p>
                <p className="text-xs text-muted-foreground">Global merged instructions file.</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Activation",
        content: (
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Code>model</Code> — The model decides when to use the skill (only option)</li>
          </ul>
        ),
      },
      {
        title: "What the Toolkit Does",
        content: (
          <p className="text-sm text-muted-foreground">
            Translates each skill with name/description frontmatter. Writes
            per-skill files to <Code>~/.config/opencode/skills/</Code>. Also
            generates a merged AGENTS.md with all skills.
          </p>
        ),
      },
    ],
  },
  {
    id: "codex",
    label: "Codex",
    icon: <Bot className="w-4 h-4" />,
    sections: [
      {
        title: "File Locations",
        content: (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">Global</span>
                <p className="text-xs text-muted-foreground font-mono">~/.codex/AGENTS.md</p>
                <p className="text-xs text-muted-foreground">
                  Single file, max 32 KiB. All skills are merged into this one file.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Folder className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-sm font-medium">Project</span>
                <p className="text-xs text-muted-foreground font-mono">./AGENTS.md</p>
                <p className="text-xs text-muted-foreground">Codex reads AGENTS.md from any directory in the project tree.</p>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Activation",
        content: (
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Code>auto</Code> — Always loaded when present (only option)</li>
          </ul>
        ),
      },
      {
        title: "What the Toolkit Does",
        content: (
          <p className="text-sm text-muted-foreground">
            Codex does not support per-skill files. The toolkit merges all
            skills into a single <Code>AGENTS.md</Code> (with a 32 KiB limit
            warning). The Sync flow rebuilds and deploys to{" "}
            <Code>~/.codex/AGENTS.md</Code>.
          </p>
        ),
      },
    ],
  },
];

export function ToolDocs() {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <BookOpen className="w-5 h-5" />
        Documentation
      </h2>
      <p className="text-sm text-muted-foreground">
        How skills are deployed and managed for each AI coding tool.
      </p>

      <div className="space-y-2">
        {DOCS.map((doc) => {
          const isExpanded = expandedDoc === doc.id;
          return (
            <div
              key={doc.id}
              className="rounded-xl border bg-card overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() =>
                  setExpandedDoc(isExpanded ? null : doc.id)
                }
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
              >
                <span className="p-1.5 rounded-lg bg-muted">
                  {doc.icon}
                </span>
                <span className="flex-1 text-sm font-semibold">
                  {doc.label}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t bg-muted/10">
                  {doc.sections.map((section) => (
                    <div key={section.title} className="pt-4">
                      <h4 className="text-sm font-semibold mb-2">
                        {section.title}
                      </h4>
                      <div className="text-sm text-muted-foreground">
                        {section.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
