import { Plug } from "lucide-react";

export default function McpPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MCP Servers</h1>
        <p className="text-muted-foreground mt-1">
          Manage Model Context Protocol server configurations.
        </p>
      </div>

      <div className="border rounded-xl p-12 text-center">
        <Plug className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">MCP Management</h3>
        <p className="text-muted-foreground mt-1 max-w-md mx-auto">
          Define MCP server configs in the mcp/ directory. Agent Toolkit can
          merge them into each tool&apos;s MCP configuration safely.
        </p>
        <pre className="mt-4 text-left inline-block text-xs font-mono bg-muted rounded-lg p-4 text-muted-foreground">
          {`# mcp/filesystem.json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
    }
  }
}`}
        </pre>
      </div>
    </div>
  );
}
