import { Body, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import React from "react";
import { getBaseUrl } from "@/components/constants";

type Props = {
  mailboxName: string;
  customerName: string;
  senderName?: string;
  title?: string;
  subject: string;
  messagePreview: string;
  conversationSlug: string;
};

const baseUrl = getBaseUrl();

const VipMessageNotificationEmail = (props: Props) => {
  const { mailboxName, customerName, senderName, title, subject, messagePreview, conversationSlug } = props;
  const heading = title ?? `New VIP Message for ${mailboxName}`;
  const author = senderName ?? customerName;

  return (
    <Html>
      <Head />
      <Preview>{`${heading} - ${subject}`}</Preview>
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
            {heading}
          </Text>

          <Text
            style={{
              fontSize: "1rem",
              color: "#1a1a1a",
              marginBottom: "1.5rem",
            }}
          >
            <strong>{author}</strong> sent a new message:
          </Text>

          <div
            style={{
              background: "#f9fafb",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              marginBottom: "1.5rem",
            }}
          >
            <Link
              href={`${baseUrl}/conversations?id=${conversationSlug}`}
              style={{
                fontSize: "1.125rem",
                fontWeight: "600",
                color: "#1a1a1a",
                textDecoration: "none",
                display: "block",
                marginBottom: "8px",
              }}
            >
              {subject || "No subject"}
            </Link>
            <Text
              style={{
                fontSize: "0.9375rem",
                color: "#4b5563",
                margin: "0",
                whiteSpace: "pre-wrap",
              }}
            >
              {messagePreview}
            </Text>
          </div>

          <Link
            href={`${baseUrl}/conversations?id=${conversationSlug}`}
            style={{
              backgroundColor: "#1a1a1a",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "0.9375rem",
              display: "inline-block",
            }}
          >
            View Conversation
          </Link>

          <Hr style={{ margin: "1.5rem 0", borderColor: "#e5e7eb" }} />

          <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
            <span style={{ opacity: 0.6 }}>Powered by</span>
            <Link
              href={`${baseUrl}?utm_source=vip-message-notification&utm_medium=email`}
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

VipMessageNotificationEmail.PreviewProps = {
  mailboxName: "Support",
  customerName: "Acme Corp",
  senderName: "Acme Corp",
  subject: "Urgent: System Down",
  messagePreview: "Our production system is down and we need immediate assistance. Please help!",
  conversationSlug: "123",
} satisfies Props;

export default VipMessageNotificationEmail;
