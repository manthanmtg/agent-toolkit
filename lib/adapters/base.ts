import type { Skill, Profile, OutputFile, ToolId } from "../types";

export abstract class BaseAdapter {
  abstract readonly toolId: ToolId;

  abstract translateSkill(skill: Skill, profile: Profile): OutputFile[];
  abstract translateGlobal(skills: Skill[], profile: Profile): OutputFile[];
  abstract getGlobalSymlinkTargets(): Map<string, string>;
  abstract getProjectSymlinkTargets(): Map<string, string>;
  abstract getCharacterLimit(scope: "global" | "workspace"): number | null;
}
