import { ExtensionBaseContext } from "@vrite/extensions";

const configure = async (context: ExtensionBaseContext) => {
  const webhooks = await context.client.webhooks.list({ extensionOnly: true });

  if (webhooks.length > 0) {
    if (context.config.autoPublish && context.config.contentGroupId) {
      await context.client.webhooks.update({
        id: webhooks[0].id,
        url: "http://localhost:7777/dev/webhook",
        metadata: {
          contentGroupId: `${context.config.contentGroupId}`
        }
      });
    } else {
      await context.client.webhooks.delete({
        id: webhooks[0].id
      });
    }
  } else if (context.config.autoPublish && context.config.contentGroupId) {
    await context.client.webhooks.create({
      name: context.spec.displayName,
      event: "contentPieceAdded",
      metadata: {
        contentGroupId: `${context.config.contentGroupId}`
      },
      url: "http://localhost:7777/dev/webhook"
    });
  }
};

export default configure;
