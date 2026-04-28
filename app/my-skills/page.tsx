import { CheckCircle2, TriangleAlert, Archive } from "lucide-react";
import { getDeployedSkillsPerTool } from "@/lib/actions/my-skills";
import { ToolTabs } from "./tool-tabs";
import { ToolDocs } from "./tool-docs";

export default async function MySkillsPage() {
  const data = await getDeployedSkillsPerTool();

  const totalDeployed = data.tools.reduce((sum, t) => sum + t.skills.length, 0);
  const totalOutdated = data.tools.reduce(
    (sum, t) => sum + t.skills.filter((s) => s.status === "outdated").length,
    0
  );
  const detectedCount = data.tools.filter((t) => t.detected).length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Skills</h1>
        <p className="text-muted-foreground mt-1">
          Skills deployed to your AI tools
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:border-blue-500/30 hover:shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Deployed Skills</p>
              <p className="text-3xl font-bold mt-1">{totalDeployed}</p>
              <p className="text-xs text-muted-foreground mt-1">
                across {detectedCount} tool{detectedCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="mt-1 rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:border-emerald-500/30 hover:shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Up to Date</p>
              <p className="text-3xl font-bold mt-1 text-emerald-600">
                {totalDeployed - totalOutdated}
              </p>
              <p className="text-xs text-muted-foreground mt-1">skills current</p>
            </div>
            <div className="mt-1 rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Archive className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200 hover:border-amber-500/30 hover:shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Needs Update</p>
              <p className={`text-3xl font-bold mt-1 ${totalOutdated > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                {totalOutdated}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalOutdated > 0 ? "skills outdated" : "everything current"}
              </p>
            </div>
            <div className="mt-1 rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <TriangleAlert className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Deployed Skills Per Tool */}
      <ToolTabs data={data} />

      {/* Divider */}
      <div className="border-t" />

      {/* Documentation */}
      <ToolDocs />
    </div>
  );
}
