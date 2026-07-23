/** @jsxImportSource react */

import { render } from "@react-email/render";
import { VerificationOTP, type VerificationOTPProps } from "../emails/verification-otp";
import { WorkspaceInvite, type WorkspaceInviteProps } from "../emails/workspace-invite";
import { SessionVerification, type SessionVerificationProps } from "../emails/session-verification";
import React from "react";

type EmailTemplateProps = {
  "verification-otp": VerificationOTPProps;
  "session-verification": SessionVerificationProps;
  "workspace-invite": WorkspaceInviteProps;
};
type EmailTemplates = {
  [E in keyof EmailTemplateProps]: {
    component: React.FC<EmailTemplateProps[E]>;
    subject: (props: EmailTemplateProps[E]) => string;
  };
};

const emails: EmailTemplates = {
  "verification-otp": {
    component: VerificationOTP,
    subject: (props) => {
      if (props.type === "sign-in") {
        return "Your sign-in code | Andesine";
      }

      return "Verify your email | Andesine";
    }
  },
  "session-verification": {
    component: SessionVerification,
    subject: () => "Verify it's you | Andesine"
  },
  "workspace-invite": {
    component: WorkspaceInvite,
    subject: () => "You've been invited to a workspace | Andesine"
  }
};
const getEmailContent = <E extends keyof EmailTemplates>(
  template: E,
  props: EmailTemplateProps[E],
  options?: { plainText?: boolean }
) => {
  const Component = emails[template].component as React.FC<EmailTemplateProps[E]>;

  return render(<Component {...props} />, { plainText: options?.plainText });
};
const getEmailSubject = <E extends keyof EmailTemplates>(
  template: E,
  props: EmailTemplateProps[E]
): string => {
  return emails[template].subject(props);
};

export { getEmailContent, getEmailSubject };
export type { EmailTemplates, EmailTemplateProps };
