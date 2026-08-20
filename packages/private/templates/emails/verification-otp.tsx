/** @jsxImportSource react */

import {
  Body,
  Button,
  Container,
  Html,
  Preview,
  Section,
  Tailwind,
  Text
} from "@react-email/components";
import * as React from "react";
import { PUBLIC_APP_URL } from "../src/constants";
import { EmailFooter } from "../src/email-footer";
import { EmailHeader } from "../src/email-header";
import { EmailHead } from "../src/email-head";

interface VerificationOTPProps {
  code?: string;
  link?: string;
  type?: "sign-in" | "email-verification";
}

const VerificationOTP: React.FC<VerificationOTPProps> = ({
  code = "",
  link,
  type = "email-verification"
}) => {
  const getContent = () => {
    if (type === "sign-in") {
      return {
        heading: "Your sign-in code",
        text: "Use the following code to sign in to your Andesine account:",
        subtext:
          "If you didn't request this code, you can ignore this email. The code will expire in 5 minutes."
      };
    }

    return {
      heading: "Verify your email address",
      text: "Thanks for signing up for Andesine! To finish setting up your account, please verify your email using the code below:",
      subtext:
        "If you didn't sign up for Andesine, you can ignore this email. The code will expire in 5 minutes."
    };
  };
  const content = getContent();

  return (
    <Html>
      <EmailHead />
      <Preview>Verify your email. Your verification code: {code}</Preview>
      <Tailwind>
        <Body className="email-body bg-white text-gray-800 my-auto mx-auto font-sans">
          <Container className="email-container bg-white mx-auto w-[560px]">
            <EmailHeader>{content.heading}</EmailHeader>
            <Text className="text-[20px] leading-[28px]">{content.text}</Text>
            <Section className="email-code text-[30px] py-[48px] mt-[24px] bg-gray-100 rounded-[8px] text-center font-medium font-mono">
              {code}
            </Section>
            {link && (
              <Section className="text-center mt-[12px] mb-[24px]">
                <Button
                  href={link}
                  className="email-button inline-block bg-gray-900 text-white text-[16px] font-medium py-[12px] rounded-[8px] w-[560px]"
                >
                  {type === "sign-in"
                    ? "Or sign in with this link"
                    : "Or verify your email with this link"}
                </Button>
              </Section>
            )}

            <Text className="text-[20px] leading-[28px]">{content.subtext}</Text>
            <EmailFooter />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

// @ts-expect-error: React Email reads PreviewProps metadata that is absent from React.FC.
VerificationOTP.PreviewProps = {
  code: "123456",
  link: `${PUBLIC_APP_URL}/auth/email?token=example-token`,
  type: "email-verification"
};

export { VerificationOTP };
export type { VerificationOTPProps };
export default VerificationOTP;
