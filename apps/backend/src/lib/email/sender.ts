import SMTPTransport from "nodemailer/lib/smtp-transport";
import * as nodemailer from "nodemailer";
import { Resend } from "resend";
import { config } from "#backend/lib/config";
import { status } from "elysia";

type EmailSender = (
  to: string,
  email: {
    subject: string;
    html: string;
    text?: string;
  }
) => Promise<void>;

const createEmailSender = (): {
  sendEmail: EmailSender;
  client: Resend | nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null;
} => {
  if (config.RESEND_API_KEY) {
    const resend = new Resend(config.RESEND_API_KEY);

    return {
      client: resend,
      sendEmail: async (to, email) => {
        try {
          await resend.emails.send({
            from: `${config.SENDER_NAME} <${config.SENDER_EMAIL}>`,
            to,
            subject: email.subject,
            html: email.html,
            text: email.text
          });
        } catch (e) {
          console.error(e);

          throw status("Internal Server Error");
        }
      }
    };
  }

  if (config.SMTP_HOST && config.SMTP_PORT) {
    const transporter = nodemailer.createTransport({
      host: config.SMTP_HOST!,
      port: config.SMTP_PORT!,
      secure: Boolean(config.SMTP_SECURE),
      ...(config.SMTP_USERNAME &&
        config.SMTP_PASSWORD && {
          auth: {
            user: config.SMTP_USERNAME,
            pass: config.SMTP_PASSWORD
          }
        })
    });

    return {
      client: transporter,
      sendEmail: async (to, email) => {
        try {
          await transporter.sendMail({
            from: { address: config.SENDER_EMAIL, name: config.SENDER_NAME },
            to,
            subject: email.subject,
            html: email.html,
            text: email.text
          });
        } catch (e) {
          console.error(e);

          throw status("Internal Server Error");
        }
      }
    };
  }

  return {
    client: null,
    sendEmail: async () => {
      console.error("No email service configured");

      throw status("Internal Server Error");
    }
  };
};

export { createEmailSender };
export type { EmailSender };
