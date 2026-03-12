"use server";

import { runDoctorChecks } from "../doctor";
import { detectTools } from "../detector";
import type { DoctorCheck, DetectedTool } from "../types";

export interface DoctorResult {
  checks: DoctorCheck[];
  tools: DetectedTool[];
}

export async function doctorAction(): Promise<DoctorResult> {
  const [checks, tools] = await Promise.all([
    runDoctorChecks(),
    detectTools(),
  ]);
  return { checks, tools };
}
