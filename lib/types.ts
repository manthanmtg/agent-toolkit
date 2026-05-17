import { z } from "zod";

// ── Tool identifiers ──────────────────────────────────────────────
export const TOOL_IDS = [
  "claude-code",
  "cursor",
  "windsurf",
  "opencode",
  "codex",
  "agents-md",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export const ToolIdSchema = z.enum(TOOL_IDS);
export const ToolIdsSchema = z.array(ToolIdSchema);

export const TOOL_LABELS: Record<ToolId, string> = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  windsurf: "Windsurf",
  opencode: "OpenCode",
  codex: "Codex",
  "agents-md": "AGENTS.md",
};

// ── Activation modes per tool ─────────────────────────────────────
export const ActivationSchema = z.object({
  "claude-code": z
    .enum(["model", "user-only", "both"])
    .optional()
    .default("model"),
  cursor: z
    .enum(["auto", "always", "glob", "manual"])
    .optional()
    .default("auto"),
  windsurf: z
    .enum(["always_on", "model_decision", "glob", "manual"])
    .optional()
    .default("model_decision"),
  opencode: z.enum(["model"]).optional().default("model"),
  codex: z.enum(["auto"]).optional().default("auto"),
});

export type Activation = z.infer<typeof ActivationSchema>;

// ── Skill schema ──────────────────────────────────────────────────
export const SkillFrontmatterSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  description: z.string().min(1).max(2000),
  domain: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  version: z.string().optional().default("1.0.0"),
  tags: z.array(z.string().transform((s) => s.trim())).optional().default([]),
  author: z.string().optional().default(""),
  activation: ActivationSchema.optional().default(ActivationSchema.parse({})),
  globs: z.string().optional(),
  depends_on: z.array(z.string()).optional().default([]),
});

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

export type SkillSource = "toolkit" | "local";

export interface Skill {
  frontmatter: SkillFrontmatter;
  content: string; // markdown body (after frontmatter)
  rawContent: string; // full file content
  path: string; // relative path from repo root or local skills dir
  domain: string;
  skillName: string;
  supportingFiles: string[]; // relative paths of examples/, scripts/, templates/
  source: SkillSource;
}

export const InstallSkillInputSchema = z.object({
  domain: z.string().min(1).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  skillName: z.string().min(1).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  toolIds: ToolIdsSchema,
});

export const UninstallSkillInputSchema = z.object({
  skillName: z.string().min(1).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  toolIds: ToolIdsSchema,
});

// ── Profile schema ────────────────────────────────────────────────
export const ToolConfigSchema = z.object({
  enabled: z.boolean().optional().default(true),
  global_skills: z.boolean().optional(),
  max_rule_length: z.number().optional(),
  default_trigger: z.string().optional(),
  max_bytes: z.number().optional(),
}).strict();

const GlobPatternSchema = z.string().refine((val) => {
  const t = val.trim();
  if (!t) return false;
  if (t === "*") return true;
  if (t.startsWith("tag:")) return t.length > 4;

  const starCount = (t.match(/\*/g) || []).length;
  if (starCount === 0) {
    return t.includes("/") && t.split("/").length === 2 && t.split("/").every(p => p.length > 0);
  }

  if (starCount === 1) {
    if (t.endsWith("/*") && t.length > 2) return true;
    if (t.startsWith("*/") && t.length > 2) return true;
  }

  return false;
}, {
  message: "Invalid pattern. Supported: '*', 'tag:name', 'domain/*', '*/skill', or exact 'domain/skill'."
});

export const ProfileSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  description: z.string().optional().default(""),
  extends: z.string().optional(),
  include: z.array(GlobPatternSchema).optional().default(["*"]),
  exclude: z.array(GlobPatternSchema).optional().default([]),
  tools: z.record(z.enum(TOOL_IDS), ToolConfigSchema).optional().default({}),
}).strict();

export type Profile = z.infer<typeof ProfileSchema>;

// ── Output file ───────────────────────────────────────────────────
export interface OutputFile {
  relativePath: string; // relative to dist/<tool>/
  content: string;
  tool: ToolId;
  scope?: "global" | "workspace";
}

// ── Symlink target ────────────────────────────────────────────────
export type SymlinkScope = "global" | "project";

export interface SymlinkTarget {
  source: string; // absolute path in dist/
  destination: string; // absolute path on system (e.g., ~/.claude/skills/...)
  tool: ToolId;
  scope: SymlinkScope;
}

// ── Detection result ──────────────────────────────────────────────
export interface DetectedTool {
  id: ToolId;
  detected: boolean;
  reason: string; // e.g., "~/.claude/ found" or "cursor binary on PATH"
  globalPath?: string;
}

// ── Doctor check ──────────────────────────────────────────────────
export type CheckStatus = "pass" | "warn" | "fail";

export interface DoctorCheck {
  name: string;
  status: CheckStatus;
  message: string;
  details?: string;
}

// ── Manifest ──────────────────────────────────────────────────────
export interface ManifestEntry {
  sourcePath: string;
  destPath: string;
  checksum: string;
  tool: ToolId;
  scope: SymlinkScope;
  createdAt: string;
}

export interface Manifest {
  version: string;
  updatedAt: string;
  entries: ManifestEntry[];
}

// ── MCP schema ────────────────────────────────────────────────────
export const AddMcpServerInputSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  transport: z.enum(["stdio", "sse", "streamable-http"]),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url("Invalid URL").optional(),
  env: z.record(z.string()).optional(),
}).refine(data => {
  if (data.transport === "stdio") {
    return !!data.command;
  }
  return !!data.url;
}, {
  message: "Command is required for stdio, URL is required for remote transport",
  path: ["command", "url"],
});

export const RawMcpServerConfigSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.union([z.string(), z.number(), z.boolean()]).transform(String)).optional(),
  url: z.string().optional(),
  env: z.record(z.union([z.string(), z.number(), z.boolean()]).transform(String)).optional(),
  transport: z.enum(["stdio", "sse", "streamable-http", "unknown"]).optional(),
}).passthrough();

export const CreateSkillInputSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Domain must be kebab-case (lowercase, numbers, and hyphens)"),
  name: z
    .string()
    .min(1, "Skill name is required")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Skill name must be kebab-case (lowercase, numbers, and hyphens)"),
  description: z.string().min(1, "Description is required").max(1000, "Description is too long"),
});

export type CreateSkillInput = z.infer<typeof CreateSkillInputSchema>;

export interface McpServerConfig {
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  transport?: "stdio" | "sse" | "streamable-http" | "unknown";
}
