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
  contentGroupId: zodId().describe("ID of the content group the webhook event is connected with")
});
const webhook = z.object({
  id: zodId().describe("ID of the webhook"),
  url: z.string().describe("URL for the webhook to send data to"),
  name: z.string().describe("Name of the webhook").min(1).max(50),
  description: z.string().describe("Description of the webhook").optional(),
  secret: z.string().describe("Secret for signing webhook payload").optional(),
  metadata: webhookMetadata.describe("Additional details for the webhook").optional(),
  event: webhookEventName.describe("Event that triggers the webhook")
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
