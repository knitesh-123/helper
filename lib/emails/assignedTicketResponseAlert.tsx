import { Body, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import React from "react";
import { getBaseUrl } from "@/components/constants";

type OverdueTicket = {
  subject: string;
  slug: string;
  assigneeName: string;
  timeSinceLastReply: string;
};

type Props = {
  mailboxName: string;
  overdueTickets: OverdueTicket[];
  totalOverdueCount: number;
};

const baseUrl = getBaseUrl();

const AssignedTicketResponseAlertEmail = (props: Props) => {
  const { mailboxName, overdueTickets, totalOverdueCount } = props;

  return (
    <Html>
      <Head />
      <Preview>{`🚨 ${totalOverdueCount} assigned tickets have been waiting over 24 hours`}</Preview>
      <Body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
          backgroundColor: "#ffffff",
          padding: "20px",
        }}
      >
        <Section
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
          }}
        >
          <Text
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "0.5rem",
              color: "#1a1a1a",
            }}
          >
            Assigned Ticket Response Time Alert for {mailboxName}
          </Text>

          <Text
            style={{
              fontSize: "1rem",
              color: "#dc2626",
              fontWeight: "bold",
              marginBottom: "1.5rem",
            }}
          >
            🚨 {totalOverdueCount} assigned tickets have been waiting over 24 hours without a response
          </Text>

          <div
            style={{
              background: "#fef2f2",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #fee2e2",
              marginBottom: "1.5rem",
            }}
          >
            {overdueTickets.map((ticket, index) => (
              <div key={index} style={{ marginBottom: "12px" }}>
                <Link
                  href={`${baseUrl}/conversations?id=${ticket.slug}`}
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: "600",
                    color: "#1a1a1a",
                    textDecoration: "none",
                  }}
                >
                  • {ticket.subject || "No subject"}
                </Link>
                <Text
                  style={{
                    margin: "4px 0 0 12px",
                    fontSize: "0.875rem",
                    color: "#4b5563",
                  }}
                >
                  Assigned to {ticket.assigneeName}, {ticket.timeSinceLastReply} since last reply
                </Text>
              </div>
            ))}

            {totalOverdueCount > overdueTickets.length && (
              <Text
                style={{
                  margin: "12px 0 0 0",
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  fontStyle: "italic",
                }}
              >
                (and {totalOverdueCount - overdueTickets.length} more)
              </Text>
            )}
          </div>

          <Hr style={{ margin: "1.5rem 0", borderColor: "#e5e7eb" }} />

          <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
            <span style={{ opacity: 0.6 }}>Powered by</span>
            <Link
              href={`${baseUrl}?utm_source=assigned-ticket-alert&utm_medium=email`}
              target="_blank"
              style={{ color: "#6b7280", textDecoration: "none" }}
            >
              <Img
                src={`${baseUrl}/logo_mahogany_900_for_email.png`}
                width="64"
                alt="Helper Logo"
                style={{ verticalAlign: "middle", marginLeft: "0.125rem" }}
              />
            </Link>
          </Text>
        </Section>
      </Body>
    </Html>
  );
};

AssignedTicketResponseAlertEmail.PreviewProps = {
  mailboxName: "Support",
  totalOverdueCount: 12,
  overdueTickets: [
    {
      subject: "Urgent: Login issue",
      slug: "123",
      assigneeName: "Sarah Smith",
      timeSinceLastReply: "1 day 2 hours",
    },
    {
      subject: "Feature request",
      slug: "456",
      assigneeName: "John Doe",
      timeSinceLastReply: "2 days 5 hours",
    },
  ],
} satisfies Props;

export default AssignedTicketResponseAlertEmail;
