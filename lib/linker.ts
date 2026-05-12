import fs from "fs/promises";
import path from "path";
import { atomicWrite, backupFile, writeToolkitMarker, checkDuplicate } from "./safety";
import type { SymlinkTarget } from "./types";

export interface LinkResult {
  created: SymlinkTarget[];
  skipped: Array<{ target: SymlinkTarget; reason: string }>;
  backedUp: string[];
  errors: string[];
}

function isWithinProjectPath(
  projectPath: string,
  destination: string
): boolean {
  const base = path.resolve(projectPath);
  const resolved = path.resolve(destination);
  const baseWithSep = base.endsWith(path.sep) ? base : `${base}${path.sep}`;
  return resolved === base || resolved.startsWith(baseWithSep);
}

export async function createSymlink(
  source: string,
  destination: string
): Promise<{ backedUp: string | null; error: string | null }> {
  try {
    // Ensure source exists
    await fs.access(source);
  } catch {
    return { backedUp: null, error: `Source does not exist: ${source}` };
  }

  // Check if destination already exists
  let destExists = false;
  let destIsSymlink = false;
  try {
    const stat = await fs.lstat(destination);
    destExists = true;
    destIsSymlink = stat.isSymbolicLink();
  } catch {
    // Destination doesn't exist — good, we can create it directly
  }

  if (destExists && destIsSymlink) {
    // Already a symlink — check if it points to our source
    try {
      const existingTarget = await fs.readlink(destination);
      if (existingTarget === source) {
        return { backedUp: null, error: null }; // Already correct
      }
    } catch {
      // Can't read link — remove it
    }
    try {
      await fs.unlink(destination);
    } catch (err) {
      return { backedUp: null, error: `Failed to remove old symlink: ${err}` };
    }
  } else if (destExists) {
    // Regular file or directory — back it up, then remove
    let backupPath: string | null = null;
    try {
      backupPath = await backupFile(destination);
    } catch (err) {
      // Backup failed — proceed anyway but log
      console.warn(`Backup failed for ${destination}: ${err}`);
    }
    try {
      await fs.rm(destination, { recursive: true, force: true });
    } catch (err) {
      return { backedUp: null, error: `Failed to remove existing ${destination}: ${err}` };
    }
    return await createSymlinkInner(source, destination, backupPath);
  }

  return await createSymlinkInner(source, destination, null);
}

async function createSymlinkInner(
  source: string,
  destination: string,
  backedUp: string | null
): Promise<{ backedUp: string | null; error: string | null }> {
  try {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.symlink(source, destination);
    return { backedUp, error: null };
  } catch (err) {
    return { backedUp, error: `Failed to create symlink: ${err}` };
  }
}

export async function linkGlobal(
  targets: SymlinkTarget[]
): Promise<LinkResult> {
  const result: LinkResult = {
    created: [],
    skipped: [],
    backedUp: [],
    errors: [],
  };

  for (const target of targets) {
    // Check for duplicates
    const dup = await checkDuplicate(target.destination);
    if (dup.exists && !dup.isToolkitManaged) {
      // Back up and proceed
      const backupPath = await backupFile(target.destination);
      if (backupPath) result.backedUp.push(backupPath);
    }

    const { backedUp, error } = await createSymlink(
      target.source,
      target.destination
    );

    if (error) {
      result.errors.push(error);
    } else {
      result.created.push(target);
      if (backedUp) result.backedUp.push(backedUp);

      // Write toolkit marker in the parent directory
      try {
        await writeToolkitMarker(path.dirname(target.destination));
      } catch {
        // Non-critical
      }
    }
  }

  return result;
}

export async function linkProject(
  projectPath: string,
  targets: SymlinkTarget[]
): Promise<LinkResult> {
  const result: LinkResult = {
    created: [],
    skipped: [],
    backedUp: [],
    errors: [],
  };

  for (const target of targets) {
    const dest = path.resolve(projectPath, target.destination);
    if (!isWithinProjectPath(projectPath, dest)) {
      result.errors.push(
        `Refusing to link outside project: ${target.destination}`
      );
      result.skipped.push({
        target,
        reason: "destination is outside project root",
      });
      continue;
    }

    const { backedUp, error } = await createSymlink(target.source, dest);

    if (error) {
      result.errors.push(error);
    } else {
      result.created.push({ ...target, destination: dest });
      if (backedUp) result.backedUp.push(backedUp);
    }
  }

  // Update .gitignore
  await updateGitignore(projectPath, result.created);

  return result;
}

async function updateGitignore(
  projectPath: string,
  created: SymlinkTarget[]
): Promise<void> {
  const gitignorePath = path.join(projectPath, ".gitignore");
  let content = "";

  try {
    content = await fs.readFile(gitignorePath, "utf-8");
  } catch {
    // No .gitignore yet
  }

  const marker = "# agent-toolkit managed";
  const paths = created.map((t) => {
    const rel = path.relative(projectPath, t.destination);
    return rel.startsWith(".") ? rel : `./${rel}`;
  });

  if (content.includes(marker)) {
    // Already has our section — skip
    return;
  }

  const section = `\n${marker}\n${paths.join("\n")}\n`;
  await atomicWrite(gitignorePath, content.trimEnd() + section);
}
