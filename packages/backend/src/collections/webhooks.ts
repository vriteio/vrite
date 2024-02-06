import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const contentPieceEvents = [
  "contentPieceUpdated",
  "contentPieceAdded",
  "contentPieceRemoved"
] as const;
const contentGroupEvents = [
  "contentGroupAdded",
  "contentGroupRemoved",
  "contentGroupMoved"
] as const;
const memberEvents = ["memberInvited", "memberAdded", "memberRemoved"] as const;
const webhookEventName = z.enum([...contentPieceEvents, ...contentGroupEvents, ...memberEvents]);
const webhookMetadata = z.object({
  contentGroupId: zodId()
});
const webhook = z.object({
  id: zodId(),
  url: z.string(),
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  secret: z.string().optional(),
  metadata: webhookMetadata.optional(),
  event: webhookEventName
});

type WebhookEventName = z.infer<typeof webhookEventName>;
type WebhookMetadata<ID extends string | ObjectId = string> = {
  contentGroupId: ID;
};

interface Webhook<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof webhook>, "metadata" | "id"> {
  id: ID;
  metadata?: WebhookMetadata<ID>;
}
interface FullWebhook<ID extends string | ObjectId = string> extends Webhook<ID> {
  workspaceId: ID;
  extensionId?: ID;
}

const getWebhooksCollection = (db: Db): Collection<UnderscoreID<FullWebhook<ObjectId>>> => {
  return db.collection("webhooks");
};

export {
  webhook,
  webhookEventName,
  getWebhooksCollection,
  contentPieceEvents,
  contentGroupEvents,
  memberEvents
};
export type { WebhookEventName, Webhook, FullWebhook };
