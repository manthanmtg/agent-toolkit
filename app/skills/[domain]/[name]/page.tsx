import { getSkillAction } from "@/lib/actions/skills";
import { TOOL_IDS, TOOL_LABELS } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, FileText, Tag, Layers } from "lucide-react";
import { notFound } from "next/navigation";
import InstallSkillButton from "./install-skill-button";

interface Props {
  params: Promise<{ domain: string; name: string }>;
}

export default async function SkillDetailPage({ params }: Props) {
  const { domain, name } = await params;
  const skill = await getSkillAction(domain, name);

  if (!skill) {
    notFound();
  }

  const activation = skill.frontmatter.activation || {};

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/skills"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Skills
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          <p className="text-muted-foreground mt-1 capitalize">
            {domain.replace(/-/g, " ")}
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <FileText className="w-4 h-4" />
            Version
          </div>
          <p className="font-medium">{skill.frontmatter.version}</p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Tag className="w-4 h-4" />
            Tags
          </div>
          <div className="flex flex-wrap gap-1">
            {skill.frontmatter.tags.length > 0 ? (
              skill.frontmatter.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No tags</span>
            )}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Layers className="w-4 h-4" />
            Dependencies
          </div>
          {skill.frontmatter.depends_on.length > 0 ? (
            <ul className="text-sm space-y-1">
              {skill.frontmatter.depends_on.map((dep) => (
                <li key={dep} className="font-mono text-xs">
                  {dep}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-sm text-muted-foreground">None</span>
          )}
        </div>
      </div>

      {/* Tool Activation */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Tool Activation</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Tool</th>
                <th className="text-left p-3 font-medium">Activation Mode</th>
              </tr>
            </thead>
            <tbody>
              {TOOL_IDS.filter((id) => id !== "agents-md").map((toolId) => (
                <tr key={toolId} className="border-b last:border-0">
                  <td className="p-3">{TOOL_LABELS[toolId]}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground font-mono">
                      {(activation as Record<string, string>)[toolId] ?? "default"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Description */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Description</h2>
        <div className="border rounded-lg p-4 bg-muted/30">
          <p className="text-sm">{skill.frontmatter.description}</p>
        </div>
      </div>

      {/* Skill Content (Markdown body) */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Content</h2>
        <div className="border rounded-lg p-4 bg-card">
          <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
            {skill.content}
          </pre>
        </div>
      </div>

      {/* Raw SKILL.md */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Raw SKILL.md</h2>
        <div className="border rounded-lg p-4 bg-muted/30">
          <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto text-muted-foreground">
            {skill.rawContent}
          </pre>
        </div>
      </div>

      {/* Install to Tools */}
      <InstallSkillButton domain={domain} skillName={name} />

      {/* Supporting Files */}
      {skill.supportingFiles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Supporting Files</h2>
          <ul className="border rounded-lg divide-y">
            {skill.supportingFiles.map((file) => (
              <li key={file} className="p-3 text-sm font-mono">
                {file}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
