import {
  mdiLinkVariant,
  mdiLinkVariantMinus,
  mdiLinkVariantPlus,
  mdiLinkVariantOff
} from "@mdi/js";
import { Tooltip, IconButton, Input } from "#components/primitives";
import { Component, Show } from "solid-js";

interface CanonicalLinkInputProps {
  canonicalLink?: string | null;
  setCanonicalLink: (value: string | null) => void;
  editable?: boolean;
}

const CanonicalLinkInput: Component<CanonicalLinkInputProps> = (props) => {
  return (
    <div class="flex">
      <Tooltip
        side="right"
        text={
          typeof props.canonicalLink === "string" ? "Remove canonical link" : "Add canonical link"
        }
        enabled={props.editable !== false}
      >
        <IconButton
          path={(() => {
            if (props.editable === false) return mdiLinkVariant;
            if (typeof props.canonicalLink === "string") return mdiLinkVariantMinus;

            return mdiLinkVariantPlus;
          })()}
          variant="text"
          badge={props.editable === false}
          hover={props.editable !== false}
          disabled={props.editable === false}
          onClick={() => {
            props.setCanonicalLink(typeof props.canonicalLink === "string" ? null : "");
          }}
        />
      </Tooltip>
      <Show
        when={typeof props.canonicalLink === "string"}
        fallback={
          <IconButton
            path={mdiLinkVariantOff}
            label="No canonical link"
            color={"base"}
            text="soft"
            disabled={props.editable === false}
            badge={props.editable === false}
            hover={props.editable !== false}
            onClick={() => {
              props.setCanonicalLink("");
            }}
          />
        }
      >
        <Input
          value={props.canonicalLink || ""}
          placeholder="Canonical link"
          wrapperClass="w-72"
          disabled={props.editable === false}
          color={"base"}
          onChange={(event) => {
            const { value } = event.currentTarget;

            props.setCanonicalLink(value);
          }}
        />
      </Show>
    </div>
  );
};

export { CanonicalLinkInput };
