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
  Text
} from "@react-email/components";
import * as React from "react";
import { PUBLIC_APP_URL } from "../src/constants";
import { EmailFooter } from "../src/email-footer";
import { EmailHeader } from "../src/email-header";

interface WorkspaceInviteProps {
  workspaceName?: string;
  inviterName?: string;
  inviteLink?: string;
}

const WorkspaceInvite: React.FC<WorkspaceInviteProps> = ({
  workspaceName = "My Workspace",
  inviterName = "Someone",
  inviteLink = `${PUBLIC_APP_URL}/invite?id=inv_example&expires=1893456000&signature=example`
}) => (
  <Html>
    <Head />
    <Preview>You've been invited to join {workspaceName} on Andesine</Preview>
    <Tailwind>
      <Body className="text-gray-800 my-auto mx-auto font-sans">
        <Container className="mx-auto w-[560px]">
          <EmailHeader>You&apos;re invited to join {workspaceName}</EmailHeader>
          <Text className="text-[20px] leading-[28px]">
            {inviterName} has invited you to collaborate as a member of{" "}
            <strong>{workspaceName}</strong> in Andesine. Use the link below to accept the
            invitation:
          </Text>
          <Section className="text-center mt-[12px] mb-[24px]">
            <Button
              href={inviteLink}
              className="inline-block bg-gray-900 text-white text-[16px] font-medium py-[12px] rounded-[8px] w-[560px]"
            >
              Accept invite
            </Button>
          </Section>
          <Text className="text-[20px] leading-[28px]">
            If you weren&apos;t expecting this invitation, you can ignore this email.
          </Text>
          <EmailFooter />
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

// @ts-expect-error: React Email reads PreviewProps metadata that is absent from React.FC.
WorkspaceInvite.PreviewProps = {
  workspaceName: "Acme Corp",
  inviterName: "John Doe",
  inviteLink: `${PUBLIC_APP_URL}/invite?id=inv_example&expires=1893456000&signature=example`
};

export { WorkspaceInvite };
export type { WorkspaceInviteProps };
export default WorkspaceInvite;
