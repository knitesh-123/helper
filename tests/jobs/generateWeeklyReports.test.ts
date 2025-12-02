import { userFactory } from "@tests/support/factories/users";
import { mockJobs } from "@tests/support/jobsUtils";
import { Resend } from "resend";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMailboxReport, generateWeeklyReports } from "@/jobs/generateWeeklyReports";
import { getMemberStats } from "@/lib/data/stats";

// Mock dependencies
vi.mock("@/lib/data/stats", () => ({
  getMemberStats: vi.fn(),
}));

vi.mock("@/lib/data/user", async (importOriginal) => ({
  ...(await importOriginal()),
  UserRoles: {
    CORE: "core",
    NON_CORE: "nonCore",
    AFK: "afk",
  },
}));

const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: sendEmailMock,
    },
  })),
}));

const jobsMock = mockJobs();

describe("generateWeeklyReports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends weekly report events for mailboxes with email configured", async () => {
    await userFactory.createRootUser({
      mailboxOverrides: {
        emailEscalationRecipients: "admin@example.com",
      },
    });

    await userFactory.createRootUser({
      mailboxOverrides: {
        emailEscalationRecipients: null,
      },
    });

    await generateWeeklyReports();

    expect(jobsMock.triggerEvent).toHaveBeenCalledTimes(1);
    expect(jobsMock.triggerEvent).toHaveBeenCalledWith("reports/weekly", {});
  });
});

describe("generateMailboxWeeklyReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips report generation when there are no stats", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        emailEscalationRecipients: "admin@example.com",
      },
    });

    vi.mocked(getMemberStats).mockResolvedValue([]);

    const result = await generateMailboxReport({
      mailbox,
      hasEmail: true,
    });

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(result).toBe("No stats found");
  });

  it("sends email report when configured", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        emailEscalationRecipients: "admin@example.com",
      },
    });

    vi.mocked(getMemberStats).mockResolvedValue([
      { id: "user1", email: "john@example.com", displayName: "John Doe", replyCount: 5 },
    ]);

    await generateMailboxReport({
      mailbox,
      hasEmail: true,
    });

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        subject: `Weekly summary for ${mailbox.name}`,
      }),
    );
  });
});
