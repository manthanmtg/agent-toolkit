"use client";

import React from "react";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckSquare, PackageCheck, Plus, Puzzle, Square, X } from "lucide-react";
import { toast } from "sonner";
import { BulkInstallDialog } from "./bulk-install-dialog";
import { SkillCard } from "./skill-card";
import {
  MAX_BULK_SKILLS,
  type Skill,
  type SkillInstallRef,
} from "@/lib/types";

type FilterValue = "all" | "toolkit" | "local";

export function SkillsList({ skills }: { skills: Skill[] }) {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const installTriggerRef = useRef<HTMLButtonElement | null>(null);

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

  const visibleKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const skill of skills) {
      if (filter === "all" || skill.source === filter) {
        keys.add(skillKey(skill));
      }
    }
    return keys;
  }, [filter, skills]);

  const visibleSelectedCount = useMemo(() => {
    let count = 0;
    for (const key of selectedKeys) {
      if (visibleKeys.has(key)) count += 1;
    }
    return count;
  }, [selectedKeys, visibleKeys]);

  const hiddenSelectedCount = selectedKeys.size - visibleSelectedCount;
  const allVisibleSelected = filteredCount > 0 && visibleSelectedCount === filteredCount;

  const selectedSkillRefs = useMemo<SkillInstallRef[]>(() => {
    return skills
      .filter((skill) => selectedKeys.has(skillKey(skill)))
      .map((skill) => ({
        source: skill.source,
        domain: skill.domain,
        skillName: skill.skillName,
      }));
  }, [selectedKeys, skills]);

  const filters = useMemo<{ value: FilterValue; label: string; count: number }[]>(() => [
    { value: "all", label: "All", count: skills.length },
    { value: "toolkit", label: "Toolkit", count: toolkitCount },
    { value: "local", label: "Local", count: localCount },
  ], [skills.length, toolkitCount, localCount]);

  function enterSelectionMode() {
    setSelectionMode(true);
  }

  function cancelSelectionMode() {
    setSelectedKeys(new Set());
    setSelectionMode(false);
    setDialogOpen(false);
  }

  function toggleSkill(skill: Skill) {
    const key = skillKey(skill);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (next.size >= MAX_BULK_SKILLS) {
          toast.error(`Bulk install supports up to ${MAX_BULK_SKILLS} skills`);
          return prev;
        }
        next.add(key);
      }
      return next;
    });
  }

  function toggleVisibleSelection() {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const key of visibleKeys) next.delete(key);
        return next;
      }

      const available = MAX_BULK_SKILLS - next.size;
      if (available <= 0) {
        toast.error(`Bulk install supports up to ${MAX_BULK_SKILLS} skills`);
        return prev;
      }

      let added = 0;
      for (const key of visibleKeys) {
        if (next.has(key)) continue;
        if (added >= available) break;
        next.add(key);
        added += 1;
      }
      if (added < visibleKeys.size - visibleSelectedCount) {
        toast.error(`Selected the first ${MAX_BULK_SKILLS} skills only`);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedKeys(new Set());
  }

  function closeDialog() {
    setDialogOpen(false);
    window.setTimeout(() => installTriggerRef.current?.focus(), 0);
  }

  function handleInstallFinished(
    installedSkills: SkillInstallRef[],
    allSucceeded: boolean
  ) {
    const installedKeys = new Set(installedSkills.map(skillRefKey));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const key of installedKeys) next.delete(key);
      return next;
    });
    setDialogOpen(false);
    if (allSucceeded) {
      setSelectionMode(false);
    }
    window.setTimeout(() => installTriggerRef.current?.focus(), 0);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skills</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {skills.length} skills across {uniqueDomainCount} domains
          </p>
        </div>
        <div className="flex items-center gap-2">
          {skills.length > 0 && (
            <button
              type="button"
              onClick={selectionMode ? cancelSelectionMode : enterSelectionMode}
              className="inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted/50 transition-all active:scale-95 shadow-sm"
            >
              {selectionMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
              {selectionMode ? "Cancel" : "Select skills"}
            </button>
          )}
          <Link
            href="/skills/new"
            className="inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all active:scale-95 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Skill
          </Link>
        </div>
      </div>

      {skills.length > 0 && (
        <div className="space-y-3">
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

          {selectionMode && (
            <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
              <div className="mr-auto text-sm">
                <span className="font-semibold">{selectedKeys.size} selected</span>
                {hiddenSelectedCount > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {hiddenSelectedCount} hidden by filter
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={toggleVisibleSelection}
                className="inline-flex min-h-11 items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                {allVisibleSelected ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                {allVisibleSelected ? "Deselect visible" : "Select visible"}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={selectedKeys.size === 0}
                className="min-h-11 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
              >
                Clear
              </button>
              <button
                ref={installTriggerRef}
                type="button"
                onClick={() => setDialogOpen(true)}
                disabled={selectedKeys.size === 0}
                className="inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <PackageCheck className="w-4 h-4" />
                Install selected
              </button>
            </div>
          )}
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
                <SkillCard
                  key={skillKey(skill)}
                  skill={skill}
                  selectionMode={selectionMode}
                  selected={selectedKeys.has(skillKey(skill))}
                  onToggle={() => toggleSkill(skill)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <BulkInstallDialog
        open={dialogOpen}
        selectedSkills={selectedSkillRefs}
        onClose={closeDialog}
        onFinished={handleInstallFinished}
      />
    </div>
  );
}

function skillKey(skill: Pick<Skill, "source" | "domain" | "skillName">): string {
  return `${skill.source}:${skill.domain}/${skill.skillName}`;
}

function skillRefKey(skill: SkillInstallRef): string {
  return `${skill.source}:${skill.domain}/${skill.skillName}`;
}
