import { IconButton, Tooltip } from "@andesine/components";
import type { JSX } from "solid-js";

const InheritedSchemaFieldBadge = (): JSX.Element => {
  return (
    <div
      class="absolute -left-9 top-1 z-1 select-none"
      contentEditable={false}
      onPointerDown={(event) => event.preventDefault()}
    >
      <Tooltip content="Inherited from parent schema" placement="left" fixed>
        <IconButton
          class="cursor-help"
          icon="i-lucide:eye"
          variant="text"
          color="contrast"
          size="small"
          text="soft"
          badge
          aria-label="Inherited from parent schema"
        />
      </Tooltip>
    </div>
  );
};

export { InheritedSchemaFieldBadge };
