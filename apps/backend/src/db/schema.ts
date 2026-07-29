import { accounts, passkeys, sessions, verifications } from "./auth";
import { collections } from "./collections";
import { contents } from "./contents";
import { stripeWebhookEvents } from "./stripe-webhook-events";
import { entries } from "./entries";
import { invitations } from "./invitations";
import { apiKeys } from "./keys";
import { memberships } from "./memberships";
import { roles } from "./roles";
import { dailyUsage, usageLedger } from "./usage";
import { users } from "./users";
import { workspaces } from "./workspaces";

const schema = {
  users,
  sessions,
  accounts,
  verifications,
  passkeys,
  workspaces,
  roles,
  memberships,
  invitations,
  collections,
  entries,
  contents,
  apiKeys,
  dailyUsage,
  usageLedger,
  stripeWebhookEvents
};

export { schema };
