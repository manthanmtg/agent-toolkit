import { FolderOpen } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground mt-1">
          Link skills to specific project directories.
        </p>
      </div>

      <div className="border rounded-xl p-12 text-center">
        <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No linked projects yet</h3>
        <p className="text-muted-foreground mt-1 max-w-md mx-auto">
          Use the Install wizard to link skills to a specific project directory.
          Symlinks will be created in the project&apos;s tool-specific config
          directories.
        </p>
      </div>
    </div>
  );
}
