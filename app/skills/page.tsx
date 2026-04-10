import { listSkillsAction } from "@/lib/actions/skills";
import { SkillsList } from "./skills-list";

export default async function SkillsPage() {
  const skills = await listSkillsAction().catch(() => []);

  return <SkillsList skills={skills} />;
}
