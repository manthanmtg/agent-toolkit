"use client";

import { useMemo, useState, memo } from "react";
import Link from "next/link";
import { Puzzle, Plus } from "lucide-react";
import type { Skill, SkillSource } from "@/lib/types";
const SourceBadge = memo(function SourceBadge({ source }: { source: SkillSource }) {
  if (source === "local") {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
        Local
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium">
      Toolkit
    </span>
  );
});

type FilterValue = "all" | "toolkit" | "local";

export function SkillsList({ skills }: { skills: Skill[] }) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const { filtered, domains, groupedSkills, localCount, toolkitCount, uniqueDomainCount } = useMemo(() => {
    const groupedSkills = new Map<string, Skill[]>();
    const allDomains = new Set<string>();
    let localCount = 0;
    let toolkitCount = 0;

    for (const skill of skills) {
      allDomains.add(skill.domain);

      if (skill.source === "local") {
        localCount += 1;
      } else {
        toolkitCount += 1;
      }

      if (filter !== "all" && skill.source !== filter) {
        continue;
      }

      const existing = groupedSkills.get(skill.domain);
      if (existing) {
        existing.push(skill);
      } else {
        groupedSkills.set(skill.domain, [skill]);
      }
    }

    const domains = [...groupedSkills.keys()].sort();

    return {
      filtered: Array.from(groupedSkills.values()).flat(),
      domains,
      groupedSkills,
      localCount,
      toolkitCount,
      uniqueDomainCount: allDomains.size,
    };
  }, [skills, filter]);

  const filters = useMemo<{ value: FilterValue; label: string; count: number }[]>(() => [
    { value: "all", label: "All", count: skills.length },
    { value: "toolkit", label: "Toolkit", count: toolkitCount },
    { value: "local", label: "Local", count: localCount },
  ], [skills.length, toolkitCount, localCount]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skills</h1>
          <p className="text-muted-foreground mt-1">
            {skills.length} skills across {uniqueDomainCount} domains
          </p>
        </div>
        <Link
          href="/skills/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Skill
        </Link>
      </div>

      {skills.length > 0 && (
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-xs opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="border rounded-xl p-12 text-center">
          <Puzzle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">
            {skills.length === 0 ? "No skills yet" : "No matching skills"}
          </h3>
          <p className="text-muted-foreground mt-1">
            {skills.length === 0
              ? "Create your first skill to get started."
              : `No ${filter} skills found.`}
          </p>
          {skills.length === 0 && (
            <Link
              href="/skills/new"
              className="inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Skill
            </Link>
          )}
        </div>
      ) : (
        domains.map((domain) => (
          <div key={domain}>
            <h2 className="text-lg font-semibold mb-3 capitalize">
              {domain.replace(/-/g, " ")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupedSkills.get(domain)!.map((skill) => (
                <Link
                  key={`${skill.source}/${skill.skillName}`}
                  href={`/skills/${skill.domain}/${skill.skillName}`}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium group-hover:text-primary transition-colors">
                      {skill.skillName}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <SourceBadge source={skill.source} />
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        v{skill.frontmatter.version}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {skill.frontmatter.description}
                  </p>
                  {skill.frontmatter.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {skill.frontmatter.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export { SourceBadge };
