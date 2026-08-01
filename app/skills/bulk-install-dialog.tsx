"use client";

import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronLeft,
  FileText,
  Loader2,
  MousePointerClick,
  PackageCheck,
  Sparkles,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  installSkillsAction,
  previewSkillsInstallAction,
} from "@/lib/actions/skills";
import {
  PER_SKILL_TOOL_IDS,
  TOOL_LABELS,
  type SkillInstallRef,
  type ToolId,
} from "@/lib/types";
import type {
  BulkSkillInstallResult,
  PublicSkillInstallPreview,
} from "@/lib/skill-installer";

type Stage = "targets" | "review" | "installing" | "result";

interface BulkInstallDialogProps {
  open: boolean;
  selectedSkills: SkillInstallRef[];
  onClose: () => void;
  onFinished: (installedSkills: SkillInstallRef[], allSucceeded: boolean) => void;
}

const TOOL_ICONS: Record<(typeof PER_SKILL_TOOL_IDS)[number], React.ReactNode> = {
  "claude-code": <Sparkles className="w-4 h-4" />,
  cursor: <MousePointerClick className="w-4 h-4" />,
  windsurf: <Wind className="w-4 h-4" />,
  opencode: <Zap className="w-4 h-4" />,
  codex: <Bot className="w-4 h-4" />,
};

