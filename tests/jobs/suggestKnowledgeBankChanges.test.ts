import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { suggestKnowledgeBankChanges } from "@/jobs/suggestKnowledgeBankChanges";
import { generateKnowledgeBankSuggestion } from "@/lib/ai/knowledgeBankSuggestions";
import { getMailbox } from "@/lib/data/mailbox";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { postSlackMessage } from "@/lib/slack/client";

vi.mock("@/lib/data/mailbox", () => ({
  getMailbox: vi.fn(),
}));

vi.mock("@/lib/slack/client", () => ({
  postSlackMessage: vi.fn().mockResolvedValue("mock-message-ts"),
}));

vi.mock("@/lib/ai/knowledgeBankSuggestions", () => ({
  generateKnowledgeBankSuggestion: vi.fn(),
}));

vi.mock("@/lib/shared/sentry", () => ({
  captureExceptionAndLog: vi.fn(),
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

describe("suggestKnowledgeBankChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends Slack notification when configured", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
      },
    });

    const { conversation } = await conversationFactory.create();
    const message = await conversationFactory.createUserEmail(conversation.id, {
      body: "Test AI response",
      role: "ai_assistant",
    });

    vi.mocked(getMailbox).mockResolvedValue(mailbox);
    vi.mocked(generateKnowledgeBankSuggestion).mockResolvedValue({
      action: "create_entry",
      content: "New knowledge bank entry content",
    });

    await suggestKnowledgeBankChanges({
      messageId: message.id,
      reason: "Test reason",
    });

    expect(postSlackMessage).toHaveBeenCalledWith(
      "valid-token",
      expect.objectContaining({
        channel: "channel-id",
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: "section",
            text: expect.objectContaining({
              text: expect.stringContaining("New suggested addition to the knowledge bank"),
            }),
          }),
        ]),
      }),
    );
  });

  it("sends email notification when configured", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        emailEscalationRecipients: "admin@example.com",
      },
    });

    const { conversation } = await conversationFactory.create();
    const message = await conversationFactory.createUserEmail(conversation.id, {
      body: "Test AI response",
      role: "ai_assistant",
    });

    vi.mocked(getMailbox).mockResolvedValue(mailbox);
    vi.mocked(generateKnowledgeBankSuggestion).mockResolvedValue({
      action: "create_entry",
      content: "New knowledge bank entry content",
    });

    await suggestKnowledgeBankChanges({
      messageId: message.id,
      reason: "Test reason",
    });

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["admin@example.com"],
        subject: `Knowledge Bank: New suggested addition for ${mailbox.name}`,
      }),
    );
  });

  it("sends both Slack and email when both are configured", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
        emailEscalationRecipients: "admin@example.com",
      },
    });

    const { conversation } = await conversationFactory.create();
    const message = await conversationFactory.createUserEmail(conversation.id, {
      body: "Test AI response",
      role: "ai_assistant",
    });

    vi.mocked(getMailbox).mockResolvedValue(mailbox);
    vi.mocked(generateKnowledgeBankSuggestion).mockResolvedValue({
      action: "create_entry",
      content: "New knowledge bank entry content",
    });

    await suggestKnowledgeBankChanges({
      messageId: message.id,
      reason: "Test reason",
    });

    // Wait for async notifications to complete (notifySuggestedEdit is fire-and-forget)
    await vi.waitFor(() => {
      expect(postSlackMessage).toHaveBeenCalled();
      expect(sendEmailMock).toHaveBeenCalled();
    });

    expect(captureExceptionAndLog).not.toHaveBeenCalled();
  });

  it("does not send notifications when neither Slack nor email is configured", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: null,
        slackAlertChannel: null,
        emailEscalationRecipients: null,
      },
    });

    const { conversation } = await conversationFactory.create();
    const message = await conversationFactory.createUserEmail(conversation.id, {
      body: "Test AI response",
      role: "ai_assistant",
    });

    vi.mocked(getMailbox).mockResolvedValue(mailbox);
    vi.mocked(generateKnowledgeBankSuggestion).mockResolvedValue({
      action: "create_entry",
      content: "New knowledge bank entry content",
    });

    await suggestKnowledgeBankChanges({
      messageId: message.id,
      reason: "Test reason",
    });

    expect(postSlackMessage).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
