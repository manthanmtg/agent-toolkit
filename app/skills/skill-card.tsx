"use client";

import React from "react";
import { memo } from "react";
import Link from "next/link";
import { Check, Puzzle } from "lucide-react";
import type { Skill, SkillSource } from "@/lib/types";

export const SourceBadge = memo(function SourceBadge({
  source,
}: {
  source: SkillSource;
}) {
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

interface SkillCardProps {
  skill: Skill;
  selectionMode: boolean;
  selected: boolean;
  onToggle: () => void;
}

export const SkillCard = memo(function SkillCard({
  skill,
  selectionMode,
  selected,
  onToggle,
}: SkillCardProps) {
  const content = (
    <>
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
          {selectionMode && (
            <span
              aria-hidden="true"
              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background"
              }`}
            >
              {selected && <Check className="w-3.5 h-3.5" />}
            </span>
          )}
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
    </>
  );

  const cardClassName = `group relative flex min-h-[11rem] flex-col border rounded-xl p-5 bg-card transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/25 ${
    selectionMode
      ? selected
        ? "border-primary/70 bg-primary/5 shadow-sm"
        : "hover:bg-accent/30 hover:border-border/80"
      : "hover:bg-accent/40 hover:shadow-lg hover:shadow-primary/5 hover:border-border/80 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary/20"
  }`;

  if (selectionMode) {
    return (
      <label className={`${cardClassName} cursor-pointer`}>
        <input
          type="checkbox"
          className="sr-only"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${skill.skillName}`}
        />
        {content}
      </label>
    );
  }

  return (
    <Link href={`/skills/${skill.domain}/${skill.skillName}`} className={cardClassName}>
      {content}
    </Link>
  );
});