export function BulkInstallDialog({
  open,
  selectedSkills,
  onClose,
  onFinished,
}: BulkInstallDialogProps) {
  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(new Set());
  const [stage, setStage] = useState<Stage>("targets");
  const [preview, setPreview] = useState<PublicSkillInstallPreview | null>(null);
  const [result, setResult] = useState<BulkSkillInstallResult | null>(null);
  const [confirmReplacements, setConfirmReplacements] = useState(false);
  const [pending, setPending] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstToolRef = useRef<HTMLInputElement | null>(null);

  const toolIds = useMemo(() => Array.from(selectedTools), [selectedTools]);
  const hasReplacements = (preview?.summary.replaceFiles ?? 0) > 0;
  const hasBlockers = (preview?.summary.blockers ?? 0) > 0;
  const canInstall =
    stage === "review" &&
    preview &&
    !hasBlockers &&
    (!hasReplacements || confirmReplacements) &&
    !pending;

  useEffect(() => {
    if (!open) return;
    setSelectedTools(new Set());
    setStage("targets");
    setPreview(null);
    setResult(null);
    setConfirmReplacements(false);
    setPending(false);
    window.setTimeout(() => firstToolRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open, pending]);

  if (!open) return null;

  function toggleTool(toolId: ToolId) {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
    setPreview(null);
    setResult(null);
    setConfirmReplacements(false);
    setStage("targets");
  }

  async function buildPreview() {
    if (selectedSkills.length === 0 || toolIds.length === 0) {
      toast.error("Select at least one skill and one tool");
      return;
    }

    setPending(true);
    const response = await previewSkillsInstallAction({
      skills: selectedSkills,
      toolIds,
    });
    setPending(false);

    if (!response.success) {
      toast.error("Preview failed", { description: response.error });
      return;
    }

    setPreview(response.preview);
    setStage("review");
  }

  async function installSelected() {
    if (!canInstall) return;

    setPending(true);
    setStage("installing");
    const response = await installSkillsAction({
      skills: selectedSkills,
      toolIds,
      confirmReplacements,
    });
    setPending(false);

    if ("result" in response) {
      setResult(response.result);
      setStage("result");
      if (response.result.status === "success") {
        toast.success("Skills installed");
      } else {
        toast.error("Install finished with issues");
      }
      return;
    }

    setStage("review");
    toast.error("Install failed", { description: response.error });
  }

  function finishAndClose() {
    if (!result) {
      onClose();
      return;
    }

    const installedSkills = result.skills
      .filter((skill) => skill.status === "installed")
      .map((skill) => skill.skill);
    onFinished(installedSkills, result.status === "success");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-install-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={() => {
          if (!pending) onClose();
        }}
      />

      <div
        ref={dialogRef}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
      >
        <div className="relative overflow-hidden border-b px-6 py-5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                <PackageCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 id="bulk-install-title" className="text-lg font-semibold tracking-tight">
                  Install Selected Skills
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedSkills.length} skill{selectedSkills.length !== 1 ? "s" : ""} selected
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              aria-label="Close bulk install dialog"
              className="shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {stage === "targets" && (
            <>
              <section>
                <h3 className="text-sm font-semibold mb-2.5">Targets</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PER_SKILL_TOOL_IDS.map((toolId, index) => {
                    const isSelected = selectedTools.has(toolId);
                    return (
                      <label
                        key={toolId}
                        className={`group relative flex min-h-11 items-center gap-3 px-3.5 py-3 rounded-xl border text-left cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-border/80 hover:bg-muted/30"
                        }`}
                      >
                        <input
                          ref={index === 0 ? firstToolRef : undefined}
                          type="checkbox"
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => toggleTool(toolId)}
                        />
                        <span
                          aria-hidden="true"
                          className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/60 bg-background group-hover:border-border"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </span>
                        <span className="text-muted-foreground group-has-[:checked]:text-primary">
                          {TOOL_ICONS[toolId]}
                        </span>
                        <span className="text-sm font-medium">{TOOL_LABELS[toolId]}</span>
                      </label>
                    );
                  })}
                </div>
              </section>

              <SelectedSkillList selectedSkills={selectedSkills} />
            </>
          )}

          {stage === "review" && preview && (
            <>
              <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryValue label="Create" value={preview.summary.createFiles} />
                <SummaryValue label="Replace" value={preview.summary.replaceFiles} />
                <SummaryValue label="Blockers" value={preview.summary.blockers} />
                <SummaryValue label="Targets" value={preview.entries.length} />
              </section>

              {hasBlockers && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    Install blocked
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                    {preview.entries
                      .filter((entry) => entry.blockers.length > 0)
                      .slice(0, 8)
                      .map((entry, index) => (
                        <li key={`${entry.toolId}:${entry.displayPath}:${index}`}>
                          {formatRef(entry.skill)} / {TOOL_LABELS[entry.toolId]}:{" "}
                          {entry.blockers.join("; ")}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {hasReplacements && (
                <label className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmReplacements}
                    onChange={(event) => setConfirmReplacements(event.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm">
                    <span className="font-semibold">Confirm replacements</span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      {preview.summary.replaceFiles} existing file
                      {preview.summary.replaceFiles !== 1 ? "s" : ""} will be backed up before writing.
                    </span>
                  </span>
                </label>
              )}

              <section>
                <h3 className="text-sm font-semibold mb-2.5">Files</h3>
                <div className="rounded-xl border divide-y max-h-72 overflow-y-auto">
                  {preview.entries.map((entry, index) => (
                    <div
                      key={`${entry.toolId}:${entry.displayPath}:${index}`}
                      className="flex items-start gap-3 px-3.5 py-3 text-xs"
                    >
                      <FileText className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{entry.displayPath || "No output path"}</p>
                        <p className="text-muted-foreground mt-0.5">
                          {formatRef(entry.skill)} / {TOOL_LABELS[entry.toolId]}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 font-medium ${
                          entry.disposition === "replace-existing"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : entry.disposition === "blocked"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {entry.disposition === "replace-existing"
                          ? "Replace"
                          : entry.disposition === "blocked"
                            ? "Blocked"
                            : "Create"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {stage === "installing" && (
            <div className="py-12 text-center" aria-live="polite">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-sm font-medium">
                Installing {selectedSkills.length} skill{selectedSkills.length !== 1 ? "s" : ""} to {toolIds.length} tool
                {toolIds.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {stage === "result" && result && (
            <section aria-live="polite">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <SummaryValue label="Installed" value={result.summary.installedTargets} />
                <SummaryValue label="Partial" value={result.summary.partialTargets} />
                <SummaryValue label="Failed" value={result.summary.failedTargets} />
                <SummaryValue label="Files" value={result.summary.filesWritten} />
              </div>
              <div className="rounded-xl border divide-y max-h-80 overflow-y-auto">
                {result.skills.map((skillResult) => (
                  <div key={formatRef(skillResult.skill)} className="p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold truncate">
                        {formatRef(skillResult.skill)}
                      </p>
                      <StatusBadge status={skillResult.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skillResult.targets.map((target) => (
                        <span
                          key={target.toolId}
                          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                          title={[...target.errors, ...target.warnings].join("\n")}
                        >
                          {TOOL_LABELS[target.toolId]}
                          <StatusBadge status={target.status} compact />
                        </span>
                      ))}
                    </div>
                    {skillResult.targets.some((target) => target.errors.length > 0) && (
                      <ul className="mt-3 space-y-1 text-xs text-destructive">
                        {skillResult.targets.flatMap((target) => target.errors).slice(0, 4).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="border-t px-6 py-4 flex flex-wrap items-center justify-end gap-2 bg-muted/20">
          {stage === "review" && (
            <button
              type="button"
              onClick={() => setStage("targets")}
              disabled={pending}
              className="inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          {stage !== "installing" && stage !== "result" && (
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="min-h-11 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          )}
          {stage === "targets" && (
            <button
              type="button"
              onClick={buildPreview}
              disabled={pending || selectedSkills.length === 0 || toolIds.length === 0}
              className="inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              Review installation
            </button>
          )}
          {stage === "review" && (
            <button
              type="button"
              onClick={installSelected}
              disabled={!canInstall}
              className="inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Install {selectedSkills.length} skill{selectedSkills.length !== 1 ? "s" : ""}
            </button>
          )}
          {stage === "result" && (
            <>
              {result?.status !== "success" && (
                <button
                  type="button"
                  onClick={() => setStage("targets")}
                  className="min-h-11 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Back to targets
                </button>
              )}
              <button
                type="button"
                onClick={finishAndClose}
                className="min-h-11 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {result?.status === "success" ? "Done" : "Close"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedSkillList({ selectedSkills }: { selectedSkills: SkillInstallRef[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold mb-2.5">Selected Skills</h3>
      <div className="rounded-xl border divide-y max-h-52 overflow-y-auto">
        {selectedSkills.map((skill) => (
          <div key={formatRef(skill)} className="px-3.5 py-2.5 text-sm">
            <span className="font-medium">{skill.skillName}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {skill.source} / {skill.domain}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({
  status,
  compact,
}: {
  status: "installed" | "partial" | "failed";
  compact?: boolean;
}) {
  const className =
    status === "installed"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "partial"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "bg-destructive/15 text-destructive";
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${className}`}>
      {compact ? status[0].toUpperCase() : status}
    </span>
  );
}

function formatRef(skill: SkillInstallRef): string {
  return `${skill.source}:${skill.domain}/${skill.skillName}`;
}
