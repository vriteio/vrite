import * as verifyMagicLink from "./handlers/verify-magic-link";
import * as verifyEmail from "./handlers/verify-email";
import * as verifyWorkspaceInvite from "./handlers/verify-workspace-invite";
import * as verifyPasswordChange from "./handlers/verify-password-change";
import * as verifyEmailChange from "./handlers/verify-email-change";
import { z } from "zod";
import { procedure, router } from "#lib/trpc";
import { isAuthenticatedUser } from "#lib/middleware";

const authenticatedUserProcedure = procedure.use(isAuthenticatedUser);
const verificationRouter = router({
  verifyMagicLink: procedure
    .input(verifyMagicLink.inputSchema)
    .output(verifyMagicLink.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return verifyMagicLink.handler(ctx, input);
    }),
  verifyEmail: procedure
    .input(verifyEmail.inputSchema)
    .output(verifyEmail.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return verifyEmail.handler(ctx, input);
    }),
  verifyWorkspaceInvite: authenticatedUserProcedure
    .input(verifyWorkspaceInvite.inputSchema)
    .output(verifyWorkspaceInvite.outputSchema)
    .mutation(async ({ ctx, input }) => {
      return verifyWorkspaceInvite.handler(ctx, input);
    }),
  verifyPasswordChange: authenticatedUserProcedure
    .input(verifyPasswordChange.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return verifyPasswordChange.handler(ctx, input);
    }),
  verifyEmailChange: authenticatedUserProcedure
    .input(verifyEmailChange.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return verifyEmailChange.handler(ctx, input);
    })
});

export { verificationRouter };
