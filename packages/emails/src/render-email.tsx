import { MagicLink } from "../emails/magic-link";
import { VerifyEmailChange } from "../emails/verify-email-change";
import { VerifyEmail } from "../emails/verify-email";
import { VerifyPasswordChange } from "../emails/verify-password-change";
import { WorkspaceInvite } from "../emails/workspace-invite";
import { render } from "@react-email/render";
import * as React from "react";

const templateMap = {
  "magic-link": MagicLink,
  "verify-email-change": VerifyEmailChange,
  "verify-email": VerifyEmail,
  "verify-password-change": VerifyPasswordChange,
  "workspace-invite": WorkspaceInvite
};
const renderEmail = <T extends keyof typeof templateMap>(
  template: T,
  props: Record<string, string>,
  plainText?: boolean
): string => {
  const Template = templateMap[template] as React.FC<Record<string, string>>;

  return render(<Template {...props} />, { plainText });
};

type RenderEmail = typeof renderEmail;

export { renderEmail };
export type { RenderEmail };
