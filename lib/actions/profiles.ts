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
  invalidProfiles: Array<{ file: string; error: string }>;
}

export async function listProfilesAction(): Promise<Profile[]> {
  try {
    return await loadAllProfiles();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw new Error(`Failed to list profiles: ${message}`);
  }
}

export async function listProfilesWithDiagnosticsAction(): Promise<ProfileListing> {
  try {
    const { profiles, invalidFiles } = await loadAllProfilesWithDiagnostics();
    return { profiles, invalidProfiles: invalidFiles };
  } catch (err) {
    return {
      profiles: [],
      invalidProfiles: [{ file: "all", error: err instanceof Error ? err.message : "Failed to load profiles" }],
    };
  }
}

export async function getProfileWithSkillsAction(
  name: string
): Promise<{ profile: Profile; skills: Skill[]; error?: string } | null> {
  try {
    const profile = await loadProfile(name);
    const allSkills = await loadAllSkills();
    const skills = filterSkillsByProfile(allSkills, profile);
    return { profile, skills };
  } catch (err) {
    return {
      profile: { name: "error", description: "Failed to load profile", include: [], exclude: [], tools: {} },
      skills: [],
      error: err instanceof Error ? err.message : "Failed to load profile",
    };
  }
}
