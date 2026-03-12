"use server";

import { loadAllProfiles, loadProfile, loadAllSkills, filterSkillsByProfile } from "../registry";
import type { Profile, Skill } from "../types";

export async function listProfilesAction(): Promise<Profile[]> {
  return loadAllProfiles();
}

export async function getProfileWithSkillsAction(
  name: string
): Promise<{ profile: Profile; skills: Skill[] } | null> {
  try {
    const profile = await loadProfile(name);
    const allSkills = await loadAllSkills();
    const skills = filterSkillsByProfile(allSkills, profile);
    return { profile, skills };
  } catch {
    return null;
  }
}
