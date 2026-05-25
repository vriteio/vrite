import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { Static, t } from "elysia";
import { ObjectId } from "mongodb";

const webhookEventType = t.UnionEnum(["entry", "entry.created", "entry.updated", "entry.deleted"]);
const webhookType = t.Object({
  id: objectID({ description: "ID of the webhook" }),
  label: t.String({ description: "Label for the webhook", minLength: 1, maxLength: 50 }),
  url: t.String({ description: "URL of the webhook", format: "uri" }),
  secret: t.String({ description: "Secret used to sign the webhook" }),
  events: t.Array(webhookEventType, { description: "Events that trigger the webhook" })
});

interface Webhook<ID extends string | ObjectId = string>
  extends Omit<Static<typeof webhookType>, "id"> {
  id: ID;
}
interface FullWebhook<ID extends string | ObjectId = string> extends Webhook<ID> {
  workspaceID: ID;
}

const webhookID = (id: ObjectId) => fromObjectID(id, "wh");
const webhooksDB = db.collection<UnderscoreID<FullWebhook<ObjectId>>>("webhooks");

await webhooksDB.createIndex({ workspaceId: 1 });

export { webhookEventType, webhookType, webhooksDB, webhookID };
export { Webhook, FullWebhook };
