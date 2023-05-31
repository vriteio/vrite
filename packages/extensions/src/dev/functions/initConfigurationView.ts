import { ExtensionConfigurationViewContext } from "@vrite/extensions";

const initConfigurationView = async (context: ExtensionConfigurationViewContext): Promise<void> => {
  const contentGroups = await context.client.contentGroups.list();
  context.setTemp(
    "lockedContentGroups",
    contentGroups
      .filter((contentGroup) => {
        return contentGroup.locked;
      })
      .map((contentGroup) => {
        return {
          value: contentGroup.id,
          label: contentGroup.name
        };
      })
  );
  if (!context.config.contentGroupId && (context.temp.lockedContentGroups as any[]).length > 0) {
    context.setConfig("contentGroupId", contentGroups[0].id);
  }
  if (typeof context.config.autoPublish !== "boolean") {
    context.setConfig("autoPublish", true);
  }
};

export default initConfigurationView;
