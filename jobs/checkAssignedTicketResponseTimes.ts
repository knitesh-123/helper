import { render } from "@react-email/render";
import { intervalToDuration, isWeekend } from "date-fns";
import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db/client";
import { conversations, userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { getMailbox } from "@/lib/data/mailbox";
import AssignedTicketResponseAlertEmail from "@/lib/emails/assignedTicketResponseAlert";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export function formatDuration(start: Date): string {
  const duration = intervalToDuration({ start, end: new Date() });

  const parts: string[] = [];

  if (duration.days && duration.days > 0) {
    parts.push(`${duration.days} ${duration.days === 1 ? "day" : "days"}`);
  }

  if (duration.hours && duration.hours > 0) {
    parts.push(`${duration.hours} ${duration.hours === 1 ? "hour" : "hours"}`);
  }

  if (duration.minutes && duration.minutes > 0) {
    parts.push(`${duration.minutes} ${duration.minutes === 1 ? "minute" : "minutes"}`);
  }

  return parts.join(" ");
}

export const checkAssignedTicketResponseTimes = async (now = new Date()) => {
  if (isWeekend(now)) return { success: true, skipped: "weekend" };

  const mailbox = await getMailbox();
  if (!mailbox) return;

  const hasEmail = mailbox.emailEscalationRecipients;

  if (!hasEmail) return;

  const failedMailboxes: { id: number; name: string; slug: string; error: string }[] = [];

  const users = await db
    .select({
      id: userProfiles.id,
      displayName: userProfiles.displayName,
      email: authUsers.email,
      permissions: userProfiles.permissions,
      access: userProfiles.access,
    })
    .from(userProfiles)
    .innerJoin(authUsers, eq(userProfiles.id, authUsers.id));

  const usersById = Object.fromEntries(users.map((user) => [user.id, user]));

  if (mailbox.preferences?.disableTicketResponseTimeAlerts) return { success: true, skipped: "disabled" };

  try {
    const overdueAssignedConversations = await db
      .select({
        subject: conversations.subject,
        slug: conversations.slug,
        assignedToId: conversations.assignedToId,
        lastUserEmailCreatedAt: conversations.lastUserEmailCreatedAt,
      })
      .from(conversations)
      .where(
        and(
          isNotNull(conversations.assignedToId),
          isNull(conversations.mergedIntoId),
          eq(conversations.status, "open"),
          gt(
            sql`EXTRACT(EPOCH FROM (${now.toISOString()}::timestamp - ${conversations.lastUserEmailCreatedAt})) / 3600`,
            24, // 24 hours threshold
          ),
        ),
      )
      .orderBy(desc(conversations.lastUserEmailCreatedAt));

    if (!overdueAssignedConversations.length) return { success: true, skipped: "no_overdue" };

    // Send Email Alert
    if (hasEmail && mailbox.emailEscalationRecipients && env.RESEND_API_KEY && env.RESEND_FROM_ADDRESS) {
      try {
        const resend = new Resend(env.RESEND_API_KEY);
        const recipients = mailbox.emailEscalationRecipients
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean);

        if (recipients.length > 0) {
          const overdueTickets = overdueAssignedConversations.slice(0, 10).map((conversation) => {
            const assignee = usersById[conversation.assignedToId!];
            return {
              subject: conversation.subject || "No subject",
              slug: conversation.slug,
              assigneeName: assignee?.displayName || assignee?.email || "Unknown",
              timeSinceLastReply: formatDuration(conversation.lastUserEmailCreatedAt!),
            };
          });

          const emailHtml = await render(
            AssignedTicketResponseAlertEmail({
              mailboxName: mailbox.name,
              overdueTickets,
              totalOverdueCount: overdueAssignedConversations.length,
            }),
          );

          await resend.emails.send({
            from: env.RESEND_FROM_ADDRESS,
            to: recipients,
            subject: `Assigned Ticket Response Time Alert for ${mailbox.name}`,
            html: emailHtml,
          });
        }
      } catch (error) {
        captureExceptionAndLog(error);
      }
    }
  } catch (error) {
    failedMailboxes.push({
      id: mailbox.id,
      name: mailbox.name,
      slug: mailbox.slug,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    success: failedMailboxes.length === 0,
    failedMailboxes,
  };
};
