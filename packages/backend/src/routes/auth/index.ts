import * as isSignedIn from "./handlers/is-signed-in";
import * as register from "./handlers/register";
import * as sendMagicLink from "./handlers/send-magic-link";
import * as login from "./handlers/login";
import * as logout from "./handlers/logout";
import * as refreshToken from "./handlers/refresh-token";
import * as initTwoFactor from "./handlers/init-two-factor";
import * as changePassword from "./handlers/change-password";
import * as switchWorkspace from "./handlers/switch-workspace";
import { z } from "zod";
import { isAuthenticated, isAuthenticatedUser } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";

const authenticatedProcedure = procedure.use(isAuthenticated);
const authenticatedUserProcedure = procedure.use(isAuthenticatedUser);
const authRouter = router({
  isSignedIn: procedure
    .input(z.void())
    .output(isSignedIn.outputSchema)
    .query(async ({ ctx }) => {
      return isSignedIn.handler(ctx);
    }),
  register: procedure
    .input(register.inputSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      return register.handler(ctx, input);
    }),
  sendMagicLink: procedure
    .input(sendMagicLink.inputSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      return sendMagicLink.handler(ctx, input);
    }),
  login: procedure
    .input(login.inputSchema)
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      return login.handler(ctx, input);
    }),
  logout: procedure
    .input(z.void())
    .output(z.void())
    .mutation(async ({ ctx }) => {
      return logout.handler(ctx);
    }),
  refreshToken: procedure
    .input(z.void())
    .output(z.void())
    .mutation(async ({ ctx }) => {
      return refreshToken.handler(ctx);
    }),
  initTwoFactor: authenticatedProcedure
    .input(z.void())
    .output(initTwoFactor.outputSchema)
    .mutation(async ({ ctx }) => {
      return initTwoFactor.handler(ctx);
    }),
  changePassword: authenticatedProcedure
    .input(changePassword.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return changePassword.handler(ctx, input);
    }),
  switchWorkspace: authenticatedUserProcedure
    .input(switchWorkspace.inputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      return switchWorkspace.handler(ctx, input);
    })
});

export { authRouter };
