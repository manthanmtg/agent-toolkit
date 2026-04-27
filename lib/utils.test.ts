import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("merges class names into a single string", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("normalizes nested arrays and objects", () => {
    expect(cn(["a", ["b", "c"]], { d: true, e: false }, "f")).toBe("a b c d f");
  });

  it("handles null and undefined inputs", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });

  it("deduplicates conflicting tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-left", "text-right")).toBe("text-right");
  });

  it("merges variants from complex input", () => {
    expect(cn(["flex", "items-center"], ["px-2", "py-1"], "bg-white".split(" "))).toBe(
      "flex items-center px-2 py-1 bg-white"
    );
  });

  it("preserves arbitrary values", () => {
    expect(cn("data-[state=open]:bg-sky-500", "bg-blue-500")).toBe(
      "data-[state=open]:bg-sky-500 bg-blue-500"
    );
  });

  it("returns empty when no classes are provided", () => {
    expect(cn()).toBe("");
  });

  it("ignores empty and nullish values", () => {
    expect(cn("", "a", undefined, null, ["", "b", ["", null]], "c", false)).toBe("a b c");
  });

  it("merges deeply nested arrays", () => {
    expect(cn(["base", ["layout", ["x"]]], [["gap-2"]], "rounded")).toBe("base layout x gap-2 rounded");
  });

  it("resolves repeated tailwind conflicts consistently", () => {
    expect(cn("px-1", "px-3", "px-2")).toBe("px-2");
  });

  it("supports object syntax with mixed boolean values", () => {
    expect(
      cn(
        { "bg-red-500": false, "bg-blue-500": true, "text-sm": true },
        { "text-lg": false },
        "text-lg"
      )
    ).toBe("bg-blue-500 text-lg");
  });
});
