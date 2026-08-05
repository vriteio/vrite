/** @jsxImportSource react */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Hr,
  Text,
  Row,
  Column
} from "@react-email/components";
import * as React from "react";

interface VerificationOTPProps {
  code?: string;
  link?: string;
  type?: "sign-in" | "email-verification";
}

// TODO: Update social links
const HTTP_PROTOCOL = process.env.PUBLIC_SECURE === "true" ? "https" : "http";
const PUBLIC_APP_HOST = process.env.PUBLIC_APP_HOST || "localhost:3000";
const PUBLIC_APP_URL = `${HTTP_PROTOCOL}://${PUBLIC_APP_HOST}`;
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
      <Head />
      <Preview>Verify your email. Your verification code: {code}</Preview>
      <Tailwind>
        <Body className="text-gray-800 my-auto mx-auto font-sans">
          <Container className="mx-auto w-[560px]">
            <Section className="my-[32px]">
              <Img
                src={`${PUBLIC_APP_URL}/assets/banner.png`}
                width="500"
                height="32"
                alt="Andesine"
                className="my-0 mr-auto"
              />
            </Section>
            <Heading className="text-[36px] font-bold text-start p-0 mb-[12px] mx-0">
              {content.heading}
            </Heading>
            <Text className="text-[20px] leading-[28px]">{content.text}</Text>
            <Section className="text-[30px] py-[48px] mt-[24px] bg-gray-100 rounded-[8px] text-center font-medium font-mono">
              {code}
            </Section>
            {link && (
              <Section className="text-center mt-[12px] mb-[24px]">
                <Button
                  href={link}
                  className="inline-block bg-gray-900 text-white text-[16px] font-medium py-[12px] rounded-[8px] w-[560px]"
                >
                  {type === "sign-in"
                    ? "Or sign in with this link"
                    : "Or verify your email with this link"}
                </Button>
              </Section>
            )}

            <Text className="text-[20px] leading-[28px]">{content.subtext}</Text>
            <Hr className="my-[24px]" />
            <Row className="mb-[16px]">
              <Column className="my-0">
                <Row>
                  <Column className="my-0">
                    <Link href="https://x.com/vriteio">
                      <Img src={`${PUBLIC_APP_URL}/assets/x.svg`} className="w-[24px]" />
                    </Link>
                  </Column>
                  <Column className="my-0">
                    <Link href="https://www.linkedin.com/company/vrite">
                      <Img src={`${PUBLIC_APP_URL}/assets/linkedin.svg`} className="w-[24px]" />
                    </Link>
                  </Column>
                  <Column className="my-0">
                    <Link href="https://github.com/vriteio/vrite">
                      <Img src={`${PUBLIC_APP_URL}/assets/github.svg`} className="w-[24px]" />
                    </Link>
                  </Column>
                </Row>
              </Column>
              <Column className="w-[80%] text-[16px] text-gray-300 my-0"></Column>
            </Row>
            <Row className="mb-[24px]">
              <Column className="text-[12px] leading-[16px] text-gray-400 my-0 font-mono">
                Andesine, the adaptive
                <br /> content workspace.
              </Column>
            </Row>
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
