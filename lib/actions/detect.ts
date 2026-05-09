"use server";

import { detectTools as detectToolsLib } from "../detector";
import type { DetectedTool } from "../types";

export async function detectTools(): Promise<DetectedTool[]> {
  try {
    return await detectToolsLib();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown detection error";
    throw new Error(`Failed to detect tools: ${message}`);
  }
}
