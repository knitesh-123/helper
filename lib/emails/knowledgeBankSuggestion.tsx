import { Body, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import React from "react";
import { getBaseUrl } from "@/components/constants";

type Props = {
  mailboxName: string;
  suggestedContent: string;
  isEdit: boolean;
  originalContent?: string | null;
};

const baseUrl = getBaseUrl();

const KnowledgeBankSuggestionEmail = (props: Props) => {
  const { mailboxName, suggestedContent, isEdit, originalContent } = props;

  const title = isEdit ? "New suggested edit for the knowledge bank" : "New suggested addition to the knowledge bank";

  return (
    <Html>
      <Head />
      <Preview>💡 {title}</Preview>
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
            Knowledge Bank Suggestion for {mailboxName}
          </Text>

          <Text
            style={{
              fontSize: "1rem",
              color: "#2563eb",
              fontWeight: "bold",
              marginBottom: "1.5rem",
            }}
          >
            💡 {title}
          </Text>

          <div
            style={{
              background: "#f0f9ff",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #bae6fd",
              marginBottom: "1.5rem",
            }}
          >
            <Text
              style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#0369a1",
                marginBottom: "8px",
              }}
            >
              Suggested content:
            </Text>
            <Text
              style={{
                fontSize: "0.9375rem",
                color: "#1a1a1a",
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
              }}
            >
              {suggestedContent}
            </Text>
          </div>

          {isEdit && originalContent && (
            <div
              style={{
                background: "#fef3c7",
                padding: "20px",
                borderRadius: "8px",
                border: "1px solid #fcd34d",
                marginBottom: "1.5rem",
              }}
            >
              <Text
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#92400e",
                  marginBottom: "8px",
                }}
              >
                This will overwrite the current entry:
              </Text>
              <Text
                style={{
                  fontSize: "0.9375rem",
                  color: "#1a1a1a",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                }}
              >
                {originalContent}
              </Text>
            </div>
          )}

          <Link
            href={`${baseUrl}/settings/knowledge`}
            style={{
              display: "inline-block",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "0.9375rem",
            }}
          >
            Review in Knowledge Bank →
          </Link>

          <Hr style={{ margin: "1.5rem 0", borderColor: "#e5e7eb" }} />

          <Text style={{ fontSize: "0.75rem", lineHeight: "22px", marginTop: "0.75rem", marginBottom: "1.5rem" }}>
            <span style={{ opacity: 0.6 }}>Powered by</span>
            <Link
              href={`${baseUrl}?utm_source=knowledge-bank-suggestion&utm_medium=email`}
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

KnowledgeBankSuggestionEmail.PreviewProps = {
  mailboxName: "Support",
  suggestedContent:
    "Gumroad overview\n\n- What it is: An e-commerce platform where creators sell digital products and memberships.\n- For buyers: Secure checkout; instant access to downloads.\n- For creators: Simple product pages; subscriptions; discount codes.",
  isEdit: false,
  originalContent: null,
} satisfies Props;

export default KnowledgeBankSuggestionEmail;
