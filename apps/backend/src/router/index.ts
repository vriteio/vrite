import { billingRouter } from "./billing";
import { collectionsRouter } from "./collections";
import { entriesRouter } from "./entries";
import { syncRouter } from "./sync";
import { keysRouter } from "./keys";
import { rolesRouter } from "./roles";
import { membershipsRouter } from "./memberships";
import { workspacesRouter } from "./workspaces";
import { authRouter } from "./auth";

const router = {
  auth: authRouter,
  entries: entriesRouter,
  collections: collectionsRouter,
  billing: billingRouter,
  keys: keysRouter,
  roles: rolesRouter,
  memberships: membershipsRouter,
  workspaces: workspacesRouter,
  sync: syncRouter
};

export { router };
