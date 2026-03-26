"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  Sparkles,
  MousePointerClick,
  Wind,
  Bot,
} from "lucide-react";
import type { ToolId } from "@/lib/types";

interface DocSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  sections: Array<{ title: string; content: React.ReactNode }>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  );
}

const DOCS: DocSection[] = [
  {
    id: "general",
    label: "What is MCP?",
    icon: <BookOpen className="w-4 h-4" />,
    sections: [
      {
        title: "Overview",
        content: (
          <div className="space-y-3">
            <p>
              The <strong>Model Context Protocol (MCP)</strong> is an open standard that lets AI
              coding tools connect to external services — databases, APIs, file systems,
              cloud providers — through a unified server interface.
            </p>
            <p>
              Each MCP server exposes <strong>tools</strong> (actions the AI can call),{" "}
              <strong>resources</strong> (data the AI can read), and{" "}
              <strong>prompts</strong> (templates the AI can use). The AI tool discovers
              these capabilities at startup and makes them available during your session.
            </p>
          </div>
        ),
      },
      {
        title: "Transport Types",
        content: (
          <div className="space-y-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold">Transport</th>
                  <th className="text-left py-2 pr-4 font-semibold">How it works</th>
                  <th className="text-left py-2 font-semibold">Use case</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium text-foreground">stdio</td>
                  <td className="py-2 pr-4">
                    Spawns a local process, communicates via stdin/stdout
                  </td>
                  <td className="py-2">Local tools, file access, CLI wrappers</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium text-foreground">SSE</td>
                  <td className="py-2 pr-4">
                    Connects to a remote HTTP endpoint using Server-Sent Events
                  </td>
                  <td className="py-2">Remote APIs, cloud services</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Streamable HTTP</td>
                  <td className="py-2 pr-4">
                    Uses HTTP POST with streaming responses
                  </td>
                  <td className="py-2">Modern remote servers, bidirectional streaming</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        title: "Scopes",
        content: (
          <div className="space-y-3">
            <p>
              MCP servers can be configured at different scopes. The exact scopes
              depend on the AI tool:
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-semibold">Scope</th>
                  <th className="text-left py-2 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b">
                  <td className="py-2 pr-4 font-medium text-foreground">User / Global</td>
                  <td className="py-2">Available in all projects. Stored in a home-directory config file.</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Project</td>
                  <td className="py-2">
                    Available only in a specific project. Stored in the project directory
                    (e.g., <Code>.mcp.json</Code>, <Code>.cursor/mcp.json</Code>).
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground">
              This page shows <strong>user/global</strong> MCP servers. Project-level
              servers are specific to each workspace.
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
        title: "Config Location",
        content: (
          <div className="space-y-2">
            <p>
              User-level MCP servers: <Code>~/.claude.json</Code> under the{" "}
              <Code>mcpServers</Code> key.
            </p>
            <p>
              Project-level: <Code>.mcp.json</Code> in the project root.
            </p>
          </div>
        ),
      },
      {
        title: "Adding Servers",
        content: (
          <div className="space-y-2">
            <p>Use the CLI to add MCP servers:</p>
            <div className="bg-muted rounded-lg px-3 py-2 font-mono text-xs space-y-1">
              <p><span className="text-muted-foreground select-none">$ </span>claude mcp add &lt;name&gt; -- &lt;command&gt; [args...]</p>
              <p><span className="text-muted-foreground select-none">$ </span>claude mcp add --scope user harness -- npx -y harness-mcp-v2</p>
              <p><span className="text-muted-foreground select-none">$ </span>claude mcp list</p>
              <p><span className="text-muted-foreground select-none">$ </span>claude mcp remove &lt;name&gt;</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Environment variables can be passed with <Code>-e KEY=VALUE</Code> flags.
            </p>
          </div>
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
        title: "Config Location",
        content: (
          <div className="space-y-2">
            <p>
              Global: <Code>~/.cursor/mcp.json</Code>
            </p>
            <p>
              Project: <Code>.cursor/mcp.json</Code> in the workspace root.
            </p>
          </div>
        ),
      },
      {
        title: "Config Format",
        content: (
          <div className="space-y-2">
            <p>Standard MCP JSON format with <Code>mcpServers</Code> key:</p>
            <pre className="bg-muted rounded-lg px-3 py-2 font-mono text-xs text-muted-foreground overflow-x-auto">
{`{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "my-mcp-package"],
      "env": { "API_KEY": "..." }
    }
  }
}`}
            </pre>
          </div>
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
        title: "Config Location",
        content: (
          <div className="space-y-2">
            <p>
              Global: <Code>~/.codeium/windsurf/mcp_config.json</Code>
            </p>
            <p>
              You can also configure MCP servers through the Windsurf settings UI
              under <strong>Cascade &gt; MCP Servers</strong>.
            </p>
          </div>
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
        title: "Config Location",
        content: (
          <div className="space-y-2">
            <p>
              Codex reads MCP config from <Code>~/.codex/mcp.json</Code> or
              project-level <Code>.mcp.json</Code>.
            </p>
          </div>
        ),
      },
    ],
  },
];

export function McpDocs() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Documentation</h2>
      <p className="text-sm text-muted-foreground">
        Learn how MCP servers work and how each AI tool manages them.
      </p>

      <div className="space-y-2">
        {DOCS.map((doc) => (
          <div key={doc.id} className="rounded-xl border bg-card overflow-hidden">
            <button
              onClick={() =>
                setOpenSection(openSection === doc.id ? null : doc.id)
              }
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {doc.icon}
              </div>
              <span className="flex-1 font-medium text-sm">{doc.label}</span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  openSection === doc.id ? "rotate-180" : ""
                }`}
              />
            </button>

            {openSection === doc.id && (
              <div className="px-5 pb-5 space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                {doc.sections.map((section) => (
                  <div key={section.title}>
                    <h4 className="text-sm font-semibold mb-2 text-foreground/80">
                      {section.title}
                    </h4>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
