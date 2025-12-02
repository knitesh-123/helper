import { endOfWeek, startOfWeek, subWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Resend } from "resend";
import { mailboxes } from "@/db/schema";
import { TIME_ZONE } from "@/jobs/generateDailyReports";
import { triggerEvent } from "@/jobs/trigger";
import { getMailbox } from "@/lib/data/mailbox";
import { getMemberStats } from "@/lib/data/stats";
import WeeklyReportEmail from "@/lib/emails/weeklyReport";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

const formatDateRange = (start: Date, end: Date) => {
  return `Week of ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`;
};

export async function generateWeeklyReports() {
  const mailbox = await getMailbox();
  if (!mailbox) return;

  const hasEmail = mailbox.emailEscalationRecipients;

  if (!hasEmail) return;

  await triggerEvent("reports/weekly", {});
}

export const generateMailboxWeeklyReport = async () => {
  const mailbox = await getMailbox();
  if (!mailbox) {
    return;
  }

  const hasEmail = mailbox.emailEscalationRecipients;

  // drizzle doesn't appear to do any type narrowing, even though we've filtered for non-null values
  // @see https://github.com/drizzle-team/drizzle-orm/issues/2956
  if (!hasEmail) {
    return;
  }

  const result = await generateMailboxReport({
    mailbox,
    hasEmail: !!hasEmail,
  });

  return result;
};

export async function generateMailboxReport({
  mailbox,
  hasEmail,
}: {
  mailbox: typeof mailboxes.$inferSelect;
  hasEmail: boolean;
}) {
  const now = toZonedTime(new Date(), TIME_ZONE);
  const lastWeekStart = subWeeks(startOfWeek(now, { weekStartsOn: 0 }), 1);
  const lastWeekEnd = subWeeks(endOfWeek(now, { weekStartsOn: 0 }), 1);

  const stats = await getMemberStats({
    startDate: lastWeekStart,
    endDate: lastWeekEnd,
  });

  if (!stats.length) {
    return "No stats found";
  }

  if (hasEmail && mailbox.emailEscalationRecipients && env.RESEND_API_KEY && env.RESEND_FROM_ADDRESS) {
    try {
      const resend = new Resend(env.RESEND_API_KEY);
      const recipients = mailbox.emailEscalationRecipients
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      if (recipients.length > 0) {
        // Prepare data for email
        const activeMembers = stats
          .filter((member) => member.replyCount > 0)
          .sort((a, b) => b.replyCount - a.replyCount)
          .map((member) => ({
            name: member.displayName || member.email || "Unknown",
            count: member.replyCount,
          }));

        const inactiveMembers = stats
          .filter((member) => member.replyCount === 0)
          .map((member) => member.displayName || member.email || "Unknown");

        const totalTicketsResolved = stats.reduce((sum, member) => sum + member.replyCount, 0);
        const activeUserCount = activeMembers.length;

        await resend.emails.send({
          from: env.RESEND_FROM_ADDRESS,
          to: recipients,
          subject: `Weekly summary for ${mailbox.name}`,
          react: WeeklyReportEmail({
            mailboxName: mailbox.name,
            startDate: lastWeekStart,
            endDate: lastWeekEnd,
            activeMembers,
            inactiveMembers,
            totalTicketsResolved,
            activeUserCount,
          }),
        });
      }
    } catch (error) {
      captureExceptionAndLog(error);
    }
  }

  return "Report sent";
}
