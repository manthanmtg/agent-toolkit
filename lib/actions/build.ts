"use server";

import { build, cleanDist } from "../builder";
import type { BuildResult } from "../builder";

export async function buildAction(
  profileName: string = "default",
  clean: boolean = false
): Promise<BuildResult> {
  if (clean) {
    await cleanDist();
  }
  return build(profileName);
}
