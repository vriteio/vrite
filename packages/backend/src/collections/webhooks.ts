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
  name: z.string().min(1).max(50).describe("Name of the webhook"),
  description: z.string().optional().describe("Description of the webhook"),
  secret: z.string().optional().describe("Secret for signing webhook payload"),
  metadata: webhookMetadata.optional().describe("Additional details for the webhook"),
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
