import {
  type EmailTemplateProps,
  type EmailTemplates,
  getEmailContent,
  getEmailSubject
} from "../../../../../../packages/private/templates/src";
import { createEmailSender } from "./sender";

const emailSender = createEmailSender();
const sendEmail = async <T extends keyof EmailTemplates>(
  to: string,
  template: T,
  props: EmailTemplateProps[T]
) => {
  return emailSender.sendEmail(to, {
    subject: getEmailSubject(template, props),
    html: await getEmailContent(template, props),
    text: await getEmailContent(template, props, { plainText: true })
  });
};

export { sendEmail };
