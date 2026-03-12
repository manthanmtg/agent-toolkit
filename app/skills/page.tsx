import { listSkillsAction } from "@/lib/actions/skills";
import Link from "next/link";
import { Puzzle, Plus } from "lucide-react";

export default async function SkillsPage() {
  const skills = await listSkillsAction().catch(() => []);

  const domains = [...new Set(skills.map((s) => s.domain))].sort();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skills</h1>
          <p className="text-muted-foreground mt-1">
            {skills.length} skills across {domains.length} domains
          </p>
        </div>
        <Link
          href="/skills/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Skill
        </Link>
      </div>

      {skills.length === 0 ? (
        <div className="border rounded-xl p-12 text-center">
          <Puzzle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No skills yet</h3>
          <p className="text-muted-foreground mt-1">
            Create your first skill to get started.
          </p>
          <Link
            href="/skills/new"
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Skill
          </Link>
        </div>
      ) : (
        domains.map((domain) => (
          <div key={domain}>
            <h2 className="text-lg font-semibold mb-3 capitalize">
              {domain.replace(/-/g, " ")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {skills
                .filter((s) => s.domain === domain)
                .map((skill) => (
                  <Link
                    key={skill.skillName}
                    href={`/skills/${skill.domain}/${skill.skillName}`}
                    className="border rounded-lg p-4 hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-medium group-hover:text-primary transition-colors">
                        {skill.skillName}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        v{skill.frontmatter.version}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {skill.frontmatter.description}
                    </p>
                    {skill.frontmatter.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {skill.frontmatter.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
