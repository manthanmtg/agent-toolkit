"use server";

import {
  loadAllProfiles,
  loadAllProfilesWithDiagnostics,
  loadProfile,
  loadAllSkills,
  filterSkillsByProfile,
} from "../registry";
import type { Profile, Skill } from "../types";

export interface ProfileListing {
  profiles: Profile[];
  invalidProfiles: string[];
}

export async function listProfilesAction(): Promise<Profile[]> {
  return loadAllProfiles();
}

export async function listProfilesWithDiagnosticsAction(): Promise<ProfileListing> {
  const { profiles, invalidFiles } = await loadAllProfilesWithDiagnostics();
  return { profiles, invalidProfiles: invalidFiles };
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
