import { DocJSON } from "./conversions";
import * as JSONDiff from "jsondiffpatch";
import { diff_match_patch as DiffMatchPatch, Diff } from "diff-match-patch";

const hashGenericObject = (input: Record<string, any>): string => {
  return Object.keys(input)
    .sort()
    .reduce((acc, key) => {
      const value = input[key];

      if (!value) return `${acc}${key}`;

      if (Array.isArray(value)) {
        return `${acc}${key}=${value.join(",")}`;
      }

      if (typeof value === "object") {
        return `${acc}${key}=${hashGenericObject(value)}`;
      }

      return `${acc}${key}=${value}`;
    }, "");
};
const objectHash = (input: object): string => {
  const obj = input as DocJSON;

  if (!obj.type || obj.type === "text") return "text";

  return `${obj.type}${Object.entries(obj.attrs || {})
    .sort(([keyA], [keyB]) => {
      return keyA.localeCompare(keyB);
    })
    .map(([key, value]) => {
      let outputValue = value;

      if (
        key === "width" ||
        key === "aspectRatio" ||
        key === "autoDir" ||
        key === "diff" ||
        key === "props"
      ) {
        return;
      }

      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          outputValue = (value as any[]).join(",");
        } else {
          outputValue = hashGenericObject(value);
        }
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
        const patches = diffMatchPatch.patch_fromText(objectDelta.text![0] as string) as any[];

        patches.forEach((patch, index) => {
          const diffs = patch.diffs as Diff[];
          const endOfPreviousPatch = patches.reduce((acc, patch, i) => {
            if (i < index) {
              return acc + patch.length2;
            }

            return acc;
          }, 0);
          const startOfCurrentPatch = patch.start2;
          const text = newContent.text?.slice(endOfPreviousPatch, startOfCurrentPatch);

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
        if (
          newContent.type === "heading" ||
          newContent.type === "paragraph" ||
          newContent.type === "codeBlock"
        ) {
          const contentChanged = objectDelta.content && `${objectDelta.content}`;
          const textArrayDelta = objectDelta.content as JSONDiff.ArrayDelta;

          output.push({
            ...newContent,
            ...((objectDelta.attrs || (newContent.type === "codeBlock" && newContent.content)) && {
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
