"use server";

import {
  loadAllProfiles,
  loadAllProfilesWithDiagnostics,
} from "../registry";
import type { Profile } from "../types";

export interface ProfileListing {
  profiles: Profile[];
  invalidProfiles: Array<{ file: string; error: string }>;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message || "Unknown error";
  return typeof err === "string" ? err : "Unknown error";
}

export async function listProfilesAction(): Promise<Profile[]> {
  try {
    return await loadAllProfiles();
  } catch (err) {
    throw new Error(`Failed to list profiles: ${formatError(err)}`);
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
