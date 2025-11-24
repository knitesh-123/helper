import { render } from "@react-email/render";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { ensureCleanedUpText } from "@/lib/data/conversationMessage";
import { getMailbox } from "@/lib/data/mailbox";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";
import { getBasicProfileById } from "@/lib/data/user";
import VipMessageNotificationEmail from "@/lib/emails/vipMessageNotification";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { postVipMessageToSlack, updateVipMessageInSlack } from "@/lib/slack/vipNotifications";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

type MessageWithConversationAndMailbox = typeof conversationMessages.$inferSelect & {
  conversation: typeof conversations.$inferSelect;
};

async function fetchConversationMessage(messageId: number): Promise<MessageWithConversationAndMailbox> {
  const message = assertDefinedOrRaiseNonRetriableError(
    await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.id, messageId),
      with: {
        conversation: {},
      },
    }),
  );

  if (message.conversation.mergedIntoId) {
    const mergedConversation = assertDefinedOrRaiseNonRetriableError(
      await db.query.conversations.findFirst({
        where: eq(conversations.id, message.conversation.mergedIntoId),
      }),
    );

    return { ...message, conversation: mergedConversation };
  }

  return message;
}

async function handleVipNotifications(message: MessageWithConversationAndMailbox) {
  const conversation = assertDefinedOrRaiseNonRetriableError(message.conversation);
  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailbox());

  if (conversation.isPrompt) {
    return "Not posted, prompt conversation";
  }
  if (!conversation.emailFrom) {
    return "Not posted, anonymous conversation";
  }

  const platformCustomer = await getPlatformCustomer(conversation.emailFrom);

  // Early return if not VIP
  if (!platformCustomer?.isVip) return "Not posted, not a VIP customer";

  const customerDisplayName = platformCustomer.name || conversation.emailFrom || "Unknown Customer";
  const conversationSubject = conversation.subject || "No subject";
  const recipients = mailbox.emailEscalationRecipients
    ? mailbox.emailEscalationRecipients
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean)
    : [];
  const canSendEmail = recipients.length > 0 && env.RESEND_API_KEY && env.RESEND_FROM_ADDRESS;

  let slackResult = "Skipped";
  let emailResult = "Skipped";
  let emailContext: {
    type: "user" | "reply";
    body: string;
    senderName?: string;
    title?: string;
  } | null = null;

  // Slack Notification
  if (mailbox.slackBotToken && mailbox.vipChannelId) {
    // If it's an agent reply updating an existing Slack message
    if (message.role !== "user" && message.responseToId) {
      const originalMessage = await db.query.conversationMessages.findFirst({
        where: eq(conversationMessages.id, message.responseToId),
      });

      if (originalMessage?.slackMessageTs) {
        const originalCleanedUpText = originalMessage ? await ensureCleanedUpText(originalMessage) : "";
        const replyCleanedUpText = await ensureCleanedUpText(message);
        const replyingUser = message.userId ? await getBasicProfileById(message.userId) : null;

        await updateVipMessageInSlack({
          conversation,
          mailbox,
          originalMessage: originalCleanedUpText,
          replyMessage: replyCleanedUpText,
          slackBotToken: mailbox.slackBotToken,
          slackChannel: mailbox.vipChannelId,
          slackMessageTs: originalMessage.slackMessageTs,
          user: replyingUser,
          email: true,
          closed: conversation.status === "closed",
        });
        slackResult = "Updated";

        const replySenderName =
          replyingUser?.displayName ??
          replyingUser?.email ??
          (message.role === "ai_assistant" ? "AI Assistant" : "Helper Team");
        emailContext = {
          type: "reply",
          body: replyCleanedUpText,
          senderName: replySenderName,
          title: `VIP Conversation Update for ${mailbox.name}`,
        };
      }
    } else if (message.role === "user") {
      const cleanedUpText = await ensureCleanedUpText(message);

      const slackMessageTs = await postVipMessageToSlack({
        conversation,
        mailbox,
        message: cleanedUpText,
        platformCustomer,
        slackBotToken: mailbox.slackBotToken,
        slackChannel: mailbox.vipChannelId,
      });

      await db
        .update(conversationMessages)
        .set({ slackMessageTs, slackChannel: mailbox.vipChannelId })
        .where(eq(conversationMessages.id, message.id));
      slackResult = "Posted";

      emailContext = {
        type: "user",
        body: cleanedUpText,
        senderName: customerDisplayName,
      };
    }
  } else {
    slackResult = "Not posted, mailbox not linked to Slack";

    if (message.role === "user") {
      const cleanedUpText = await ensureCleanedUpText(message);
      emailContext = {
        type: "user",
        body: cleanedUpText,
        senderName: customerDisplayName,
      };
    }
  }

  if (emailContext && canSendEmail) {
    try {
      const resend = new Resend(env.RESEND_API_KEY!);
      const emailHtml = await render(
        VipMessageNotificationEmail({
          mailboxName: mailbox.name,
          customerName: customerDisplayName,
          senderName: emailContext.senderName,
          title: emailContext.title,
          subject: conversationSubject,
          messagePreview: emailContext.body,
          conversationSlug: conversation.slug,
        }),
      );

      const emailSubject =
        emailContext.type === "reply"
          ? `${emailContext.senderName ?? "Your teammate"} replied to ${customerDisplayName}`
          : `New VIP Message from ${customerDisplayName}`;

      await resend.emails.send({
        from: env.RESEND_FROM_ADDRESS!,
        to: recipients,
        subject: emailSubject,
        html: emailHtml,
      });
      emailResult = "Sent";
    } catch (error) {
      captureExceptionAndLog(error);
      emailResult = "Failed";
    }
  }

  return `Slack: ${slackResult}, Email: ${emailResult}`;
}

export const notifyVipMessage = async ({ messageId }: { messageId: number }) => {
  const message = assertDefinedOrRaiseNonRetriableError(await fetchConversationMessage(messageId));
  return await handleVipNotifications(message);
};
