import { getMcpOverview } from "@/lib/actions/mcp";
import { ToolMcpTabs } from "./tool-mcp-tabs";
import { McpDocs } from "./mcp-docs";

export default async function McpPage() {
  const data = await getMcpOverview();

  const toolsWithServers = data.tools.filter((t) => t.servers.length > 0).length;
  const detectedCount = data.tools.filter((t) => t.detected).length;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MCP Servers</h1>
        <p className="text-muted-foreground mt-1">
          Model Context Protocol servers configured across your AI tools
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-xl border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent" />
          <div className="relative">
            <p className="text-sm font-medium text-muted-foreground">
              Total Servers
            </p>
            <p className="text-3xl font-bold mt-1">{data.totalServers}</p>
            <p className="text-xs text-muted-foreground mt-1">
              across {toolsWithServers} tool{toolsWithServers !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
          <div className="relative">
            <p className="text-sm font-medium text-muted-foreground">
              Unique Servers
            </p>
            <p className="text-3xl font-bold mt-1 text-blue-600">
              {data.uniqueServerNames.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              distinct server name{data.uniqueServerNames.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-card p-5">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <div className="relative">
            <p className="text-sm font-medium text-muted-foreground">
              Tools Detected
            </p>
            <p className="text-3xl font-bold mt-1 text-emerald-600">
              {detectedCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              scanned for MCP configs
            </p>
          </div>
        </div>
      </div>

      {/* Per-Tool Tabs */}
      <ToolMcpTabs data={data} />

      {/* Divider */}
      <div className="border-t" />

      {/* Documentation */}
      <McpDocs />
    </div>
  );
}
