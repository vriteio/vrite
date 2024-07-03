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

interface WorkspaceInviteProps {
  link?: string;
  user?: string;
  workspace?: string;
  sender?: string;
}

const WorkspaceInvite: React.FC<WorkspaceInviteProps> = ({
  link = "",
  sender = "",
  workspace = "",
  user = ""
}) => {
  return (
    <Html>
      <Head />
      <Preview>You're invited to join a Vrite workspace</Preview>
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
              {sender} invites you to join {workspace}, {user}!
            </Heading>
            <Text className="text-[14px] leading-[22px]">
              To accept the invite, please click the button below:
            </Text>
            <Button
              className="bg-gray-200 px-[18px] py-[12px] text-gray-500 rounded-[8px] text-[14px]"
              clicktracking="off"
              href={link}
            >
              Accept invite
            </Button>
            <Section className="text-start text-[14px] leading-[22px]">
              <Text className="mb-0 leading-[14px]">or follow this link:</Text>
              <Link href={link} className="text-blue-600 no-underline" clicktracking="off">
                {link}
              </Link>
              <Text>If you don't recognize this invite, you can ignore this email.</Text>
            </Section>
            <Text className="text-[12px] my-0">Vrite ©2024</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export { WorkspaceInvite };
export type { WorkspaceInviteProps };
export default WorkspaceInvite;
