import { render } from "@react-email/render";
import { VerifyEmail, type VerifyEmailProps } from "../emails/verify-email";
import type React from "react";

type EmailTemplates = Record<"verify-email", { component: React.FC; subject: string }>;
type EmailTemplateProps = {
  "verify-email": VerifyEmailProps;
};

const emails: EmailTemplates = {
  "verify-email": {
    component: VerifyEmail,
    subject: "Verify email | Andesine"
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
const getEmailSubject = <E extends keyof EmailTemplates>(template: E): string => {
  return emails[template].subject;
};

export { getEmailContent, getEmailSubject };
export type { EmailTemplates, EmailTemplateProps };
