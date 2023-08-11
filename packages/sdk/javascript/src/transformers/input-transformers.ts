import { ContentPiece } from "../api";
import { Marked } from "marked";

type InputTransformer<
  Input = string,
  CustomData extends Record<string, any> = Record<string, any>
> = (input: Input) => {
  content: string;
  contentPiece?: Partial<
    Pick<
      ContentPiece<CustomData>,
      | "date"
      | "title"
      | "slug"
      | "description"
      | "tags"
      | "members"
      | "coverUrl"
      | "coverAlt"
      | "customData"
      | "canonicalLink"
      | "coverWidth"
    >
  >;
};

const createInputTransformer = <
  Input = string,
  CustomData extends Record<string, any> = Record<string, any>
>(
  inputTransformer: InputTransformer<Input, CustomData>
): InputTransformer<Input, CustomData> => {
  return inputTransformer;
};
const gfmInputTransformer = createInputTransformer<string>((input) => {
  const marked = new Marked({
    renderer: {
      paragraph(text) {
        if (text.startsWith("<img")) {
          return `${text}\n`;
        }

        return `<p>${text}</p>`;
      },
      image(href, _title, text) {
        const link = (href || "").replace(
          /^(?:\[.*\]\((.*)\))|(?:(.*))$/,
          (_match, p1, p2) => p1 || p2
        );

        return `<img src="${link}" alt="${text}">`;
      },
      listitem(text, task, checked) {
        return `<li${task ? ` data-type="taskItem"` : ""}${
          checked ? ` data-checked="true"` : ""
        }>${text.replace(/<br><(img|p|pre|blockquote|ul|ol|table)\s/g, "<$1 ")}</li>`;
      },
      list(body, ordered, start) {
        const type = ordered ? "ol" : "ul";
        const startAt = ordered && start !== 1 ? ` start="${start}"` : "";
        const dataType = body.includes(`data-type="taskItem"`) ? ` data-type="taskList"` : "";

        return `<${type}${startAt}${dataType}>${body}</${type}>\n`;
      }
    },
    mangle: false,
    headerIds: false,
    gfm: true,
    breaks: true
  });

  return {
    content: marked.parse(input)
  };
});

export { createInputTransformer, gfmInputTransformer };
export type { InputTransformer };
