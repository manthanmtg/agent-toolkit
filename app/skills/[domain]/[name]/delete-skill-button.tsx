"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteLocalSkillAction } from "@/lib/actions/local-skills";
import { toast } from "sonner";

interface DeleteSkillButtonProps {
  domain: string;
  skillName: string;
}

export default function DeleteSkillButton({
  domain,
  skillName,
}: DeleteSkillButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setDeleting(true);
    const result = await deleteLocalSkillAction(domain, skillName);
    if (result.success) {
      toast.success("Skill deleted", {
        description: `${domain}/${skillName} has been removed.`,
      });
      router.push("/skills");
    } else {
      toast.error("Failed to delete skill", {
        description: result.error,
      });
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
          confirming
            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            : "border hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
        }`}
      >
        {deleting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
        {deleting ? "Deleting..." : confirming ? "Confirm Delete" : "Delete"}
      </button>
      {confirming && !deleting && (
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
