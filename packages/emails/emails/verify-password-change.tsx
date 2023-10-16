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

interface VerifyPasswordChangeProps {
  link?: string;
}

const VerifyPasswordChange: React.FC<VerifyPasswordChangeProps> = ({ link = "" }) => {
  return (
    <Html>
      <Head />
      <Preview>Please verify the password change request</Preview>
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
              Verify password change
            </Heading>
            <Text className="text-[14px] leading-[22px]">
              To verify the request to change your password, please click the button below:
            </Text>
            <Button
              className="bg-gray-200 px-[18px] py-[12px] text-gray-500 rounded-[8px] text-[14px]"
              clicktracking="off"
              href={link}
            >
              Sign in to Vrite
            </Button>
            <Section className="text-start text-[14px] leading-[22px]">
              <Text className="mb-0 leading-[14px]">or follow this link:</Text>
              <Link href={link} className="text-blue-600 no-underline" clicktracking="off">
                {link}
              </Link>
              <Text>
                If you didn't request password change you can ignore this email, but consider
                reviewing your security settings.
              </Text>
            </Section>
            <Text className="text-[12px] my-0">Vrite ©2023</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export { VerifyPasswordChange };
export type { VerifyPasswordChangeProps };
export default VerifyPasswordChange;
