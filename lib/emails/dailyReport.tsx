import React from "react";
import { Body, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type Props = {
  mailboxName: string;
  openCountMessage: string;
  answeredCountMessage: string;
  openTicketsOverZeroMessage?: string | null;
  answeredTicketsOverZeroMessage?: string | null;
  avgReplyTimeMessage?: string | null;
  vipAvgReplyTimeMessage?: string | null;
  avgWaitTimeMessage?: string | null;
};

const baseUrl = getBaseUrl();

const DailyReportEmail = (props: Props) => {
  const {
    mailboxName,
    openCountMessage,
    answeredCountMessage,
    openTicketsOverZeroMessage,
    answeredTicketsOverZeroMessage,
    avgReplyTimeMessage,
    vipAvgReplyTimeMessage,
    avgWaitTimeMessage,
  } = props;

  const stats = [
    openCountMessage,
    answeredCountMessage,
    openTicketsOverZeroMessage,
    answeredTicketsOverZeroMessage,
    avgReplyTimeMessage,
    vipAvgReplyTimeMessage,
    avgWaitTimeMessage,
  ].filter(Boolean);

  return (
    <Html>
      <Head />
      <Preview>Daily summary for {mailboxName}</Preview>
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
            Daily summary for {mailboxName}
          </Text>

          <Text
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginBottom: "1.5rem",
            }}
          >
            Here's your daily support metrics overview
          </Text>

          <div
            style={{
              background: "#f8f9fa",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              marginBottom: "1.5rem",
            }}
          >
            {stats.map((stat, index) => (
              <Text
                key={index}
                style={{
                  margin: "8px 0",
                  fontSize: "0.9375rem",
                  color: "#374151",
                  lineHeight: "1.6",
                }}
              >
                {stat}
              </Text>
            ))}
          </div>

          <Hr style={{ margin: "1.5rem 0", borderColor: "#e5e7eb" }} />

          <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
            <span style={{ opacity: 0.6 }}>Powered by</span>
            <Link
              href={`${baseUrl}?utm_source=daily-report&utm_medium=email`}
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

DailyReportEmail.PreviewProps = {
  mailboxName: "Support",
  openCountMessage: "• Open tickets: 42",
  answeredCountMessage: "• Tickets answered: 18",
  openTicketsOverZeroMessage: "• Open tickets over $0: 35",
  answeredTicketsOverZeroMessage: "• Tickets answered over $0: 15",
  avgReplyTimeMessage: "• Average reply time: 2h 15m",
  vipAvgReplyTimeMessage: "• VIP average reply time: 1h 30m",
  avgWaitTimeMessage: "• Average time existing open tickets have been open: 12h 45m",
} satisfies Props;

export default DailyReportEmail;

