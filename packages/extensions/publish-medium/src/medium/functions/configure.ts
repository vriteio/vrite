import { ExtensionBaseContext } from "@vrite/extensions";

const configure = async (context: ExtensionBaseContext): Promise<void> => {
  const webhooks = await context.client.webhooks.list({ extensionOnly: true });
  const configComplete =
    context.config.autoPublish && context.config.contentGroupId && context.config.token;

  if (webhooks.length > 0) {
    if (configComplete) {
      await context.client.webhooks.update({
        id: webhooks[0].id,
        url: "https://extensions.vrite.io/medium/webhook",
        metadata: {
          contentGroupId: `${context.config.contentGroupId}`
        }
      });
    } else {
      await context.client.webhooks.delete({
        id: webhooks[0].id
      });
    }
  } else if (configComplete) {
    await context.client.webhooks.create({
      name: context.spec.displayName,
      event: "contentPieceAdded",
      metadata: {
        contentGroupId: `${context.config.contentGroupId}`
      },
      url: "https://extensions.vrite.io/medium/webhook"
    });
  }
};

export default configure;
