import { listSkillsAction } from "@/lib/actions/skills";
import { listProfilesAction } from "@/lib/actions/profiles";
import { doctorAction } from "@/lib/actions/doctor";
import { TOOL_LABELS } from "@/lib/types";
import {
  Puzzle,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { SyncButton } from "./sync-button";

export default async function DashboardPage() {
  const [skills, profiles, doctor] = await Promise.all([
    listSkillsAction().catch(() => []),
    listProfilesAction().catch(() => []),
    doctorAction().catch(() => ({ checks: [], tools: [] })),
  ]);

  const detectedTools = doctor.tools.filter((t) => t.detected);
  const passCount = doctor.checks.filter((c) => c.status === "pass").length;
  const warnCount = doctor.checks.filter((c) => c.status === "warn").length;
  const failCount = doctor.checks.filter((c) => c.status === "fail").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Agent Toolkit overview
          </p>
        </div>
        <SyncButton />
      </div>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4" aria-label="Dashboard Statistics">
        <Link
          href="/skills"
          className="relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:border-blue-500/30 hover:shadow-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 to-transparent" />
          <div className="relative flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Puzzle className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{skills.length}</p>
              <p className="text-sm text-muted-foreground">Skills</p>
            </div>
          </div>
        </Link>

        <Link
          href="/profiles"
          className="relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:border-purple-500/30 hover:shadow-sm"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 to-transparent" />
          <div className="relative flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Layers className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{profiles.length}</p>
              <p className="text-sm text-muted-foreground">Profiles</p>
            </div>
          </div>
        </Link>

        <div className="relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:border-green-500/30 hover:shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 to-transparent" />
          <div className="relative flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{detectedTools.length}</p>
              <p className="text-sm text-muted-foreground">Tools Detected</p>
            </div>
          </div>
        </div>

        <Link
          href="/doctor"
          className={`relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-sm ${
            failCount > 0
              ? "hover:border-red-500/30"
              : warnCount > 0
              ? "hover:border-yellow-500/30"
              : "hover:border-green-500/30"
          }`}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br to-transparent ${
              failCount > 0
                ? "from-red-500/8"
                : warnCount > 0
                ? "from-yellow-500/8"
                : "from-green-500/8"
            }`}
          />
          <div className="relative flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                failCount > 0
                  ? "bg-red-500/10"
                  : warnCount > 0
                  ? "bg-yellow-500/10"
                  : "bg-green-500/10"
              }`}
            >
              {failCount > 0 ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : warnCount > 0 ? (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold">
                {passCount}/{doctor.checks.length}
              </p>
              <p className="text-sm text-muted-foreground">Health Checks</p>
            </div>
          </div>
        </Link>
      </section>

      {/* Detected Tools */}
      <section aria-labelledby="detected-tools-heading">
        <h2 id="detected-tools-heading" className="text-lg font-semibold mb-3">Detected Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {doctor.tools.map((tool) => (
            <div
              key={tool.id}
              className={`border rounded-lg p-4 flex items-center justify-between ${
                tool.detected ? "bg-card" : "opacity-50"
              }`}
            >
              <div>
                <p className="font-medium">
                  {TOOL_LABELS[tool.id] ?? tool.id}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tool.reason}
                </p>
              </div>
              {tool.detected ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recent Skills */}
      <section aria-labelledby="skills-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="skills-heading" className="text-lg font-semibold">Skills</h2>
          <Link
            href="/skills"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {skills.slice(0, 6).map((skill) => (
            <Link
              key={`${skill.source}/${skill.domain}/${skill.skillName}`}
              href={`/skills/${skill.domain}/${skill.skillName}`}
              className="border rounded-lg p-4 hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{skill.skillName}</p>
                {skill.source === "local" ? (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium shrink-0">
                    Local
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium shrink-0">
                    Toolkit
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {skill.domain}
              </p>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {skill.frontmatter.description}
              </p>
              {skill.frontmatter.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {skill.frontmatter.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
