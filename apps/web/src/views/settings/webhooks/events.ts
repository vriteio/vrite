import { App } from "#context";

const webhookEvents: Array<{ label: string; value: App.WebhookEvent }> = [
  { label: "Content piece updated", value: "contentPieceUpdated" },
  { label: "New content piece added", value: "contentPieceAdded" },
  { label: "Content piece removed", value: "contentPieceRemoved" },
  { label: "New content group added", value: "contentGroupAdded" },
  { label: "Content group removed", value: "contentGroupRemoved" },
  { label: "Content group moved", value: "contentGroupMoved" },
  { label: "New member invited", value: "memberInvited" },
  { label: "New member added", value: "memberAdded" },
  { label: "Member removed", value: "memberRemoved" }
];

export { webhookEvents };
