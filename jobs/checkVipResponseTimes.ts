import { render } from "@react-email/render";
import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db/client";
import { conversations, mailboxes, platformCustomers } from "@/db/schema";
import { formatDuration } from "@/jobs/checkAssignedTicketResponseTimes";
import VipResponseTimeAlertEmail from "@/lib/emails/vipResponseTimeAlert";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export const checkVipResponseTimes = async () => {
  const mailboxesList = await db.query.mailboxes.findMany({
    where: and(isNotNull(mailboxes.vipThreshold), isNotNull(mailboxes.vipExpectedResponseHours)),
  });

  if (!mailboxesList.length) return;

  for (const mailbox of mailboxesList) {
    const hasEmail = mailbox.emailEscalationRecipients;

    if (!hasEmail) continue;

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
