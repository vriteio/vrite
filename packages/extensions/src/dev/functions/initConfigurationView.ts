import { ExtensionConfigurationViewContext } from "@vrite/extensions";

const initConfigurationView = async (context: ExtensionConfigurationViewContext): Promise<void> => {
  const contentGroups = await context.client.contentGroups.list();
  const lockedContentGroups = contentGroups
    .filter((contentGroup) => {
      return contentGroup.locked;
    })
    .map((contentGroup) => {
      return {
        value: contentGroup.id,
        label: contentGroup.name
      };
    });

  context.setTemp("lockedContentGroups", lockedContentGroups);

  if (typeof context.config.autoPublish !== "boolean") {
    context.setConfig("autoPublish", true);
  }

  if (!context.config.contentGroupId && lockedContentGroups.length > 0) {
    context.setConfig("contentGroupId", lockedContentGroups[0].value);
  }
};

export default initConfigurationView;
