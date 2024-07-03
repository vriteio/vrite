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
  Text
} from "@react-email/components";
import * as React from "react";

interface VerifyEmailProps {
  link?: string;
  user?: string;
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({ link = "", user = "" }) => {
  return (
    <Html>
      <Head />
      <Preview>Please verify your email</Preview>
      <Tailwind>
        <Body className="bg-gray-100 text-gray-700 my-auto mx-auto font-sans">
          <Container className="mx-auto w-[500px]">
            <Section className="mt-[32px]">
              <Img
                src="http://cdn.mcauto-images-production.sendgrid.net/d4071ef535227442/1dff1cba-517b-48ad-aab0-40c3b0f5050b/500x211.png"
                width="95"
                height="40"
                alt="Vrite"
                className="my-0 mr-auto"
              />
            </Section>
            <Heading className="text-[21px] font-bold text-start p-0 mb-[12px] mx-0">
              Welcome to Vrite, {user}!
            </Heading>
            <Text className="text-[14px] leading-[22px]">
              Thanks for signing up! We're excited to have you as a user and can't wait to see what
              you will create!
            </Text>
            <Text className="text-[14px] leading-[22px]">
              To access the platform, please verify your email address:
            </Text>
            <Button
              className="bg-gray-200 px-[18px] py-[12px] text-gray-500 rounded-[8px] text-[14px]"
              clicktracking="off"
              href={link}
            >
              Verify email address{" "}
            </Button>
            <Section className="text-start text-[14px] leading-[22px]">
              <Text className="mb-0 leading-[14px]">or follow this link:</Text>
              <Link href={link} className="text-blue-600 no-underline" clicktracking="off">
                {link}
              </Link>
              <Text>If you didn't sign up for Vrite, you can ignore this email.</Text>
            </Section>
            <Text className="text-[12px] my-0">Vrite ©2024</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export { VerifyEmail };
export type { VerifyEmailProps };
export default VerifyEmail;
