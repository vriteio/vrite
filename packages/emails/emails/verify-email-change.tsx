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

interface VerifyEmailChangeProps {
  link?: string;
}

const VerifyEmailChange: React.FC<VerifyEmailChangeProps> = ({ link = "" }) => {
  return (
    <Html>
      <Head />
      <Preview>Please verify the email change request</Preview>
      <Tailwind>
        <Body className="bg-gray-100 text-gray-700 my-auto mx-auto font-sans">
          <Container className="mx-auto w-[500px]">
            <Section className="mt-[32px]">
              <Img
                src="https://assets.vrite.io/6409e82d7dfc74cef7a72e0d/v0aihKNNJQGDAoYJN5Ml6.png"
                width="95"
                height="40"
                alt="Vrite"
                className="my-0 mr-auto"
              />
            </Section>
            <Heading className="text-[21px] font-bold text-start p-0 mb-[12px] mx-0">
              Verify email change
            </Heading>
            <Text className="text-[14px] leading-[22px]">
              To verify the request to change your email address, please click the button below:
            </Text>
            <Button
              className="bg-gray-200 px-[18px] py-[12px] text-gray-500 rounded-[8px] text-[14px]"
              clicktracking="off"
              href={link}
            >
              Verify email address change
            </Button>
            <Section className="text-start text-[14px] leading-[22px]">
              <Text className="mb-0 leading-[14px]">or follow this link:</Text>
              <Link href={link} className="text-blue-600 no-underline" clicktracking="off">
                {link}
              </Link>
              <Text>
                If you didn't request email change you can ignore this email, but consider reviewing
                your security settings.
              </Text>
            </Section>
            <Text className="text-[12px] my-0">Vrite ©2025</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export { VerifyEmailChange };
export type { VerifyEmailChangeProps };
export default VerifyEmailChange;
