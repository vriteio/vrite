import * as nodemailer from "nodemailer";
import { CreateEmailResponse, Resend } from "resend";
import { config } from "#backend/lib/config";
import { ORPCError } from "@orpc/server";

type EmailSender = (
  to: string,
  email: {
    subject: string;
    html: string;
    text?: string;
  }
) => Promise<EmailDeliveryResult>;

interface EmailDeliveryResult {
  status: "sent" | "manual";
}

const createEmailSender = (): {
  sendEmail: EmailSender;
  client:
    | Resend
    | nodemailer.Transporter<nodemailer.SentMessageInfo, nodemailer.TransportOptions>
    | null;
} => {
  if (config.RESEND_API_KEY) {
    const resend = new Resend(config.RESEND_API_KEY);

    return {
      client: resend,
      sendEmail: async (to, email) => {
        let result: CreateEmailResponse;

        try {
          result = await resend.emails.send({
            from: `${config.SENDER_NAME} <${config.SENDER_EMAIL}>`,
            to,
            subject: email.subject,
            html: email.html,
            text: email.text
          });
        } catch (e) {
          console.error(e);

          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Failed to send email"
          });
        }

        if (result.error) {
          console.error("Resend email delivery failed", {
            name: result.error.name,
            statusCode: result.error.statusCode,
            message: result.error.message
          });

          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Failed to send email"
          });
        }

        return { status: "sent" };
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

          return { status: "sent" };
        } catch (e) {
          console.error(e);

          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Failed to send email"
          });
        }
      }
    };
  }

  if (config.NODE_ENV === "production") {
    throw new Error("An email provider must be configured in production");
  }

  return {
    client: null,
    sendEmail: async (to, email) => {
      console.log("No email service configured", {
        from: `${config.SENDER_NAME} <${config.SENDER_EMAIL}>`,
        to,
        subject: email.subject,
        html: email.html,
        text: email.text
      });

      return { status: "manual" };
    }
  };
};

export { createEmailSender };
export type { EmailSender, EmailDeliveryResult };
