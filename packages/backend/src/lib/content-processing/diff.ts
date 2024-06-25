import { DocJSON } from "./conversions";
import * as JSONDiff from "jsondiffpatch";
import { diff_match_patch as DiffMatchPatch, Diff } from "diff-match-patch";

const objectHash = (input: object): string => {
  const obj = input as DocJSON;

  if (!obj.type || obj.type === "text") return "text";

  return `${obj.type}${Object.entries(obj.attrs || {})
    .sort(([keyA], [keyB]) => {
      return keyA.localeCompare(keyB);
    })
    .map(([key, value]) => {
      let outputValue = value;

      if (key === "width" || key === "aspectRatio" || key === "autoDir" || key === "diff") return;

      if (typeof value === "object") {
        outputValue = JSON.stringify(input, Object.keys(input).sort());
      }

      return `[${key}=${outputValue}]`;
    })
    .join("")}`;
};
const generateDiffDocument = (oldContent: DocJSON, newContent: DocJSON): any => {
  const differ = JSONDiff.create({
    arrays: { detectMove: false },
    propertyFilter(name) {
      return name !== "autoDir" && name !== "diff" && name !== "width" && name !== "id";
    },
    textDiff: { minLength: 1, diffMatchPatch: DiffMatchPatch },
    objectHash
  });
  const delta = differ.diff(oldContent, newContent) as JSONDiff.ObjectDelta | undefined;

  if (!delta) return newContent;

  const diffMatchPatch = new DiffMatchPatch();
  const processTextContentLevel = (
    oldContentLevel: DocJSON[],
    newContentLevel: DocJSON[],
    arrayDelta: JSONDiff.ArrayDelta
  ): DocJSON[] => {
    const output: DocJSON[] = [];
    const maxIndex = Math.max(oldContentLevel.length, newContentLevel.length);

    for (let i = 0; i < maxIndex; i++) {
      const oldContent = oldContentLevel[i];
      const newContent = newContentLevel[i];

      if (newContent && Array.isArray(arrayDelta)) {
        newContent.marks = newContent.marks || [];
        newContent.marks.push({ type: "diff", attrs: { diff: "added" } });
        output.push(newContent);

        continue;
      }

      if (oldContent && arrayDelta[`_${i}`]) {
        // Text removed
        oldContent.marks = oldContent.marks || [];
        oldContent.marks.push({ type: "diff", attrs: { diff: "removed" } });
        output.push(oldContent);
      }

      if (newContent && Array.isArray(arrayDelta[`${i}`])) {
        // Text added
        newContent.marks = newContent.marks || [];
        newContent.marks.push({ type: "diff", attrs: { diff: "added" } });
        output.push(newContent);
      }

      if (newContent && oldContent && arrayDelta[`${i}`] && !Array.isArray(arrayDelta[`${i}`])) {
        const objectDelta = arrayDelta[`${i}`] as JSONDiff.ObjectDelta;
        const [patch] = diffMatchPatch.patch_fromText(objectDelta.text![0] as string) as any[];
        const diffs = patch.diffs as Diff[];
        const start = patch.start1;
        const text = newContent.text?.slice(0, start);

        if (text) {
          output.push({
            type: "text",
            text,
            marks: [...(newContent.marks || [])]
          });
        }

        diffs.forEach(([operation, text]) => {
          let diff = objectDelta.marks ? "changed" : "";

          if (operation === DiffMatchPatch.DIFF_DELETE) {
            diff = "removed";
          } else if (operation === DiffMatchPatch.DIFF_INSERT) {
            diff = "added";
          }

          if (text) {
            output.push({
              type: "text",
              text,
              marks: [
                ...(newContent.marks || []),
                ...(diff ? [{ type: "diff", attrs: { diff } }] : [])
              ]
            });
          }
        });
      }

      if (!arrayDelta[`${i}`] && !arrayDelta[`_${i}`] && newContent) {
        // No change
        output.push(newContent);
      }
    }

    return output;
  };
  const processContentLevel = (
    oldContentLevel: DocJSON[],
    newContentLevel: DocJSON[],
    arrayDelta: JSONDiff.ArrayDelta
  ): DocJSON[] => {
    const output: DocJSON[] = [];
    const unchangedBlocks: DocJSON[] = [];
    const maxIndex = Math.max(oldContentLevel.length, newContentLevel.length);

    for (let i = 0; i < maxIndex; i++) {
      const oldContent = oldContentLevel[i];
      const newContent = newContentLevel[i];

      if (
        (!arrayDelta[`${i}`] && !arrayDelta[`_${i}`]) ||
        (!arrayDelta[`_${i}`] && arrayDelta[`${i}`] && !arrayDelta[`${i - 1}`]) ||
        (!arrayDelta[`${i}`] && arrayDelta[`_${i}`] && !arrayDelta[`_${i - 1}`])
      ) {
        output.push(...unchangedBlocks);
        unchangedBlocks.length = 0;
      }

      if (oldContent && oldContent.type !== "text" && !oldContent.content) {
        oldContent.content = [];
      }

      if (newContent && newContent.type !== "text" && !newContent.content) {
        newContent.content = [];
      }

      if (oldContent && arrayDelta[`_${i}`]) {
        // Block removed
        oldContent.attrs = oldContent.attrs || {};
        oldContent.attrs.diff = "removed";
        output.push(oldContent);
      }

      if (newContent && !arrayDelta[`${i}`]) {
        // Block unchanged
        if (!arrayDelta[`${i}`] && !arrayDelta[`_${i}`]) {
          output.push(newContent);
        } else {
          unchangedBlocks.push(newContent);
        }
      }

      if (newContent && arrayDelta[`${i}`] && Array.isArray(arrayDelta[`${i}`])) {
        // Block added
        newContent.attrs = newContent.attrs || {};
        newContent.attrs.diff = "added";
        output.push(newContent);
      }

      if (newContent && arrayDelta[`${i}`] && !Array.isArray(arrayDelta[`${i}`])) {
        const objectDelta = arrayDelta[`${i}`] as JSONDiff.ObjectDelta;

        // Block changed inside
        if (newContent.type === "heading" || newContent.type === "paragraph") {
          const contentChanged = objectDelta.content && `${objectDelta.content}`;
          const textArrayDelta = objectDelta.content as JSONDiff.ArrayDelta;

          output.push({
            ...newContent,
            ...(objectDelta.attrs && {
              attrs: {
                ...newContent.attrs,
                diff: "changed"
              }
            }),
            ...(contentChanged && {
              content: processTextContentLevel(
                oldContent.content || [],
                newContent.content || [],
                textArrayDelta
              )
            })
          });
        } else {
          output.push({
            ...newContent,
            ...(objectDelta.attrs && {
              attrs: {
                ...newContent.attrs,
                diff: "changed"
              }
            }),
            ...(objectDelta.content && {
              content: processContentLevel(
                oldContent.content || [],
                newContent.content || [],
                objectDelta.content as JSONDiff.ArrayDelta
              )
            })
          });
        }
      }
    }

    return output;
  };

  return {
    type: "doc",
    content: processContentLevel(
      oldContent.content || [],
      newContent.content || [],
      delta.content as JSONDiff.ArrayDelta
    )
  };
};

export { generateDiffDocument };
