import "$styles/global.css";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import { PROFILE, models } from "$shared/testing/work-models";
import AiPage from "../components/sections/AiPage.svelte";

vi.mock("$domain/tabs", () => ({
  tabs: { profile: () => ({ id: "00000000000000000000000001", kind: "regular" }) },
}));
const native = vi.hoisted(() => ({
  read: vi.fn(),
  test: vi.fn(),
  open: vi.fn(async () => ({ operation_id: null, accepted: true })),
}));
vi.mock("$shared/ipc/bindings", async () => {
  const { mockBindings } = await import("$shared/testing/bindings");
  return mockBindings({
    workModels: native.read,
    workTestProviderKey: native.test,
    browserOpenUrl: native.open,
    accountGet: vi.fn(),
    workLocalServers: async () => [],
    voiceStatus: async () => ({
      version: 1,
      engines: ["on_device"],
      chosen: null,
      effective: "on_device",
      language: null,
      languages: ["en-US"],
      on_device: "en_US",
      microphone: "granted",
    }),
    workDecisionPreference: async () => ({
      version: 1,
      profile: PROFILE,
      choice: "recommended",
      effective: "standard",
      typesafe_key_present: false,
      error: null,
    }),
  });
});

test("without Claude Code the row offers the install page", async () => {
  await page.viewport(1100, 1200);
  native.read.mockResolvedValue(models({ claudeCli: { installed: false } }));
  const screen = await render(AiPage);

  await expect.element(screen.getByText("Your Claude plan")).toBeVisible();
  await expect.element(screen.getByText(/Not installed\./u)).toBeVisible();
  await screen.getByRole("button", { name: "Install Claude Code" }).click();
  expect(native.open).toHaveBeenCalledWith("https://code.claude.com/docs/en/setup", true);
});

test("signing in and checking again makes the plan usable", async () => {
  await page.viewport(1100, 1200);
  native.read.mockResolvedValue(models({ claudeCli: { installed: true } }));
  native.test.mockResolvedValueOnce(
    models({
      claudeCli: { installed: true, key: "set", account: "angelo@example.com" },
      lead: "claude-cli/claude-opus-5-5",
    }),
  );
  const screen = await render(AiPage);

  await expect.element(screen.getByText(/Not signed in\./u)).toBeVisible();
  await expect
    .element(screen.getByRole("button", { name: "Install Claude Code" }))
    .not.toBeInTheDocument();
  await screen.getByRole("button", { name: "Check again" }).click();
  expect(native.test).toHaveBeenCalledWith(PROFILE, "claude_cli");
  await expect.element(screen.getByText("Signed in as angelo@example.com")).toBeVisible();
  // The plan's models now run the roles, named so they read apart from API keys.
  await expect.element(screen.getByText("Automatic · Claude Opus 5.5").first()).toBeInTheDocument();
});

test("a refused run says to check the sign-in", async () => {
  await page.viewport(1100, 1200);
  native.read.mockResolvedValue(models({ claudeCli: { installed: true, key: "invalid" } }));
  const screen = await render(AiPage);

  await expect.element(screen.getByText(/turned the last request away/u)).toBeVisible();
});
