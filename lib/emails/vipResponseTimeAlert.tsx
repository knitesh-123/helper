import { Body, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import React from "react";
import { getBaseUrl } from "@/components/constants";

type OverdueVipTicket = {
  subject: string;
  slug: string;
  customerName: string;
  timeSinceLastReply: string;
};

type Props = {
  mailboxName: string;
  overdueTickets: OverdueVipTicket[];
  totalOverdueCount: number;
  vipExpectedResponseHours: number;
};

const baseUrl = getBaseUrl();

const VipResponseTimeAlertEmail = (props: Props) => {
  const { mailboxName, overdueTickets, totalOverdueCount, vipExpectedResponseHours } = props;

  const ticketText = totalOverdueCount === 1 ? "VIP ticket has" : "VIP tickets have";
  const hourText = vipExpectedResponseHours === 1 ? "hour" : "hours";

  return (
    <Html>
      <Head />
      <Preview>{`🚨 ${totalOverdueCount} ${ticketText} been waiting over ${vipExpectedResponseHours} ${hourText}`}</Preview>
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
            VIP Response Time Alert for {mailboxName}
          </Text>

          <Text
            style={{
              fontSize: "1rem",
              color: "#dc2626",
              fontWeight: "bold",
              marginBottom: "1.5rem",
            }}
          >
            🚨 {totalOverdueCount} {ticketText} been waiting over {vipExpectedResponseHours} {hourText}
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
                  {ticket.customerName}, {ticket.timeSinceLastReply} since last reply
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
              href={`${baseUrl}?utm_source=vip-response-alert&utm_medium=email`}
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

VipResponseTimeAlertEmail.PreviewProps = {
  mailboxName: "Support",
  totalOverdueCount: 5,
  vipExpectedResponseHours: 2,
  overdueTickets: [
    {
      subject: "Critical: Payment failure",
      slug: "789",
      customerName: "Acme Corp",
      timeSinceLastReply: "2 hours 15 minutes",
    },
    {
      subject: "Account access issue",
      slug: "101",
      customerName: "Globex Inc",
      timeSinceLastReply: "3 hours",
    },
  ],
} satisfies Props;

export default VipResponseTimeAlertEmail;
