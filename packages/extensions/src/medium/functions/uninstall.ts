import { ExtensionGeneralContext } from "@vrite/extensions";

const uninstall = async (context: ExtensionGeneralContext): Promise<void> => {
  const webhooks = await context.client.webhooks.list({ extensionOnly: true });

  if (webhooks.length > 0) {
    await context.client.webhooks.delete({
      id: webhooks[0].id
    });
  }
};

export default uninstall;
