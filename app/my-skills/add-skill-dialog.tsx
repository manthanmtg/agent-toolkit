"use client";

import { useState, useMemo } from "react";
import { PlusCircle, Search, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { TOOL_LABELS, type ToolId } from "@/lib/types";
import { addSkillToToolAction } from "@/lib/actions/my-skills";

interface AddSkillDialogProps {
  toolId: ToolId;
  availableSkills: Array<{ name: string; domain: string }>;
  onInstalled: () => void;
}

export function AddSkillDialog({
  toolId,
  availableSkills,
  onInstalled,
}: AddSkillDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return availableSkills;
    const q = search.toLowerCase();
    return availableSkills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.domain.toLowerCase().includes(q)
    );
  }, [availableSkills, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Array<{ name: string; domain: string }>>();
    for (const skill of filtered) {
      const existing = groups.get(skill.domain) ?? [];
      existing.push(skill);
      groups.set(skill.domain, existing);
    }
    return Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [filtered]);

  async function handleInstall(domain: string, name: string) {
    setInstalling(name);
    try {
      const result = await addSkillToToolAction(domain, name, toolId);
      if (result.success) {
        toast.success(`Added ${name} to ${TOOL_LABELS[toolId]}`);
        onInstalled();
      } else {
        toast.error("Install failed", { description: result.error });
      }
    } catch (err) {
      toast.error("Install failed", { description: String(err) });
    } finally {
      setInstalling(null);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
          border-2 border-dashed border-border/70 text-sm font-medium text-muted-foreground
          hover:border-primary/40 hover:text-foreground hover:bg-accent/50
          transition-all duration-200"
      >
        <PlusCircle className="w-4 h-4" />
        Add skill to {TOOL_LABELS[toolId]}
      </button>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">
          Add skill to {TOOL_LABELS[toolId]}
        </h3>
        <button
          onClick={() => {
            setIsOpen(false);
            setSearch("");
          }}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm
              placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Skill List */}
      <div className="max-h-72 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {search
              ? "No matching skills found"
              : "All registry skills are already deployed"}
          </div>
        ) : (
          grouped.map(([domain, skills]) => (
            <div key={domain}>
              <div className="px-4 py-2 bg-muted/20 border-b">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {domain.replace(/-/g, " ")}
                </span>
              </div>
              {skills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 hover:bg-accent/30 transition-colors"
                >
                  <span className="text-sm font-medium">{skill.name}</span>
                  <button
                    onClick={() => handleInstall(skill.domain, skill.name)}
                    disabled={installing !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium
                      bg-primary text-primary-foreground hover:bg-primary/90
                      disabled:opacity-50 transition-colors"
                  >
                    {installing === skill.name ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <PlusCircle className="w-3 h-3" />
                    )}
                    {installing === skill.name ? "Adding..." : "Add"}
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
