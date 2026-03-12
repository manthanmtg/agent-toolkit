"use client";

import { useState } from "react";
import { runInstall } from "@/lib/actions/install";
import { detectTools } from "@/lib/actions/detect";
import type { DetectedTool } from "@/lib/types";
import { TOOL_LABELS } from "@/lib/types";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

type Step = "detect" | "profile" | "install" | "done";

export default function InstallPage() {
  const [step, setStep] = useState<Step>("detect");
  const [tools, setTools] = useState<DetectedTool[]>([]);
  const [profile, setProfile] = useState("default");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    totalSkills: number;
    totalFiles: number;
    linked: number;
  } | null>(null);

  async function handleDetect() {
    setLoading(true);
    try {
      const detected = await detectTools();
      setTools(detected);
      setStep("profile");
    } catch (err) {
      toast.error("Detection failed", { description: String(err) });
    }
    setLoading(false);
  }

  async function handleInstall() {
    setLoading(true);
    try {
      const res = await runInstall(profile);
      setResult({
        totalSkills: res.buildResult.totalSkills,
        totalFiles: res.buildResult.totalFiles,
        linked: res.linkResult.created,
      });
      if (res.buildResult.errors.length > 0 || res.linkResult.errors.length > 0) {
        toast.warning("Install completed with warnings", {
          description: [...res.buildResult.errors, ...res.linkResult.errors].join(", "),
        });
      } else {
        toast.success("Installation complete!");
      }
      setStep("done");
    } catch (err) {
      toast.error("Install failed", { description: String(err) });
    }
    setLoading(false);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Install</h1>
        <p className="text-muted-foreground mt-1">
          Guided setup wizard — detect tools, build, and link.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(["detect", "profile", "install", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && (
              <div className="w-8 h-px bg-border" />
            )}
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s === "detect"
                ? "1. Detect"
                : s === "profile"
                ? "2. Profile"
                : s === "install"
                ? "3. Install"
                : "4. Done"}
            </div>
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === "detect" && (
        <div className="border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-primary" />
            <div>
              <h2 className="font-semibold">Detect AI Tools</h2>
              <p className="text-sm text-muted-foreground">
                Scan your system for installed AI coding tools.
              </p>
            </div>
          </div>
          <button
            onClick={handleDetect}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {loading ? "Scanning..." : "Scan System"}
          </button>
        </div>
      )}

      {step === "profile" && (
        <div className="border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold">Detected Tools</h2>
          <div className="space-y-2">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm">
                  {TOOL_LABELS[tool.id] ?? tool.id}
                </span>
                {tool.detected ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t space-y-2">
            <label className="block text-sm font-medium">Select Profile</label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
            >
              <option value="default">default — All skills</option>
              <option value="work">work — Work environment</option>
              <option value="personal">personal — Personal projects</option>
            </select>
          </div>

          <button
            onClick={() => {
              setStep("install");
              handleInstall();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <ArrowRight className="w-4 h-4" />
            Build & Install
          </button>
        </div>
      )}

      {step === "install" && loading && (
        <div className="border rounded-xl p-6 flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <div>
            <p className="font-medium">Installing...</p>
            <p className="text-sm text-muted-foreground">
              Building skills and creating symlinks.
            </p>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div>
              <h2 className="font-semibold text-lg">Installation Complete</h2>
              <p className="text-sm text-muted-foreground">
                Your AI tools are now configured.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{result.totalSkills}</p>
              <p className="text-xs text-muted-foreground">Skills Built</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{result.totalFiles}</p>
              <p className="text-xs text-muted-foreground">Files Generated</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{result.linked}</p>
              <p className="text-xs text-muted-foreground">Targets Linked</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
