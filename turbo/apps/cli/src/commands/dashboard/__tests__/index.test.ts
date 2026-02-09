import { describe, it, expect, vi, afterEach } from "vitest";
import { dashboardCommand } from "../index";

describe("dashboard command", () => {
  const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

  afterEach(() => {
    mockConsoleLog.mockClear();
  });

  it("should display section headers", async () => {
    await dashboardCommand.parseAsync(["node", "cli"]);

    const output = mockConsoleLog.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("VM0 Dashboard");
    expect(output).toContain("Agents");
    expect(output).toContain("Runs");
    expect(output).toContain("Schedules");
    expect(output).toContain("Account");
  });

  it("should display query commands only", async () => {
    await dashboardCommand.parseAsync(["node", "cli"]);

    const output = mockConsoleLog.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("vm0 agent list");
    expect(output).toContain("vm0 run list");
    expect(output).toContain("vm0 logs");
    expect(output).toContain("vm0 schedule list");
    expect(output).toContain("vm0 usage");
    expect(output).toContain("vm0 secret list");
    expect(output).toContain("vm0 variable list");
    expect(output).not.toContain("compose");
    expect(output).not.toContain("setup");
  });

  it("should display auth login hint", async () => {
    await dashboardCommand.parseAsync(["node", "cli"]);

    const output = mockConsoleLog.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("vm0 auth login");
  });

  it("should succeed without any arguments", async () => {
    await expect(
      dashboardCommand.parseAsync(["node", "cli"]),
    ).resolves.not.toThrow();
  });
});
