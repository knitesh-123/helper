import { endOfWeek, startOfWeek, subWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Resend } from "resend";
import { assertDefined } from "@/components/utils/assert";
import { mailboxes } from "@/db/schema";
import { TIME_ZONE } from "@/jobs/generateDailyReports";
import { triggerEvent } from "@/jobs/trigger";
import { getMailbox } from "@/lib/data/mailbox";
import { getMemberStats, MemberStats } from "@/lib/data/stats";
import WeeklyReportEmail from "@/lib/emails/weeklyReport";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { getSlackUsersByEmail, postSlackMessage } from "@/lib/slack/client";

const formatDateRange = (start: Date, end: Date) => {
  return `Week of ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`;
};

export async function generateWeeklyReports() {
  const mailbox = await getMailbox();
  if (!mailbox) return;
  
  const hasSlack = mailbox.slackBotToken && mailbox.slackAlertChannel;
  const hasEmail = mailbox.emailEscalationRecipients;

  if (!hasSlack && !hasEmail) return;

  await triggerEvent("reports/weekly", {});
}

export const generateMailboxWeeklyReport = async () => {
  const mailbox = await getMailbox();
  if (!mailbox) {
    return;
  }

  const hasSlack = mailbox.slackBotToken && mailbox.slackAlertChannel;
  const hasEmail = mailbox.emailEscalationRecipients;

  // drizzle doesn't appear to do any type narrowing, even though we've filtered for non-null values
  // @see https://github.com/drizzle-team/drizzle-orm/issues/2956
  if (!hasSlack && !hasEmail) {
    return;
  }

  const result = await generateMailboxReport({
    mailbox,
    slackBotToken: mailbox.slackBotToken || "",
    slackAlertChannel: mailbox.slackAlertChannel || "",
    hasSlack: !!hasSlack,
    hasEmail: !!hasEmail,
  });

  return result;
};

export async function generateMailboxReport({
  mailbox,
  slackBotToken,
  slackAlertChannel,
  hasSlack,
  hasEmail,
}: {
  mailbox: typeof mailboxes.$inferSelect;
  slackBotToken: string;
  slackAlertChannel: string;
  hasSlack: boolean;
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

  if (hasSlack) {
    const slackUsersByEmail = await getSlackUsersByEmail(slackBotToken);
    const allMembersData = processAllMembers(stats, slackUsersByEmail);
    const tableData: { name: string; count: number; slackUserId?: string }[] = [];

    for (const member of stats) {
      const name = member.displayName || `Unnamed user: ${member.id}`;
      const slackUserId = slackUsersByEmail.get(assertDefined(member.email));

      tableData.push({
        name,
        count: member.replyCount,
        slackUserId,
      });
    }

    const humanUsers = tableData.sort((a, b) => b.count - a.count);
    const totalTicketsResolved = tableData.reduce((sum, agent) => sum + agent.count, 0);
    const activeUserCount = humanUsers.filter((user) => user.count > 0).length;

    const peopleText = activeUserCount === 1 ? "person" : "people";

    const blocks: any[] = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: `Last week in the ${mailbox.name} mailbox:`,
          emoji: true,
        },
      },
    ];

    if (allMembersData.activeLines.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Team members:*",
        },
      });

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: allMembersData.activeLines.join("\n"),
        },
      });
    }

    if (allMembersData.inactiveList) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*No tickets answered:* ${allMembersData.inactiveList}`,
        },
      });
    }

    blocks.push({ type: "divider" });

    const summaryParts = [];
    if (totalTicketsResolved > 0) {
      summaryParts.push("*Total replies:*");
      summaryParts.push(`${totalTicketsResolved.toLocaleString()} from ${activeUserCount} ${peopleText}`);
    }

    if (summaryParts.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: summaryParts.join("\n"),
        },
      });
    }

    try {
      await postSlackMessage(slackBotToken, {
        channel: slackAlertChannel,
        text: formatDateRange(lastWeekStart, lastWeekEnd),
        blocks,
      });
    } catch (error) {
      captureExceptionAndLog(error);
    }
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

function processAllMembers(members: MemberStats, slackUsersByEmail: Map<string, string>) {
  const activeMembers = members.filter((member) => member.replyCount > 0).sort((a, b) => b.replyCount - a.replyCount);
  const inactiveMembers = members.filter((member) => member.replyCount === 0);

  const activeLines = activeMembers.map((member) => {
    const formattedCount = member.replyCount.toLocaleString();
    const slackUserId = slackUsersByEmail.get(member.email!);
    const userName = slackUserId ? `<@${slackUserId}>` : member.displayName || member.email || "Unknown";

    return `• ${userName}: ${formattedCount}`;
  });

  const inactiveList =
    inactiveMembers.length > 0
      ? inactiveMembers
          .map((member) => {
            const slackUserId = slackUsersByEmail.get(member.email!);
            const userName = slackUserId ? `<@${slackUserId}>` : member.displayName || member.email || "Unknown";

            return userName;
          })
          .join(", ")
      : "";

  return { activeLines, inactiveList };
}
