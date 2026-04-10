"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Eye, Code } from "lucide-react";
import MarkdownEditor from "@/app/components/markdown-editor";
import { toast } from "sonner";
import { getSkillAction } from "@/lib/actions/skills";
import {
  getLocalSkillRawAction,
  updateLocalSkillAction,
} from "@/lib/actions/local-skills";
import { TOOL_IDS, TOOL_LABELS } from "@/lib/types";
import type { SkillSource } from "@/lib/types";

const ACTIVATION_OPTIONS: Record<string, string[]> = {
  "claude-code": ["model", "user-only", "both"],
  cursor: ["auto", "always", "glob", "manual"],
  windsurf: ["always_on", "model_decision", "glob", "manual"],
  opencode: ["model"],
  codex: ["auto"],
};

export default function EditSkillPage() {
  const router = useRouter();
  const params = useParams<{ domain: string; name: string }>();
  const domain = params.domain;
  const name = params.name;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<SkillSource | null>(null);
  const [tab, setTab] = useState<"form" | "raw">("form");

  // Form fields
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [tagsInput, setTagsInput] = useState("");
  const [author, setAuthor] = useState("");
  const [globs, setGlobs] = useState("");
  const [dependsOn, setDependsOn] = useState("");
  const [activation, setActivation] = useState<Record<string, string>>({
    "claude-code": "model",
    cursor: "auto",
    windsurf: "model_decision",
    opencode: "model",
    codex: "auto",
  });
  const [body, setBody] = useState("");

  // Raw editor
  const [rawContent, setRawContent] = useState("");

  useEffect(() => {
    async function load() {
      const skill = await getSkillAction(domain, name);
      if (!skill || skill.source !== "local") {
        toast.error("Only local skills can be edited");
        router.push(`/skills/${domain}/${name}`);
        return;
      }

      setSource(skill.source);

      const raw = await getLocalSkillRawAction(domain, name);
      if (raw) {
        setRawContent(raw.content);
      }

      const fm = skill.frontmatter;
      setDescription(fm.description);
      setVersion(fm.version);
      setTagsInput(fm.tags.join(", "));
      setAuthor(fm.author);
      setGlobs(fm.globs || "");
      setDependsOn(fm.depends_on.join(", "));
      if (fm.activation) {
        setActivation({
          "claude-code": fm.activation["claude-code"] || "model",
          cursor: fm.activation.cursor || "auto",
          windsurf: fm.activation.windsurf || "model_decision",
          opencode: fm.activation.opencode || "model",
          codex: fm.activation.codex || "auto",
        });
      }
      setBody(skill.content);
      setLoading(false);
    }
    load();
  }, [domain, name, router]);

  const buildRawFromForm = useCallback(() => {
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const deps = dependsOn
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);

    const indentedDesc = description
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n");

    const lines = [
      "---",
      `name: ${name}`,
      `description: |`,
      indentedDesc,
      `domain: ${domain}`,
      `version: ${version}`,
      `tags: [${tags.map((t) => `"${t}"`).join(", ")}]`,
      `author: "${author}"`,
    ];

    if (globs) {
      lines.push(`globs: "${globs}"`);
    }

    if (deps.length > 0) {
      lines.push(`depends_on: [${deps.map((d) => `"${d}"`).join(", ")}]`);
    } else {
      lines.push("depends_on: []");
    }

    lines.push("");
    lines.push("activation:");
    for (const toolId of TOOL_IDS) {
      if (toolId === "agents-md") continue;
      lines.push(`  ${toolId}: ${activation[toolId] || "model"}`);
    }

    lines.push("---");
    lines.push("");
    lines.push(body);
    lines.push("");

    return lines.join("\n");
  }, [name, description, domain, version, tagsInput, author, globs, dependsOn, activation, body]);

  async function handleSave() {
    setSaving(true);

    const content = tab === "raw" ? rawContent : buildRawFromForm();
    const result = await updateLocalSkillAction(domain, name, content);

    if (result.success) {
      toast.success("Skill saved");
      router.push(`/skills/${domain}/${name}`);
      router.refresh();
    } else {
      toast.error("Failed to save", { description: result.error });
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (source !== "local") return null;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link
          href={`/skills/${domain}/${name}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Skill
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">Edit Skill</h1>
              <span className="px-2.5 py-1 text-xs rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                Local
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              {domain}/{name}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
        <button
          onClick={() => {
            if (tab === "raw") {
              setRawContent(rawContent);
            }
            setTab("form");
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "form"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Form
        </button>
        <button
          onClick={() => {
            if (tab === "form") {
              setRawContent(buildRawFromForm());
            }
            setTab("raw");
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "raw"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          Raw SKILL.md
        </button>
      </div>

      {tab === "form" ? (
        <div className="space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
          </div>

          {/* Version + Author */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2">Tags</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="comma-separated, e.g. python, patterns, best-practices"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
          </div>

          {/* Globs + Dependencies */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Globs</label>
              <input
                type="text"
                value={globs}
                onChange={(e) => setGlobs(e.target.value)}
                placeholder="e.g. **/*.py"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Dependencies</label>
              <input
                type="text"
                value={dependsOn}
                onChange={(e) => setDependsOn(e.target.value)}
                placeholder="comma-separated skill names"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
            </div>
          </div>

          {/* Activation per tool */}
          <div>
            <label className="block text-sm font-medium mb-3">Tool Activation</label>
            <div className="border rounded-lg divide-y">
              {TOOL_IDS.filter((id) => id !== "agents-md").map((toolId) => (
                <div
                  key={toolId}
                  className="flex items-center justify-between p-3"
                >
                  <span className="text-sm">{TOOL_LABELS[toolId]}</span>
                  <select
                    value={activation[toolId] || ""}
                    onChange={(e) =>
                      setActivation((prev) => ({ ...prev, [toolId]: e.target.value }))
                    }
                    className="px-2 py-1 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {(ACTIVATION_OPTIONS[toolId] || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Markdown Body */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Skill Content (Markdown)
            </label>
            <MarkdownEditor
              value={body}
              onChange={setBody}
              height={500}
              preview="live"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-2">
            Raw SKILL.md Content
          </label>
          <MarkdownEditor
            value={rawContent}
            onChange={setRawContent}
            height={600}
            preview="edit"
          />
        </div>
      )}

      {/* Bottom Save */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : "Save Skill"}
        </button>
        <Link
          href={`/skills/${domain}/${name}`}
          className="px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
