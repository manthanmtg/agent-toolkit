"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSkillAction } from "@/lib/actions/skills";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewSkillPage() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    const result = await createSkillAction(domain, name, description);
    if (result.success) {
      toast.success("Skill created", {
        description: `${domain}/${name} is ready to edit.`,
      });
      router.push(`/skills/${domain}/${name}`);
    } else {
      toast.error("Failed to create skill", {
        description: result.error,
      });
      setCreating(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link
          href="/skills"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Skills
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">New Skill</h1>
        <p className="text-muted-foreground mt-1">
          Create a new skill with a SKILL.md scaffold.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Domain</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. python, data-engineering, devops"
            required
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use lowercase with hyphens. Creates a directory under skills/.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Skill Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. pydantic-patterns, spark-optimization"
            required
            pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Lowercase alphanumeric with hyphens. Must match pattern:
            [a-z0-9]+(-[a-z0-9]+)*
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A concise description of what this skill teaches AI agents..."
            required
            rows={4}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {creating ? "Creating..." : "Create Skill"}
        </button>
      </form>
    </div>
  );
}
