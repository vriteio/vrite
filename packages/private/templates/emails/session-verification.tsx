/** @jsxImportSource react */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Hr,
  Text
} from "@react-email/components";
import * as React from "react";

interface SessionVerificationProps {
  code?: string;
  link?: string;
}

const HTTP_PROTOCOL = process.env.PUBLIC_SECURE === "true" ? "https" : "http";
const PUBLIC_APP_HOST = process.env.PUBLIC_APP_HOST || "localhost:3000";
const PUBLIC_APP_URL = `${HTTP_PROTOCOL}://${PUBLIC_APP_HOST}`;
const SessionVerification: React.FC<SessionVerificationProps> = ({ code = "", link }) => {
  return (
    <Html>
      <Head />
      <Preview>Confirm this sensitive action. Your verification code: {code}</Preview>
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
              Verify it's you
            </Heading>
            <Text className="text-[20px] leading-[28px]">
              A sensitive action was requested in your Andesine account. Use this code to verify
              your identity and continue:
            </Text>
            <Section className="text-[30px] py-[48px] mt-[24px] bg-gray-100 rounded-[8px] text-center font-medium font-mono">
              {code}
            </Section>
            {link && (
              <Section className="text-center mt-[12px] mb-[24px]">
                <Button
                  href={link}
                  className="inline-block bg-gray-900 text-white text-[16px] font-medium py-[12px] rounded-[8px] w-[560px]"
                >
                  Or verify with this link
                </Button>
              </Section>
            )}
            <Text className="text-[20px] leading-[28px]">
              If you didn't request this action, you can ignore this email. The code will expire in
              5 minutes.
            </Text>
            <Hr className="my-[24px]" />
            <Text className="text-[12px] leading-[16px] text-gray-400 font-mono">
              Andesine, the adaptive
              <br /> content workspace.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

// @ts-ignore
SessionVerification.PreviewProps = {
  code: "123456",
  link: `${PUBLIC_APP_URL}/auth/email?mode=sign-in&token=example-token`
};

export { SessionVerification };
export type { SessionVerificationProps };
export default SessionVerification;
