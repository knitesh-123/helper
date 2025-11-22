import { conversationFactory } from "@tests/support/factories/conversations";
import { platformCustomerFactory } from "@tests/support/factories/platformCustomers";
import { userFactory } from "@tests/support/factories/users";
import { subHours } from "date-fns";
import { Resend } from "resend";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkVipResponseTimes } from "@/jobs/checkVipResponseTimes";
import { postSlackMessage } from "@/lib/slack/client";

vi.mock("@/lib/slack/client", () => ({
  postSlackMessage: vi.fn(),
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

describe("checkVipResponseTimes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends alerts via Slack and Email for overdue VIP tickets", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        vipChannelId: "vip-channel",
        vipThreshold: 100,
        vipExpectedResponseHours: 2,
        emailEscalationRecipients: "admin@example.com",
      },
    });

    const customerEmail = "vip@example.com";
    await platformCustomerFactory.create({
      email: customerEmail,
      value: "20000", // $200
      name: "VIP Customer",
    });

    await conversationFactory.create({
      emailFrom: customerEmail,
      status: "open",
      lastUserEmailCreatedAt: subHours(new Date(), 3),
    });

    await checkVipResponseTimes();

    expect(postSlackMessage).toHaveBeenCalledWith(
      "valid-token",
      expect.objectContaining({
        channel: "vip-channel",
        text: expect.stringContaining("VIP Response Time Alert"),
      }),
    );

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        subject: expect.stringContaining("VIP Response Time Alert"),
        html: expect.stringContaining("VIP Customer"),
      }),
    );
  });

  it("sends only Email if Slack is not configured", async () => {
    await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: null,
        vipChannelId: null,
        vipThreshold: 100,
        vipExpectedResponseHours: 2,
        emailEscalationRecipients: "admin@example.com",
      },
    });

    const customerEmail = "vip@example.com";
    await platformCustomerFactory.create({
      email: customerEmail,
      value: "20000",
    });

    await conversationFactory.create({
      emailFrom: customerEmail,
      status: "open",
      lastUserEmailCreatedAt: subHours(new Date(), 3),
    });

    await checkVipResponseTimes();

    expect(postSlackMessage).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalled();
  });

  it("does not send alerts if no overdue tickets", async () => {
    await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        vipChannelId: "vip-channel",
        vipThreshold: 100,
        vipExpectedResponseHours: 2,
        emailEscalationRecipients: "admin@example.com",
      },
    });

    const customerEmail = "vip@example.com";
    await platformCustomerFactory.create({
      email: customerEmail,
      value: "20000",
    });

    // Not overdue (1 hour ago vs 2 hour threshold)
    await conversationFactory.create({
      emailFrom: customerEmail,
      status: "open",
      lastUserEmailCreatedAt: subHours(new Date(), 1),
    });

    await checkVipResponseTimes();

    expect(postSlackMessage).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("does not send alerts if customer is not VIP", async () => {
    await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        vipChannelId: "vip-channel",
        vipThreshold: 100,
        vipExpectedResponseHours: 2,
        emailEscalationRecipients: "admin@example.com",
      },
    });

    const customerEmail = "regular@example.com";
    await platformCustomerFactory.create({
      email: customerEmail,
      value: "5000", // $50 < $100 threshold
    });

    await conversationFactory.create({
      emailFrom: customerEmail,
      status: "open",
      lastUserEmailCreatedAt: subHours(new Date(), 3),
    });

    await checkVipResponseTimes();

    expect(postSlackMessage).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
