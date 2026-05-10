import { CheckCircle2, TriangleAlert, Archive } from "lucide-react";
import { getDeployedSkillsPerTool } from "@/lib/actions/my-skills";
import { ToolTabs } from "./tool-tabs";
import { ToolDocs } from "./tool-docs";

export default async function MySkillsPage() {
  const data = await getDeployedSkillsPerTool();

  const { totalDeployed, totalOutdated, detectedCount } = data.tools.reduce(
    (acc, t) => ({
      totalDeployed: acc.totalDeployed + t.skills.length,
      totalOutdated:
        acc.totalOutdated + t.skills.filter((s) => s.status === "outdated").length,
      detectedCount: acc.detectedCount + (t.detected ? 1 : 0),
    }),
    { totalDeployed: 0, totalOutdated: 0, detectedCount: 0 }
  );

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
        <div className="relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-tight">Deployed Skills</p>
              <p className="text-3xl font-bold mt-1.5 tracking-tighter">{totalDeployed}</p>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                across {detectedCount} tool{detectedCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="mt-1 rounded-lg bg-primary/10 p-2.5 text-primary shadow-sm border border-primary/10">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-300 hover:border-success/30 hover:shadow-lg hover:shadow-success/5 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-tight">Up to Date</p>
              <p className="text-3xl font-bold mt-1.5 text-success tracking-tighter">
                {totalDeployed - totalOutdated}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">skills current</p>
            </div>
            <div className="mt-1 rounded-lg bg-success/10 p-2.5 text-success shadow-sm border border-success/10">
              <Archive className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-300 hover:border-warning/40 hover:shadow-lg hover:shadow-warning/5 hover:scale-[1.02]">
          <div className="absolute inset-0 bg-gradient-to-br from-warning/10 to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-tight">Needs Update</p>
              <p className={`text-3xl font-bold mt-1.5 tracking-tighter ${totalOutdated > 0 ? "text-warning" : "text-muted-foreground"}`}>
                {totalOutdated}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                {totalOutdated > 0 ? "skills outdated" : "everything current"}
              </p>
            </div>
            <div className="mt-1 rounded-lg bg-warning/10 p-2.5 text-warning shadow-sm border border-warning/10">
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
