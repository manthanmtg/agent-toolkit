import { doctorAction } from "@/lib/actions/doctor";
import { TOOL_LABELS } from "@/lib/types";
import { CheckCircle2, XCircle, AlertTriangle, Stethoscope } from "lucide-react";

export default async function DoctorPage() {
  const { checks, tools } = await doctorAction().catch(() => ({
    checks: [],
    tools: [],
  }));

  const statusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "warn":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "fail":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Doctor</h1>
        <p className="text-muted-foreground mt-1">
          System health diagnostics
        </p>
      </div>

      {/* Health Checks */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Health Checks</h2>
        <div className="border rounded-xl divide-y">
          {checks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Stethoscope className="w-8 h-8 mx-auto mb-2" />
              <p>No checks available. Build and install first.</p>
            </div>
          ) : (
            checks.map((check, i) => (
              <div key={i} className="p-4 flex items-start gap-3">
                <div className="mt-0.5">{statusIcon(check.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{check.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {check.message}
                  </p>
                  {check.details && (
                    <pre className="text-xs font-mono text-muted-foreground mt-2 whitespace-pre-wrap bg-muted/50 rounded p-2">
                      {check.details}
                    </pre>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tool Detection */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Tool Detection</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className={`border rounded-lg p-4 ${
                tool.detected ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {TOOL_LABELS[tool.id] ?? tool.id}
                </p>
                {tool.detected ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {tool.reason}
              </p>
              {tool.globalPath && (
                <p className="text-xs font-mono text-muted-foreground mt-1">
                  {tool.globalPath}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
