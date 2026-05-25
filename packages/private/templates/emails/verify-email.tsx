import {
  Body,
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

interface VerifyEmailProps {
  code?: string;
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({ code = "" }) => {
  return (
    <Html>
      <Head />
      <Preview>Verify your email. Your verification code: {code}</Preview>
      <Tailwind>
        <Body className="text-gray-800 my-auto mx-auto font-sans">
          <Container className="mx-auto w-[560px]">
            <Section className="my-[32px]">
              <Img
                src="http://localhost:3000/assets/banner.png"
                width="500"
                height="32"
                alt="Andesine"
                className="my-0 mr-auto"
              />
            </Section>
            <Heading className="text-[36px] font-bold text-start p-0 mb-[12px] mx-0">
              Verify your email address
            </Heading>
            <Text className="text-[20px] leading-[28px]">
              Thanks for signing up for Andesine! To finish setting up your account, please verify
              your email using the code below:
            </Text>
            <Section className="text-[30px] h-[128px] my-[24px] bg-gray-100 rounded-[8px] text-center font-medium font-mono">
              {code}
            </Section>
            <Text className="text-[20px] leading-[28px]">
              If you didn't sign up for Andesine, you can ignore this email.
            </Text>
            <Hr className="my-[24px]" />
            <Row className="mb-[16px]">
              <Column className="my-0">
                <Row>
                  <Column className="my-0">
                    <Link href="/">
                      <Img
                        src="http://localhost:3000/assets/x.svg"
                        className="opacity-30 h-[24px] w-[24px]"
                      />
                    </Link>
                  </Column>
                  <Column className="my-0">
                    <Link href="/">
                      <Img
                        src="http://localhost:3000/assets/linkedin.svg"
                        className="opacity-30 h-[24px] w-[24px]"
                      />
                    </Link>
                  </Column>
                  <Column className="my-0">
                    <Link href="/">
                      <Img
                        src="http://localhost:3000/assets/github.svg"
                        className="opacity-30 h-[24px] w-[24px]"
                      />
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

// @ts-ignore
VerifyEmail.PreviewProps = {
  code: "123456"
};

export { VerifyEmail };
export type { VerifyEmailProps };
export default VerifyEmail;
