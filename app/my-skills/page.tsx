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
        <div className="relative overflow-hidden rounded-xl border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
          <div className="relative">
            <p className="text-sm font-medium text-muted-foreground">
              Deployed Skills
            </p>
            <p className="text-3xl font-bold mt-1">{totalDeployed}</p>
            <p className="text-xs text-muted-foreground mt-1">
              across {detectedCount} tool{detectedCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
          <div className="relative">
            <p className="text-sm font-medium text-muted-foreground">
              Up to Date
            </p>
            <p className="text-3xl font-bold mt-1 text-green-600">
              {totalDeployed - totalOutdated}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              skills current
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <div className="relative">
            <p className="text-sm font-medium text-muted-foreground">
              Needs Update
            </p>
            <p className={`text-3xl font-bold mt-1 ${totalOutdated > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
              {totalOutdated}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalOutdated > 0 ? "skills outdated" : "everything current"}
            </p>
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
