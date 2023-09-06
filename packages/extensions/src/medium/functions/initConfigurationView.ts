import { ExtensionConfigurationViewContext } from "@vrite/extensions";

const initConfigurationView = async (context: ExtensionConfigurationViewContext): Promise<void> => {
  if (typeof context.config.autoPublish !== "boolean") {
    context.setConfig("autoPublish", true);
  }

  if (!context.config.contentGroupId) {
    context.setConfig("contentGroupId", "");
  }
};

export default initConfigurationView;
