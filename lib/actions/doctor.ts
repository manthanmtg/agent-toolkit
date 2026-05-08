"use server";

import { runDoctorChecks } from "../doctor";
import { detectTools } from "../detector";
import type { DoctorCheck, DetectedTool } from "../types";

export interface DoctorResult {
  checks: DoctorCheck[];
  tools: DetectedTool[];
  error?: string;
}

export async function doctorAction(): Promise<DoctorResult> {
  try {
    const [checks, tools] = await Promise.all([
      runDoctorChecks(),
      detectTools(),
    ]);
    return { checks, tools };
  } catch (err) {
    return {
      checks: [],
      tools: [],
      error: err instanceof Error ? err.message : "An unexpected error occurred during diagnostics.",
    };
  }
}
