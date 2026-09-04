import { workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import type { CollectionAction, EntryAction } from "./actions";
import {
  loadAuthorizedCollectionTree,
  type AuthorizedCollectionTree
} from "./authorized-collection-tree";
import { assertAuthorizationRequirements, type AuthorizationRequirements } from "./permissions";
import type { SessionData } from "./session";
import { assertNoActiveSchemaMigration } from "./schema-migration";

interface AuthorizedServiceInput {
  auth: SessionData;
  skipAuthorization?: AuthorizationScope;
}

interface AuthorizationScope {
  auth: SessionData;
  database: DatabaseClient;
  workspaceID: ReturnType<typeof toUUID>;
}

interface CollectionActionRequirement {
  action: CollectionAction;
  collectionID?: string | null;
}

interface EntryActionRequirement {
  action: EntryAction;
  collectionID?: string | null;
}

interface ServiceAuthorizationActions {
  collections?: CollectionActionRequirement[];
  entries?: EntryActionRequirement[];
}

interface ServiceResolveContext<Input> {
  auth: SessionData;
  database: Database;
  input: Input;
  workspaceID: ReturnType<typeof toUUID>;
}

interface AuthorizedServiceContext<Input, Resolved> extends ServiceResolveContext<Input> {
  authorizationScope: AuthorizationScope;
  resolved: Resolved;
}

interface AuthorizedTreeServiceContext<Input, Resolved> extends AuthorizedServiceContext<
  Input,
  Resolved
> {
  authorization: AuthorizedCollectionTree;
}

interface InternalAuthorizedServiceContext<Input, Resolved> extends AuthorizedServiceContext<
  Input,
  Resolved
> {
  authorization?: AuthorizedCollectionTree;
}

interface WorkspaceServiceContext<Input> {
  database: Database;
  input: Input;
  workspaceID: ReturnType<typeof toUUID>;
}

interface WithAuthorizationOptions<Input, Resolved> {
  actions?: (context: { input: Input; resolved: Resolved }) => ServiceAuthorizationActions;
  permissions?:
    AuthorizationRequirements | ((input: Input) => AuthorizationRequirements | undefined);
  plan?: "pro" | ((input: Input) => "pro" | undefined);
  resolve?: (context: ServiceResolveContext<Input>) => Promise<Resolved>;
  transaction?: TransactionMode;
  tree?: boolean;
}

interface WithAuthorizationTreeOptions<Input, Resolved> extends WithAuthorizationOptions<
  Input,
  Resolved
> {
  tree: true;
}

interface WithAuthorizationActionOptions<Input, Resolved> extends WithAuthorizationOptions<
  Input,
  Resolved
> {
  actions: (context: { input: Input; resolved: Resolved }) => ServiceAuthorizationActions;
  tree?: false;
}

interface WithoutAuthorizationTreeOptions<Input, Resolved> extends WithAuthorizationOptions<
  Input,
  Resolved
> {
  actions?: undefined;
  tree?: false;
}

interface WithWorkspaceOptions {
  transaction?: Exclude<TransactionMode, "locked-workspace">;
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Database = DatabaseTransaction;
type DatabaseClient = DatabaseTransaction | typeof db;
type TransactionMode = "atomic" | "locked-workspace";

const activeAuthorizationScopes = new WeakSet<AuthorizationScope>();

const assertPlan = <Input>(
  auth: SessionData,
  input: Input,
  requiredPlan?: WithAuthorizationOptions<Input, unknown>["plan"]
): void => {
  const plan = typeof requiredPlan === "function" ? requiredPlan(input) : requiredPlan;

  if (!plan || auth.subscriptionPlan === plan) return;

  throw new ORPCError("FORBIDDEN", {
    message: "This action requires an Andesine Pro subscription"
  });
};
const lockWorkspace = async (
  database: DatabaseTransaction,
  workspaceID: ReturnType<typeof toUUID>
): Promise<void> => {
  const [workspace] = await database
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceID))
    .for("update");

  if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
};
function withAuthorization<Input, Resolved = undefined, Result = void>(
  options: WithAuthorizationTreeOptions<Input, Resolved>,
  handler: (context: AuthorizedTreeServiceContext<Input, Resolved>) => Promise<Result>
): (serviceInput: Input & AuthorizedServiceInput) => Promise<Result>;
function withAuthorization<Input, Resolved = undefined, Result = void>(
  options:
    | WithAuthorizationActionOptions<Input, Resolved>
    | WithoutAuthorizationTreeOptions<Input, Resolved>,
  handler: (context: AuthorizedServiceContext<Input, Resolved>) => Promise<Result>
): (serviceInput: Input & AuthorizedServiceInput) => Promise<Result>;
function withAuthorization<Input, Resolved = undefined, Result = void>(
  options: WithAuthorizationOptions<Input, Resolved>,
  handler: (context: never) => Promise<Result>
): (serviceInput: Input & AuthorizedServiceInput) => Promise<Result> {
  const executeHandler = handler as (
    context: InternalAuthorizedServiceContext<Input, Resolved>
  ) => Promise<Result>;

  return async (serviceInput: Input & AuthorizedServiceInput): Promise<Result> => {
    const { auth, skipAuthorization, ...rawInput } = serviceInput;
    const input = rawInput as Input;
    const workspaceID = toUUID(auth.workspaceID);
    const skipsAuthorization = Boolean(skipAuthorization);

    const permissions =
      typeof options.permissions === "function" ? options.permissions(input) : options.permissions;

    if (
      skipAuthorization &&
      (!activeAuthorizationScopes.has(skipAuthorization) ||
        skipAuthorization.auth !== auth ||
        skipAuthorization.workspaceID !== workspaceID)
    ) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Invalid authorization scope"
      });
    }

    if (!skipsAuthorization) {
      assertAuthorizationRequirements(auth, permissions);
      assertPlan(auth, input, options.plan);
    }

    const execute = async (
      databaseClient: DatabaseClient,
      existingScope?: AuthorizationScope
    ): Promise<Result> => {
      const database = databaseClient as Database;
      const resolved = options.resolve
        ? await options.resolve({ auth, database, input, workspaceID })
        : (undefined as Resolved);
      const actions = skipsAuthorization ? undefined : options.actions?.({ input, resolved });
      const needsTree = options.tree || actions !== undefined;
      const authorization = needsTree
        ? await loadAuthorizedCollectionTree({ auth, database: databaseClient })
        : undefined;
      const authorizationScope =
        existingScope ||
        ({ auth, database: databaseClient, workspaceID } satisfies AuthorizationScope);
      const ownsAuthorizationScope = !existingScope;

      if (actions && !authorization) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Authorization tree was not loaded"
        });
      }

      for (const requirement of actions?.collections || []) {
        authorization?.assertCollectionAction(requirement.collectionID, requirement.action);
      }

      for (const requirement of actions?.entries || []) {
        authorization?.assertEntryAction(requirement.collectionID, requirement.action);
      }

      await assertNoActiveSchemaMigration(databaseClient, workspaceID, actions);

      if (ownsAuthorizationScope) {
        activeAuthorizationScopes.add(authorizationScope);
      }

      try {
        return await executeHandler({
          auth,
          authorization,
          authorizationScope,
          database,
          input,
          resolved,
          workspaceID
        });
      } finally {
        if (ownsAuthorizationScope) {
          activeAuthorizationScopes.delete(authorizationScope);
        }
      }
    };

    if (skipAuthorization) {
      return execute(skipAuthorization.database, skipAuthorization);
    }

    if (!options.transaction) return execute(db);

    return db.transaction(async (transaction) => {
      if (options.transaction === "locked-workspace") {
        await lockWorkspace(transaction, workspaceID);
      }

      return execute(transaction);
    });
  };
}
const withExplicitWorkspace = <Input, Result = void>(
  options: WithWorkspaceOptions,
  handler: (context: WorkspaceServiceContext<Input>) => Promise<Result>
) => {
  return async (serviceInput: Input & { workspaceID: string }): Promise<Result> => {
    const { workspaceID: rawWorkspaceID, ...rawInput } = serviceInput;
    const input = rawInput as Input;
    const workspaceID = toUUID(rawWorkspaceID);
    const execute = (databaseClient: DatabaseClient) => {
      return handler({ database: databaseClient as Database, input, workspaceID });
    };

    if (options.transaction === "atomic") return db.transaction(execute);

    return execute(db);
  };
};
const withPublicWorkspace = withExplicitWorkspace;
const withSystemWorkspace = withExplicitWorkspace;

export { withAuthorization, withPublicWorkspace, withSystemWorkspace };
export type {
  AuthorizedServiceContext,
  AuthorizedServiceInput,
  AuthorizedTreeServiceContext,
  AuthorizationScope,
  Database,
  DatabaseClient,
  ServiceAuthorizationActions,
  ServiceResolveContext,
  WorkspaceServiceContext
};
