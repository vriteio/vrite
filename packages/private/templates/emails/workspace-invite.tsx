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

const HTTP_PROTOCOL = process.env.PUBLIC_SECURE === "true" ? "https" : "http";
const PUBLIC_APP_HOST = process.env.PUBLIC_APP_HOST || "localhost:3000";
const PUBLIC_APP_URL = `${HTTP_PROTOCOL}://${PUBLIC_APP_HOST}`;

interface WorkspaceInviteProps {
  workspaceName?: string;
  inviterName?: string;
  inviteLink?: string;
}

const WorkspaceInvite: React.FC<WorkspaceInviteProps> = ({
  workspaceName = "My Workspace",
  inviterName = "Someone",
  inviteLink = `${PUBLIC_APP_URL}/invite?token=abc123`
}) => {
  return (
    <Html>
      <Head />
      <Preview>You've been invited to join {workspaceName} on Andesine</Preview>
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
              You&apos;re invited to join {workspaceName}
            </Heading>
            <Text className="text-[20px] leading-[28px]">
              {inviterName} has invited you to collaborate on <strong>{workspaceName}</strong> in
              Andesine.
            </Text>
            <Text className="text-[20px] leading-[28px]">
              Click the button below to accept the invitation and get started:
            </Text>
            <Section className="my-[24px] text-center">
              <Button
                href={inviteLink}
                className="bg-gray-900 text-white text-[16px] font-semibold py-[12px] px-[24px] rounded-[8px] no-underline"
              >
                Accept Invite
              </Button>
            </Section>
            <Text className="text-[14px] leading-[20px] text-gray-500">
              If you weren&apos;t expecting this invitation, you can safely ignore this email.
            </Text>
            <Hr className="my-[24px]" />
            <Row className="mb-[16px]">
              <Column className="my-0">
                <Row>
                  <Column className="my-0">
                    <Link href={PUBLIC_APP_URL}>
                      <Img
                        src={`${PUBLIC_APP_URL}/assets/x.svg`}
                        className="opacity-30 h-[24px] w-[24px]"
                      />
                    </Link>
                  </Column>
                  <Column className="my-0">
                    <Link href={PUBLIC_APP_URL}>
                      <Img
                        src={`${PUBLIC_APP_URL}/assets/linkedin.svg`}
                        className="opacity-30 h-[24px] w-[24px]"
                      />
                    </Link>
                  </Column>
                  <Column className="my-0">
                    <Link href={PUBLIC_APP_URL}>
                      <Img
                        src={`${PUBLIC_APP_URL}/assets/github.svg`}
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
WorkspaceInvite.PreviewProps = {
  workspaceName: "Acme Corp",
  inviterName: "John Doe",
  inviteLink: `${PUBLIC_APP_URL}/invite?token=abc123`
};

export { WorkspaceInvite };
export type { WorkspaceInviteProps };
export default WorkspaceInvite;
