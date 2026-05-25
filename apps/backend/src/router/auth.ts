import { permissionType } from "#backend/db";
import { authorized } from "#backend/lib/middleware";
import { objectID } from "#backend/lib/mongo";
import { base } from "#backend/lib/orpc";
import { Auth } from "#backend/services/auth";
import * as z from "zod";

const authRouter = base.router({
  session: base
    .route({
      method: "GET",
      path: "/session"
    })
    .meta({
      required: {
        session: true
      }
    })
    .use(authorized)
    .output(
      z.object({
        workspaceID: objectID(),
        subscriptionPlan: z.string(),
        memberID: objectID(),
        userID: objectID(),
        roleID: objectID(),
        permissions: z.array(permissionType),
        admin: z.boolean()
      })
    )
    .handler(({ context }) => {
      return {
        workspaceID: context.auth.workspaceID,
        subscriptionPlan: context.auth.subscriptionPlan,
        memberID: context.auth.session!.memberID,
        userID: context.auth.session!.userID,
        roleID: context.auth.session!.roleID,
        permissions: context.auth.session!.permissions,
        admin: context.auth.session?.admin === true
      };
    }),
  verifyOTPToken: base
    .input(
      z.object({
        token: z.string()
      })
    )
    .output(
      z.object({
        email: z.email(),
        otp: z.string().length(6)
      })
    )
    .handler(({ input }) => {
      return Auth.verifyOTPToken({ token: input.token });
    })
});

export { authRouter };
