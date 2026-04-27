import {
  listProfilesWithDiagnosticsAction,
} from "@/lib/actions/profiles";
import { Layers } from "lucide-react";

export default async function ProfilesPage() {
  const { profiles, invalidProfiles } =
    (await listProfilesWithDiagnosticsAction().catch(() => ({
      profiles: [],
      invalidProfiles: [],
    })));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profiles</h1>
        <p className="text-muted-foreground mt-1">
          Skill compositions for different use cases.
        </p>
      </div>

      {invalidProfiles.length > 0 && (
        <div className="border border-amber-500/40 bg-amber-500/10 rounded-xl p-4 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-200">
            Some profile files are invalid or missing required fields:
          </p>
          <ul className="list-disc pl-5 mt-2 text-amber-700 dark:text-amber-200">
            {invalidProfiles.map((profileName) => (
              <li key={profileName}>{profileName}</li>
            ))}
          </ul>
          <p className="mt-2 text-amber-700/90 dark:text-amber-200/90">
            Fix these files so they include valid profile content.
          </p>
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="border rounded-xl p-12 text-center">
          <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No profiles yet</h3>
          <p className="text-muted-foreground mt-1">
            Create a YAML file in the profiles/ directory to define a skill
            composition.
          </p>
          <pre className="mt-4 text-left inline-block text-xs font-mono bg-muted rounded-lg p-4 text-muted-foreground">
            {`# profiles/default.yaml
name: default
description: All skills included
include:
  - "*"
exclude: []
tools:
  claude-code:
    enabled: true
  cursor:
    enabled: true
  windsurf:
    enabled: true
  opencode:
    enabled: true
  codex:
    enabled: true`}
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((profile) => (
            <div key={profile.name} className="border rounded-xl p-5">
              <h3 className="font-semibold text-lg">{profile.name}</h3>
              {profile.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.description}
                </p>
              )}
              <div className="mt-3 space-y-1 text-xs">
                <p className="text-muted-foreground">
                  <span className="font-medium">Include:</span>{" "}
                  {profile.include.join(", ") || "none"}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium">Exclude:</span>{" "}
                  {profile.exclude.join(", ") || "none"}
                </p>
                {profile.extends && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Extends:</span>{" "}
                    {profile.extends}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
