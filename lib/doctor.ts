import fs from "fs/promises";
import path from "path";
import { detectTools } from "./detector";
import { loadAllSkills } from "./registry";
import { loadManifest } from "./safety";
import { getRepoRoot } from "./registry";
import type { DoctorCheck } from "./types";

export async function runDoctorChecks(): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  // 1. Check detected tools
  const tools = await detectTools();
  const detectedCount = tools.filter((t) => t.detected).length;
  checks.push({
    name: "AI Tools Detected",
    status: detectedCount > 0 ? "pass" : "warn",
    message: `${detectedCount} of ${tools.length} tools detected`,
    details: tools
      .map((t) => `${t.detected ? "✓" : "✗"} ${t.id}: ${t.reason}`)
      .join("\n"),
  });

  // 2. Check skills load correctly
  try {
    const skills = await loadAllSkills();
    checks.push({
      name: "Skills Registry",
      status: skills.length > 0 ? "pass" : "warn",
      message: `${skills.length} skills loaded successfully`,
    });
  } catch (err) {
    checks.push({
      name: "Skills Registry",
      status: "fail",
      message: `Failed to load skills: ${err}`,
    });
  }

  // 3. Check dist/ exists and has manifest
  const distDir = path.join(getRepoRoot(), "dist");
  try {
    await fs.access(distDir);
    const manifest = await loadManifest(distDir);
    checks.push({
      name: "Build Output",
      status: manifest.entries.length > 0 ? "pass" : "warn",
      message: `dist/ contains ${manifest.entries.length} managed files`,
      details: `Last updated: ${manifest.updatedAt}`,
    });
  } catch {
    checks.push({
      name: "Build Output",
      status: "warn",
      message: "dist/ not found — run a build first",
    });
  }

  // 4. Check symlinks from manifest
  try {
    const manifest = await loadManifest(distDir);
    let validLinks = 0;
    let brokenLinks = 0;
    const brokenDetails: string[] = [];

    for (const entry of manifest.entries) {
      try {
        const stat = await fs.lstat(entry.destPath);
        if (stat.isSymbolicLink()) {
          const target = await fs.readlink(entry.destPath);
          try {
            await fs.access(target);
            validLinks++;
          } catch {
            brokenLinks++;
            brokenDetails.push(`Dangling: ${entry.destPath} → ${target}`);
          }
        }
      } catch {
        // Entry doesn't exist — might be fine if it's a dist-only entry
      }
    }

    if (validLinks + brokenLinks > 0) {
      checks.push({
        name: "Symlinks",
        status: brokenLinks > 0 ? "warn" : "pass",
        message: `${validLinks} valid, ${brokenLinks} broken`,
        details: brokenDetails.length > 0 ? brokenDetails.join("\n") : undefined,
      });
    }
  } catch {
    // No manifest yet
  }

  // 5. Check profiles directory
  const profilesDir = path.join(getRepoRoot(), "profiles");
  try {
    const files = await fs.readdir(profilesDir);
    const yamlFiles = files.filter((f) => f.endsWith(".yaml"));
    checks.push({
      name: "Profiles",
      status: yamlFiles.length > 0 ? "pass" : "warn",
      message: `${yamlFiles.length} profiles found`,
    });
  } catch {
    checks.push({
      name: "Profiles",
      status: "warn",
      message: "profiles/ directory not found",
    });
  }

  return checks;
}
