"use client";

import { useMemo, useState, memo } from "react";
import Link from "next/link";
import { Puzzle, Plus } from "lucide-react";
import type { Skill, SkillSource } from "@/lib/types";
const SourceBadge = memo(function SourceBadge({ source }: { source: SkillSource }) {
  if (source === "local") {
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        Local
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
      Toolkit
    </span>
  );
});

const SkillCard = memo(function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Link
      href={`/skills/${skill.domain}/${skill.skillName}`}
      className="group relative flex flex-col border rounded-xl p-5 bg-card hover:bg-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-border/80 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
            <Puzzle className="w-4 h-4 text-primary/70" />
          </div>
          <p className="font-semibold text-sm truncate tracking-tight group-hover:text-primary transition-colors">
            {skill.skillName}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <SourceBadge source={skill.source} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed opacity-90">
        {skill.frontmatter.description}
      </p>

      <div className="mt-auto pt-4 flex items-center justify-between gap-2">
        {skill.frontmatter.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 overflow-hidden">
            {skill.frontmatter.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-muted text-muted-foreground border border-border/50"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <div />
        )}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/50 uppercase tracking-tight">
          v{skill.frontmatter.version}
        </span>
      </div>
    </Link>
  );
});

type FilterValue = "all" | "toolkit" | "local";

export function SkillsList({ skills }: { skills: Skill[] }) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const { localCount, toolkitCount, uniqueDomainCount } = useMemo(() => {
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
    }

    return {
      localCount,
      toolkitCount,
      uniqueDomainCount: allDomains.size,
    };
  }, [skills]);

  const { domains, groupedSkills, filteredCount } = useMemo(() => {
    const groupedSkills = new Map<string, Skill[]>();
    let filteredCount = 0;

    for (const skill of skills) {
      if (filter !== "all" && skill.source !== filter) {
        continue;
      }

      filteredCount++;
      const existing = groupedSkills.get(skill.domain);
      if (existing) {
        existing.push(skill);
      } else {
        groupedSkills.set(skill.domain, [skill]);
      }
    }

    const domains = [...groupedSkills.keys()].sort();

    return {
      domains,
      groupedSkills,
      filteredCount,
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
          <p className="text-muted-foreground mt-1 text-sm">
            {skills.length} skills across {uniqueDomainCount} domains
          </p>
        </div>
        <Link
          href="/skills/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Skill
        </Link>
      </div>

      {skills.length > 0 && (
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border w-fit">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                filter === f.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-xs opacity-60 font-normal">{f.count}</span>
            </button>
          ))}
        </div>
      )}

      {filteredCount === 0 ? (
        <div className="border rounded-2xl p-12 text-center bg-muted/20">
          <Puzzle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold tracking-tight">
            {skills.length === 0 ? "No skills yet" : "No matching skills"}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {skills.length === 0
              ? "Create your first skill to get started."
              : `No ${filter} skills found.`}
          </p>
          {skills.length === 0 && (
            <Link
              href="/skills/new"
              className="inline-flex items-center gap-2 px-4 py-2 mt-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all active:scale-95 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Skill
            </Link>
          )}
        </div>
      ) : (
        domains.map((domain) => (
          <div key={domain} className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">
              {domain.replace(/-/g, " ")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSkills.get(domain)!.map((skill) => (
                <SkillCard key={`${skill.source}/${skill.skillName}`} skill={skill} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export { SourceBadge };
