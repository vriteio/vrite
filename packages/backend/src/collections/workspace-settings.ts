import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const prettierConfig = z
  .object({
    printWidth: z.number(),
    tabWidth: z.number(),
    useTabs: z.boolean(),
    semi: z.boolean(),
    singleQuote: z.boolean(),
    jsxSingleQuote: z.boolean(),
    trailingComma: z.enum(["none", "es5", "all"]),
    bracketSpacing: z.boolean(),
    bracketSameLine: z.boolean(),
    jsxBracketSameLine: z.boolean(),
    rangeStart: z.number(),
    rangeEnd: z.number(),
    proseWrap: z.enum(["always", "never", "preserve"]),
    arrowParens: z.enum(["avoid", "always"]),
    htmlWhitespaceSensitivity: z.enum(["css", "strict", "ignore"]),
    endOfLine: z.enum(["auto", "lf", "crlf", "cr"]),
    quoteProps: z.enum(["as-needed", "consistent", "preserve"]),
    vueIndentScriptAndStyle: z.boolean(),
    embeddedLanguageFormatting: z.enum(["auto", "off"]),
    singleAttributePerLine: z.boolean()
  })
  .partial();
const metadataField = z.enum(["slug", "canonical-link", "date", "tags", "members", "filename"]);
const metadataSettings = z
  .object({
    canonicalLinkPattern: z
      .string()
      .describe("Pattern for auto-generating canonical link for content pieces"),
    enabledFields: z
      .array(metadataField)
      .optional()
      .describe("Enabled content piece metadata fields")
  })
  .partial();
const marks = [
  "bold",
  "underline",
  "italic",
  "strike",
  "code",
  "link",
  "highlight",
  "subscript",
  "superscript"
] as const;
const blocks = [
  "heading1",
  "heading2",
  "heading3",
  "heading4",
  "heading5",
  "heading6",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "image",
  "table",
  "element"
] as const;
const embeds = ["codepen", "codesandbox", "youtube"] as const;
const workspaceSettings = z.object({
  id: zodId().describe("ID of the workspace settings"),
  prettierConfig: z.string().describe("JSON-stringified Prettier configuration"),
  dashboardViews: z
    .object({
      table: z
        .array(
          z.object({
            id: z.string().describe("ID of the column in the table view"),
            width: z.number().describe("Width of the column in the table view")
          })
        )
        .optional()
        .describe("Configuration for the table view")
    })
    .optional()
    .describe("Configuration for the dashboard views"),
  metadata: metadataSettings.optional().describe("Content piece metadata settings"),
  marks: z.array(z.enum(marks)).describe("Enabled inline formatting options"),
  blocks: z.array(z.enum(blocks)).describe("Enabled block content types"),
  embeds: z.array(z.enum(embeds)).describe("Enabled embeds")
});

interface WorkspaceSettings<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof workspaceSettings>, "id"> {
  id: ID;
}
interface FullWorkspaceSettings<ID extends string | ObjectId = string>
  extends WorkspaceSettings<ID> {
  workspaceId: ID;
}
interface MetadataSettings extends z.infer<typeof metadataSettings> {}

type MetadataField = z.infer<typeof metadataField>;

const getWorkspaceSettingsCollection = (
  db: Db
): Collection<UnderscoreID<FullWorkspaceSettings<ObjectId>>> => {
  return db.collection("workspace-settings");
};

export {
  prettierConfig,
  marks,
  blocks,
  embeds,
  workspaceSettings,
  metadataSettings,
  getWorkspaceSettingsCollection
};
export type { MetadataField, MetadataSettings, WorkspaceSettings, FullWorkspaceSettings };
