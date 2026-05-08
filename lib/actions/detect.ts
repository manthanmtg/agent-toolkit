"use server";

import { detectTools as detectToolsLib } from "../detector";
import type { DetectedTool } from "../types";

export async function detectTools(): Promise<DetectedTool[]> {
  try {
    return await detectToolsLib();
  } catch {
    return [];
  }
}
