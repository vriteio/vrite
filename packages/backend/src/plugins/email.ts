import { publicPlugin } from "../lib/plugin";
import { EmailService } from "fastify";
import { ClientResponse, MailService } from "@sendgrid/mail";
import { ObjectId } from "mongodb";
import { getWorkspacesCollection } from "#database/workspaces";
import { getUsersCollection } from "#database/users";
import * as errors from "#lib/errors";

declare module "fastify" {
  interface EmailService {
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
  }
  interface FastifyInstance {
    email: EmailService;
  }
}

const mailPlugin = publicPlugin(async (fastify) => {
  const service = new MailService();
  const sendEmail = async (email: {
    to: string;
    templateId: string;
    data: Record<string, string>;
  }): Promise<ClientResponse> => {
    const [response] = await service.send({
      to: email.to,
      from: {
        email: fastify.config.EMAIL,
        name: fastify.config.SENDER_NAME
      },
      templateId: email.templateId,
      dynamicTemplateData: email.data
    });

    return response;
  };

  service.setApiKey(fastify.config.SENDGRID_API_KEY);
  fastify.decorate("email", {
    async sendEmailVerification(email, details) {
      await sendEmail({
        to: email,
        templateId: fastify.config.SENDGRID_EMAIL_VERIFICATION_TEMPLATE_ID,
        data: {
          link: `${fastify.config.CALLBACK_DOMAIN}/verify?type=email&code=${details.code}&id=${details.userId}`,
          user: details.username
        }
      });
    },
    async sendMagicLink(email, details) {
      await sendEmail({
        to: email,
        templateId: fastify.config.SENDGRID_MAGIC_LINK_TEMPLATE_ID,
        data: {
          link: `${fastify.config.CALLBACK_DOMAIN}/verify?type=magic&code=${details.code}&id=${details.userId}`
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
        templateId: fastify.config.SENDGRID_WORKSPACE_INVITE_TEMPLATE_ID,
        data: {
          link: `${fastify.config.CALLBACK_DOMAIN}/verify?type=workspace-invite&code=${details.code}&id=${details.membershipId}`,
          sender: sender.fullName || sender.username || "User",
          workspace: workspace.name || "a workspace",
          user: details.inviteeName
        }
      });
    },
    async sendPasswordChangeVerification(email, details) {
      await sendEmail({
        to: email,
        templateId: fastify.config.SENDGRID_PASSWORD_CHANGE_VERIFICATION_TEMPLATE_ID,
        data: {
          link: `${fastify.config.CALLBACK_DOMAIN}/verify?type=password-change&code=${details.code}`
        }
      });
    },
    async sendEmailChangeVerification(email, details) {
      await sendEmail({
        to: email,
        templateId: fastify.config.SENDGRID_EMAIL_CHANGE_VERIFICATION_TEMPLATE_ID,
        data: {
          link: `${fastify.config.CALLBACK_DOMAIN}/verify?type=email-change&code=${details.code}`
        }
      });
    }
  } as EmailService);
});

export { mailPlugin };
