/* @vitest-environment jsdom */

import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillsList } from "./skills-list";
import {
  installSkillsAction,
  previewSkillsInstallAction,
} from "@/lib/actions/skills";
import type { Skill } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/actions/skills", () => ({
  previewSkillsInstallAction: vi.fn(),
  installSkillsAction: vi.fn(),
}));

const mockedPreview = vi.mocked(previewSkillsInstallAction);
const mockedInstall = vi.mocked(installSkillsAction);

describe("SkillsList bulk selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("uses links while browsing and checkboxes while selecting", async () => {
    const user = userEvent.setup();
    render(<SkillsList skills={[skill("toolkit", "code-review", "deep-review")]} />);

    expect(
      screen.getByRole("link", { name: /deep-review/i }).getAttribute("href")
    ).toBe("/skills/code-review/deep-review");

    await user.click(screen.getByRole("button", { name: /select skills/i }));

    expect(screen.queryByRole("link", { name: /deep-review/i })).toBeNull();
    expect(screen.getByRole("checkbox", { name: /select deep-review/i })).toBeDefined();
  });

  it("keeps selected skills when the source filter hides them", async () => {
    const user = userEvent.setup();
    render(
      <SkillsList
        skills={[
          skill("toolkit", "code-review", "deep-review"),
          skill("local", "debugging", "root-cause-debugging"),
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: /select skills/i }));
    await user.click(screen.getByRole("checkbox", { name: /select deep-review/i }));
    await user.click(screen.getByRole("button", { name: /local/i }));

    expect(screen.getByText("1 selected")).toBeDefined();
    expect(screen.getByText("1 hidden by filter")).toBeDefined();
  });

  it("reviews, installs, and exits selection mode after full success", async () => {
    const user = userEvent.setup();
    mockedPreview.mockResolvedValue({
      success: true,
      preview: {
        okToInstall: true,
        summary: {
          requestedSkills: 1,
          requestedTools: 1,
          createFiles: 1,
          replaceFiles: 0,
          blockers: 0,
        },
        entries: [
          {
            skill: {
              source: "toolkit",
              domain: "code-review",
              skillName: "deep-review",
            },
            toolId: "codex",
            relativePath: "skills/deep-review/SKILL.md",
            displayPath: "~/.codex/skills/deep-review/SKILL.md",
            disposition: "create",
            blockers: [],
          },
        ],
      },
    });
    mockedInstall.mockResolvedValue({
      success: true,
      result: {
        status: "success",
        summary: {
          requestedSkills: 1,
          requestedTools: 1,
          installedTargets: 1,
          partialTargets: 0,
          failedTargets: 0,
          filesWritten: 1,
        },
        skills: [
          {
            skill: {
              source: "toolkit",
              domain: "code-review",
              skillName: "deep-review",
            },
            status: "installed",
            targets: [
              {
                toolId: "codex",
                status: "installed",
                filesWritten: 1,
                warnings: [],
                errors: [],
              },
            ],
          },
        ],
        errors: [],
      },
    });

    render(<SkillsList skills={[skill("toolkit", "code-review", "deep-review")]} />);

    await user.click(screen.getByRole("button", { name: /select skills/i }));
    await user.click(screen.getByRole("checkbox", { name: /select deep-review/i }));
    await user.click(screen.getByRole("button", { name: /install selected/i }));

    const dialog = screen.getByRole("dialog", { name: /install selected skills/i });
    await user.click(within(dialog).getByRole("checkbox", { name: /codex/i }));
    await user.click(within(dialog).getByRole("button", { name: /review installation/i }));

    expect(await within(dialog).findByText("~/.codex/skills/deep-review/SKILL.md")).toBeDefined();
    await user.click(within(dialog).getByRole("button", { name: /install 1 skill/i }));

    expect(await within(dialog).findByText("Installed")).toBeDefined();
    await user.click(within(dialog).getByRole("button", { name: /done/i }));

    expect(screen.queryByRole("button", { name: /install selected/i })).toBeNull();
    expect(mockedPreview).toHaveBeenCalledWith({
      skills: [{ source: "toolkit", domain: "code-review", skillName: "deep-review" }],
      toolIds: ["codex"],
    });
    expect(mockedInstall).toHaveBeenCalledWith({
      skills: [{ source: "toolkit", domain: "code-review", skillName: "deep-review" }],
      toolIds: ["codex"],
      confirmReplacements: false,
    });
  });
});

function skill(source: Skill["source"], domain: string, skillName: string): Skill {
  return {
    frontmatter: {
      name: skillName,
      description: `${skillName} description`,
      domain,
      version: "1.0.0",
      tags: ["test"],
      author: "",
      activation: {
        "claude-code": "model",
        cursor: "auto",
        windsurf: "model_decision",
        opencode: "model",
        codex: "auto",
      },
      depends_on: [],
    },
    content: `${skillName} body`,
    rawContent: `${skillName} raw`,
    path: `${source === "local" ? "local-skills" : "skills"}/${domain}/${skillName}`,
    domain,
    skillName,
    supportingFiles: [],
    source,
  };
}
