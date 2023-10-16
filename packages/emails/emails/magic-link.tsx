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

interface MagicLinkProps {
  link?: string;
}

const MagicLink: React.FC<MagicLinkProps> = ({ link = "" }) => {
  return (
    <Html>
      <Head />
      <Preview>Your sign-in link for Vrite</Preview>
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
              Magic sign-in link
            </Heading>
            <Text className="text-[14px] leading-[22px]">
              To sign-in, please click the button below. This link will expire in 30 min.
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
              <Link clicktracking="off" href={link} className="text-blue-600 no-underline">
                {link}
              </Link>
              <Text>If you didn't request a sign-in link, you can ignore this email. </Text>
            </Section>
            <Text className="text-[12px] my-0">Vrite ©2023</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export { MagicLink };
export type { MagicLinkProps };
export default MagicLink;
