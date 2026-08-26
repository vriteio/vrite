import { Tooltip } from "@andesine/components";
import { For } from "solid-js";
import type { EditorDiffChange } from "../../client-types";

interface VersionDiffBadgesProps {
  types: Array<EditorDiffChange["type"]>;
}

const CHANGE_ICONS: Record<EditorDiffChange["type"], string> = {
  added: "i-lucide:plus",
  modified: "i-lucide:circle",
  removed: "i-lucide:minus"
};
const VersionDiffBadges = (props: VersionDiffBadgesProps) => {
  return (
    <span class="version-diff-badges">
      <For each={props.types}>
        {(type) => {
          const label = `${type[0].toUpperCase()}${type.slice(1)}`;

          return (
            <Tooltip content={label} placement="top" wrapperClass="shrink-0" fixed>
              <span class={`version-diff-badge version-diff-badge-${type}`} aria-label={label}>
                <span class={`version-diff-badge-icon ${CHANGE_ICONS[type]}`} />
              </span>
            </Tooltip>
          );
        }}
      </For>
    </span>
  );
};

export { VersionDiffBadges };
