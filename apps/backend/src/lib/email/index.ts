import {
  EmailTemplateProps,
  EmailTemplates,
  getEmailContent,
  getEmailSubject
} from "@andesine/templates";
import { createEmailSender } from "./sender";

const emailSender = createEmailSender();
const sendEmail = async <T extends keyof EmailTemplates>(
  to: string,
  template: T,
  props: EmailTemplateProps[T]
) => {
  return emailSender.sendEmail(to, {
    subject: getEmailSubject(template),
    html: await getEmailContent(template, props),
    text: await getEmailContent(template, props, { plainText: true })
  });
};

export { sendEmail };
