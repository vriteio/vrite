import { renderEmail as renderEmailFn } from "./render-email";
import type { MagicLinkProps } from "emails/magic-link";
import type { VerifyEmailChangeProps } from "emails/verify-email-change";
import type { VerifyPasswordChangeProps } from "emails/verify-password-change";
import type { WorkspaceInviteProps } from "emails/workspace-invite";
import type { VerifyEmailProps } from "emails/verify-email";

type TemplateMap = {
  "verify-email": VerifyEmailProps;
  "magic-link": MagicLinkProps;
  "verify-email-change": VerifyEmailChangeProps;
  "verify-password-change": VerifyPasswordChangeProps;
  "workspace-invite": WorkspaceInviteProps;
};
type EmailTemplate = keyof TemplateMap;
type EmailTemplateProps<T extends EmailTemplate> = TemplateMap[T];
type RenderEmail = <T extends keyof TemplateMap>(
  template: T,
  props: TemplateMap[T],
  plainText?: boolean
) => string;

const renderEmail = renderEmailFn as RenderEmail;
const getSubject = (template: keyof TemplateMap): string => {
  const subjectMap = {
    "magic-link": "Magic sign-in link | Vrite",
    "verify-password-change": "Verify password change | Vrite",
    "workspace-invite": "Workspace invite | Vrite",
    "verify-email": "Verify email | Vrite",
    "verify-email-change": "Verify email change | Vrite"
  };

  return subjectMap[template];
};

export { renderEmail, getSubject };
export type { EmailTemplate, EmailTemplateProps };
