"use server";

import { runInstall } from "./install";
import type { InstallResult } from "./install";

export async function syncAction(
  profileName: string = "default"
): Promise<InstallResult> {
  // Sync = build + re-link
  return runInstall(profileName);
}
