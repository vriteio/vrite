import { ExtensionConfigurationViewContext } from "@vrite/extensions";

const configure = async (context: ExtensionConfigurationViewContext): Promise<void> => {
  const contentGroups = await context.client.contentGroups.list();
  context.setTemp(
    "lockedContentGroups",
    contentGroups.map((contentGroup) => {
      return {
        value: contentGroup.id,
        label: contentGroup.name
      };
    })
  );
};

export default configure;
