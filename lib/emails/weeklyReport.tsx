import React from "react";
import { Body, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import { getBaseUrl } from "@/components/constants";

type Props = {
  mailboxName: string;
  startDate: Date;
  endDate: Date;
  activeMembers: { name: string; count: number }[];
  inactiveMembers: string[];
  totalTicketsResolved: number;
  activeUserCount: number;
};

const baseUrl = getBaseUrl();

const WeeklyReportEmail = (props: Props) => {
  const {
    mailboxName,
    startDate,
    endDate,
    activeMembers,
    inactiveMembers,
    totalTicketsResolved,
    activeUserCount,
  } = props;

  const dateRange = `Week of ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`;
  const peopleText = activeUserCount === 1 ? "person" : "people";

  return (
    <Html>
      <Head />
      <Preview>Weekly summary for {mailboxName}</Preview>
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
            Weekly summary for {mailboxName}
          </Text>

          <Text
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginBottom: "1.5rem",
            }}
          >
            {dateRange}
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
            {activeMembers.length > 0 && (
              <>
                <Text
                  style={{
                    fontSize: "1rem",
                    fontWeight: "bold",
                    color: "#374151",
                    marginBottom: "12px",
                  }}
                >
                  Team members:
                </Text>
                {activeMembers.map((member, index) => (
                  <Text
                    key={index}
                    style={{
                      margin: "8px 0",
                      fontSize: "0.9375rem",
                      color: "#374151",
                    }}
                  >
                    • {member.name}: {member.count.toLocaleString()}
                  </Text>
                ))}
              </>
            )}

            {inactiveMembers.length > 0 && (
              <Text
                style={{
                  marginTop: "16px",
                  fontSize: "0.9375rem",
                  color: "#6b7280",
                }}
              >
                <strong>No tickets answered:</strong> {inactiveMembers.join(", ")}
              </Text>
            )}
          </div>

          {totalTicketsResolved > 0 && (
            <>
              <Hr style={{ margin: "1.5rem 0", borderColor: "#e5e7eb" }} />
              <div style={{ textAlign: "center" }}>
                <Text
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "bold",
                    color: "#1a1a1a",
                    margin: "0",
                  }}
                >
                  Total replies:
                </Text>
                <Text
                  style={{
                    fontSize: "1rem",
                    color: "#4b5563",
                    marginTop: "4px",
                  }}
                >
                  {totalTicketsResolved.toLocaleString()} from {activeUserCount} {peopleText}
                </Text>
              </div>
            </>
          )}

          <Hr style={{ margin: "1.5rem 0", borderColor: "#e5e7eb" }} />

          <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
            <span style={{ opacity: 0.6 }}>Powered by</span>
            <Link
              href={`${baseUrl}?utm_source=weekly-report&utm_medium=email`}
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

WeeklyReportEmail.PreviewProps = {
  mailboxName: "Support",
  startDate: new Date("2023-10-23"),
  endDate: new Date("2023-10-29"),
  activeMembers: [
    { name: "Sarah Smith", count: 145 },
    { name: "John Doe", count: 98 },
    { name: "Mike Johnson", count: 42 },
  ],
  inactiveMembers: ["Alice Brown", "Bob Wilson"],
  totalTicketsResolved: 285,
  activeUserCount: 3,
} satisfies Props;

export default WeeklyReportEmail;

