import { SendRequest } from "./request";

type Mark =
  | "bold"
  | "italic"
  | "strike"
  | "code"
  | "link"
  | "highlight"
  | "subscript"
  | "superscript";
type Block =
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "heading6"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule"
  | "image";
type Embed = "codepen" | "codesandbox" | "youtube";
interface WorkspaceSettings {
  /**
   * Workspace settings ID
   */
  id: string;
  /**
   * JSON-stringified Prettier config
   */
  prettierConfig: string;
  /**
   * List of inline formatting marks enabled in the workspace
   */
  marks: Mark[];
  /**
   * List of content blocks enabled in the workspace
   */
  blocks: Block[];
  /**
   * List of embeds enabled in the workspace
   */
  embeds: Embed[];
  /**
   * Metadata settings
   */
  metadata?: Partial<{
    canonicalLinkPattern: string;
  }>;
}
interface WorkspaceSettingsEndpoints {
  get(): Promise<WorkspaceSettings>;
  update(input: Partial<Omit<WorkspaceSettings, "id">>): Promise<void>;
}

const basePath = "/workspace-settings";
const createWorkspaceSettingsEndpoints = (
  sendRequest: SendRequest
): WorkspaceSettingsEndpoints => ({
  get: () => {
    return sendRequest<WorkspaceSettings>("GET", `${basePath}`);
  },
  update: (input) => {
    return sendRequest("PUT", `${basePath}`, {
      body: input
    });
  }
});

export { createWorkspaceSettingsEndpoints };
export type { WorkspaceSettings, Mark, Block, Embed, WorkspaceSettingsEndpoints };
