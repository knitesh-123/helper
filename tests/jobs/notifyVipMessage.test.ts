import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { platformCustomerFactory } from "@tests/support/factories/platformCustomers";
import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notifyVipMessage } from "@/jobs/notifyVipMessage";
import { postVipMessageToSlack, updateVipMessageInSlack } from "@/lib/slack/vipNotifications";

vi.mock("@/lib/slack/vipNotifications", () => ({
  postVipMessageToSlack: vi.fn(),
  updateVipMessageInSlack: vi.fn(),
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

describe("notifyVipMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends notifications via Slack and Email for new VIP messages", async () => {
    await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        vipChannelId: "vip-channel",
        vipThreshold: 100, // $100
        emailEscalationRecipients: "admin@example.com",
      },
    });

    const customerEmail = "vip@example.com";
    await platformCustomerFactory.create({
      email: customerEmail,
      value: "20000", // $200 > $100
      name: "VIP Customer",
    });

    const { conversation } = await conversationFactory.create({
      emailFrom: customerEmail,
      status: "open",
    });

    const { message } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      body: "Help me!",
      cleanedUpText: "Help me!",
    });

    await notifyVipMessage({ messageId: message.id });

    expect(postVipMessageToSlack).toHaveBeenCalledWith(
      expect.objectContaining({
        slackBotToken: "valid-token",
        slackChannel: "vip-channel",
        message: "Help me!",
      }),
    );

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        subject: expect.stringContaining("New VIP Message"),
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
        emailEscalationRecipients: "admin@example.com",
      },
    });

    const customerEmail = "vip@example.com";
    await platformCustomerFactory.create({
      email: customerEmail,
      value: "20000",
      name: "VIP Customer",
    });

    const { conversation } = await conversationFactory.create({
      emailFrom: customerEmail,
      status: "open",
    });

    const { message } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      body: "Help me!",
      cleanedUpText: "Help me!",
    });

    await notifyVipMessage({ messageId: message.id });

    expect(postVipMessageToSlack).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
      }),
    );
  });

  it("sends only Slack if Email is not configured", async () => {
    await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        vipChannelId: "vip-channel",
        vipThreshold: 100,
        emailEscalationRecipients: null,
      },
    });

    const customerEmail = "vip@example.com";
    await platformCustomerFactory.create({
      email: customerEmail,
      value: "20000",
      name: "VIP Customer",
    });

    const { conversation } = await conversationFactory.create({
      emailFrom: customerEmail,
      status: "open",
    });

    const { message } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      body: "Help me!",
    });

    await notifyVipMessage({ messageId: message.id });

    expect(postVipMessageToSlack).toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("does not send notifications if customer is not VIP", async () => {
    await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        vipChannelId: "vip-channel",
        vipThreshold: 100,
        emailEscalationRecipients: "admin@example.com",
      },
    });

    const customerEmail = "regular@example.com";
    await platformCustomerFactory.create({
      email: customerEmail,
      value: "5000", // $50 < $100
      name: "Regular Customer",
    });

    const { conversation } = await conversationFactory.create({
      emailFrom: customerEmail,
      status: "open",
    });

    const { message } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      body: "Help me!",
      cleanedUpText: "Help me!",
    });

    await notifyVipMessage({ messageId: message.id });

    expect(postVipMessageToSlack).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("sends email updates when agents reply to VIP conversations", async () => {
    await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        vipChannelId: "vip-channel",
        vipThreshold: 100,
        emailEscalationRecipients: "admin@example.com",
      },
    });

    const customerEmail = "vip@example.com";
    await platformCustomerFactory.create({
      email: customerEmail,
      value: "20000",
      name: "VIP Customer",
    });

    const { conversation } = await conversationFactory.create({
      emailFrom: customerEmail,
      status: "open",
    });

    // Original user message
    const { message: userMessage } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      body: "Help me!",
      cleanedUpText: "Help me!",
      slackMessageTs: "123456.789",
    });

    // Agent reply
    const { message: agentMessage } = await conversationMessagesFactory.create(conversation.id, {
      role: "staff",
      body: "On it!",
      cleanedUpText: "On it!",
      responseToId: userMessage.id,
    });

    await notifyVipMessage({ messageId: agentMessage.id });

    expect(updateVipMessageInSlack).toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        subject: expect.stringContaining("replied"),
        html: expect.stringContaining("On it!"),
      }),
    );
  });
});
