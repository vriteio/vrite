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
import { PUBLIC_APP_URL } from "../src/constants";
import { EmailFooter } from "../src/email-footer";
import { EmailHeader } from "../src/email-header";

interface SessionVerificationProps {
  code?: string;
  link?: string;
}

const SessionVerification: React.FC<SessionVerificationProps> = ({ code = "", link }) => (
  <Html>
    <Head />
    <Preview>Confirm this sensitive action. Your verification code: {code}</Preview>
    <Tailwind>
      <Body className="text-gray-800 my-auto mx-auto font-sans">
        <Container className="mx-auto w-[560px]">
          <EmailHeader>Verify it's you</EmailHeader>
          <Text className="text-[20px] leading-[28px]">
            A sensitive action was requested in your Andesine account. Use this code to verify your
            identity and continue:
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
            If you didn't request this action, you can ignore this email. The code will expire in 5
            minutes.
          </Text>
          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

// @ts-expect-error: React Email reads PreviewProps metadata that is absent from React.FC.
SessionVerification.PreviewProps = {
  code: "123456",
  link: `${PUBLIC_APP_URL}/auth/email?mode=sign-in&token=example-token`
};

export { SessionVerification };
export type { SessionVerificationProps };
export default SessionVerification;
