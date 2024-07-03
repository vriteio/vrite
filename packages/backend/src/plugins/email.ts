import { EmailPlugin, FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { EmailTemplate, getSubject, renderEmail } from "@vrite/emails";
import * as nodemailer from "nodemailer";
import { Resend } from "resend";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { getWorkspacesCollection, getUsersCollection } from "#collections";
import { createPlugin } from "#lib/plugin";
import { errors } from "#lib/errors";
import { hostConfig } from "#lib/host-config";

type EmailSender = (email: {
  to: string;
  template: EmailTemplate;
  data: Record<string, string>;
}) => Promise<void>;
declare module "fastify" {
  interface EmailPlugin {
    sendEmailVerification(
      email: string,
      details: {
        code: string;
        username: string;
        userId: string;
      }
    ): Promise<void>;
    sendMagicLink(
      email: string,
      details: {
        code: string;
        userId: string;
      }
    ): Promise<void>;
    sendWorkspaceInvite(
      email: string,
      details: {
        code: string;
        inviteeName: string;
        senderUserId: string;
        workspaceId: string;
        membershipId: string;
      }
    ): Promise<void>;
    sendPasswordChangeVerification(
      email: string,
      details: {
        code: string;
      }
    ): Promise<void>;
    sendEmailChangeVerification(
      email: string,
      details: {
        code: string;
      }
    ): Promise<void>;
    addEmailToContactList(
      email: string,
      details: {
        username: string;
      }
    ): Promise<void>;
  }
  interface FastifyInstance {
    email: EmailPlugin;
  }
}

const createEmailSender = (
  fastify: FastifyInstance
): {
  sendEmail: EmailSender;
  client: Resend | nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null;
} => {
  if (fastify.hostConfig.resend) {
    const resend = new Resend(fastify.config.RESEND_API_KEY);

    return {
      client: resend,
      sendEmail: async (email) => {
        try {
          await resend.emails.send({
            from: `${fastify.config.SENDER_NAME} <${fastify.config.SENDER_EMAIL}>`,
            to: email.to,
            subject: getSubject(email.template),
            html: renderEmail(email.template, email.data),
            text: renderEmail(email.template, email.data, true)
          });
        } catch (error) {
          fastify.log.error(error);

          throw errors.serverError();
        }
      }
    };
  }

  if (fastify.hostConfig.smtp) {
    const transporter = nodemailer.createTransport({
      host: fastify.config.SMTP_HOST!,
      port: fastify.config.SMTP_PORT!,
      secure: Boolean(fastify.config.SMTP_SECURE),
      ...(fastify.config.SMTP_USERNAME &&
        fastify.config.SMTP_PASSWORD && {
          auth: {
            user: fastify.config.SMTP_USERNAME,
            pass: fastify.config.SMTP_PASSWORD
          }
        })
    });

    return {
      client: transporter,
      sendEmail: async (email) => {
        try {
          await transporter.sendMail({
            from: { address: fastify.config.SENDER_EMAIL, name: fastify.config.SENDER_NAME },
            to: email.to,
            subject: getSubject(email.template),
            html: renderEmail(email.template, email.data),
            text: renderEmail(email.template, email.data, true)
          });
        } catch (error) {
          fastify.log.error(error);

          throw errors.serverError();
        }
      }
    };
  }

  return {
    client: null,
    sendEmail: async () => {
      // eslint-disable-next-line no-console
      fastify.log.error("No email service configured");

      throw errors.serverError();
    }
  };
};
const emailPlugin = createPlugin(async (fastify) => {
  const { sendEmail, client } = createEmailSender(fastify);

  fastify.decorate("email", {
    async sendEmailVerification(email, details) {
      await sendEmail({
        to: email,
        template: "verify-email",
        data: {
          link: `${fastify.config.PUBLIC_APP_URL}/verify?type=email&code=${details.code}&id=${details.userId}`,
          user: details.username
        }
      });
    },
    async sendMagicLink(email, details) {
      await sendEmail({
        to: email,
        template: "magic-link",
        data: {
          link: `${fastify.config.PUBLIC_APP_URL}/verify?type=magic&code=${details.code}&id=${details.userId}`
        }
      });
    },
    async sendWorkspaceInvite(email, details) {
      const workspacesCollection = getWorkspacesCollection(fastify.mongo.db!);
      const usersCollection = getUsersCollection(fastify.mongo.db!);
      const workspace = await workspacesCollection.findOne({
        _id: new ObjectId(details.workspaceId)
      });
      const sender = await usersCollection.findOne({ _id: new ObjectId(details.senderUserId) });

      if (!workspace) throw errors.notFound("workspace");
      if (!sender) throw errors.notFound("user");

      await sendEmail({
        to: email,
        template: "workspace-invite",
        data: {
          link: `${fastify.config.PUBLIC_APP_URL}/verify?type=workspace-invite&code=${details.code}&id=${details.membershipId}`,
          sender: sender.fullName || sender.username || "User",
          workspace: workspace.name || "a workspace",
          user: details.inviteeName
        }
      });
    },
    async sendPasswordChangeVerification(email, details) {
      await sendEmail({
        to: email,
        template: "verify-password-change",
        data: {
          link: `${fastify.config.PUBLIC_APP_URL}/verify?type=password-change&code=${details.code}`
        }
      });
    },
    async sendEmailChangeVerification(email, details) {
      await sendEmail({
        to: email,
        template: "verify-email-change",
        data: {
          link: `${fastify.config.PUBLIC_APP_URL}/verify?type=email-change&code=${details.code}`
        }
      });
    },
    async addEmailToContactList(email, details) {
      if (!fastify.hostConfig.resend || !fastify.config.RESEND_AUDIENCE_ID) return;

      const resend = client as Resend;

      await resend.contacts.create({
        audienceId: fastify.config.RESEND_AUDIENCE_ID,
        email,
        firstName: details.username
      });
    }
  } as EmailPlugin);
});

export { emailPlugin };
