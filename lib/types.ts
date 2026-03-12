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
  domain: z.string().min(1),
  version: z.string().optional().default("1.0.0"),
  tags: z.array(z.string()).optional().default([]),
  author: z.string().optional().default(""),
  activation: ActivationSchema.optional(),
  globs: z.string().optional(),
  depends_on: z.array(z.string()).optional().default([]),
});

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

export interface Skill {
  frontmatter: SkillFrontmatter;
  content: string; // markdown body (after frontmatter)
  rawContent: string; // full file content
  path: string; // relative path from repo root, e.g. "skills/python/pydantic-patterns"
  domain: string;
  skillName: string;
  supportingFiles: string[]; // relative paths of examples/, scripts/, templates/
}

// ── Profile schema ────────────────────────────────────────────────
export const ToolConfigSchema = z.object({
  enabled: z.boolean().optional().default(true),
  global_skills: z.boolean().optional(),
  max_rule_length: z.number().optional(),
  default_trigger: z.string().optional(),
  max_bytes: z.number().optional(),
});

export const ProfileSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  extends: z.string().optional(),
  include: z.array(z.string()).optional().default(["*"]),
  exclude: z.array(z.string()).optional().default([]),
  tools: z.record(z.string(), ToolConfigSchema).optional().default({}),
});

export type Profile = z.infer<typeof ProfileSchema>;

// ── Output file ───────────────────────────────────────────────────
export interface OutputFile {
  relativePath: string; // relative to dist/<tool>/
  content: string;
  tool: ToolId;
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
