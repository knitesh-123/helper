import { render } from "@react-email/render";
import { KnownBlock } from "@slack/web-api";
import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { Resend } from "resend";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { conversations, mailboxes, platformCustomers } from "@/db/schema";
import { formatDuration } from "@/jobs/checkAssignedTicketResponseTimes";
import VipResponseTimeAlertEmail from "@/lib/emails/vipResponseTimeAlert";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { postSlackMessage } from "@/lib/slack/client";

export const checkVipResponseTimes = async () => {
  const mailboxesList = await db.query.mailboxes.findMany({
    where: and(isNotNull(mailboxes.vipThreshold), isNotNull(mailboxes.vipExpectedResponseHours)),
  });

  if (!mailboxesList.length) return;

  for (const mailbox of mailboxesList) {
    const hasSlack = mailbox.slackBotToken && mailbox.vipChannelId;
    const hasEmail = mailbox.emailEscalationRecipients;

    if (!hasSlack && !hasEmail) continue;

    const overdueVipConversations = await db
      .select({
        name: platformCustomers.name,
        subject: conversations.subject,
        slug: conversations.slug,
        lastUserEmailCreatedAt: conversations.lastUserEmailCreatedAt,
      })
      .from(conversations)
      .innerJoin(platformCustomers, eq(conversations.emailFrom, platformCustomers.email))
      .where(
        and(
          isNull(conversations.assignedToId),
          isNull(conversations.mergedIntoId),
          eq(conversations.status, "open"),
          gt(
            sql`EXTRACT(EPOCH FROM (NOW() - ${conversations.lastUserEmailCreatedAt})) / 3600`,
            mailbox.vipExpectedResponseHours!,
          ),
          gt(sql`CAST(${platformCustomers.value} AS INTEGER)`, (mailbox.vipThreshold ?? 0) * 100),
        ),
      )
      .orderBy(desc(conversations.lastUserEmailCreatedAt));

    if (!overdueVipConversations.length) continue;

    // Send Slack Alert
    if (hasSlack && mailbox.slackBotToken && mailbox.vipChannelId) {
      try {
        const blocks: KnownBlock[] = [
          {
            type: "section" as const,
            text: {
              type: "mrkdwn",
              text: [
                `🚨 *${overdueVipConversations.length} ${overdueVipConversations.length === 1 ? "VIP" : "VIPs"} ${overdueVipConversations.length === 1 ? "has" : "have"} been waiting over ${
                  mailbox.vipExpectedResponseHours ?? 0
                } ${mailbox.vipExpectedResponseHours === 1 ? "hour" : "hours"}*\n`,
                ...overdueVipConversations
                  .slice(0, 10)
                  .map(
                    (conversation) =>
                      `• <${getBaseUrl()}/conversations?id=${conversation.slug}|${conversation.subject?.replace(/\|<>/g, "") ?? "No subject"}> (${conversation.name}, ${formatDuration(conversation.lastUserEmailCreatedAt!)} since last reply)`,
                  ),
                ...(overdueVipConversations.length > 10 ? [`(and ${overdueVipConversations.length - 10} more)`] : []),
              ].join("\n"),
            },
          },
        ];

        await postSlackMessage(mailbox.slackBotToken, {
          channel: mailbox.vipChannelId,
          text: `VIP Response Time Alert for ${mailbox.name}`,
          blocks,
        });
      } catch (error) {
        captureExceptionAndLog(error);
      }
    }

    // Send Email Alert
    if (hasEmail && mailbox.emailEscalationRecipients && env.RESEND_API_KEY && env.RESEND_FROM_ADDRESS) {
      try {
        const resend = new Resend(env.RESEND_API_KEY);
        const recipients = mailbox.emailEscalationRecipients
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean);

        if (recipients.length > 0) {
          const overdueTickets = overdueVipConversations.slice(0, 10).map((conversation) => ({
            subject: conversation.subject || "No subject",
            slug: conversation.slug,
            customerName: conversation.name || "Unknown Customer",
            timeSinceLastReply: formatDuration(conversation.lastUserEmailCreatedAt!),
          }));

          const emailHtml = await render(
            VipResponseTimeAlertEmail({
              mailboxName: mailbox.name,
              overdueTickets,
              totalOverdueCount: overdueVipConversations.length,
              vipExpectedResponseHours: mailbox.vipExpectedResponseHours!,
            }),
          );

          await resend.emails.send({
            from: env.RESEND_FROM_ADDRESS,
            to: recipients,
            subject: `VIP Response Time Alert for ${mailbox.name}`,
            html: emailHtml,
          });
        }
      } catch (error) {
        captureExceptionAndLog(error);
      }
    }
  }

  return { success: true };
};
