"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center border rounded-lg h-[300px] bg-background">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  preview?: "edit" | "preview" | "live";
}

export default function MarkdownEditor({
  value,
  onChange,
  height = 500,
  preview = "live",
}: MarkdownEditorProps) {
  return (
    <div data-color-mode="auto">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        height={height}
        preview={preview}
        visibleDragbar
      />
    </div>
  );
}
