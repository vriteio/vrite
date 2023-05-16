import { TagsDropdown } from "./tags-dropdown";
import {
  mdiLinkVariantMinus,
  mdiLinkVariantPlus,
  mdiLinkVariantOff,
  mdiCalendarRemoveOutline,
  mdiCalendarPlusOutline,
  mdiTagPlusOutline,
  mdiTagRemoveOutline,
  mdiClose,
  mdiLinkVariant,
  mdiCalendarOutline,
  mdiTagOutline
} from "@mdi/js";
import dayjs from "dayjs";
import { Component, createSignal, Show, For } from "solid-js";
import clsx from "clsx";
import { debounce } from "@solid-primitives/scheduled";
import { Tooltip, IconButton, Input, Dropdown, Icon } from "#components/primitives";
import { App } from "#context";
import { tagColorClasses } from "#lib/utils";

interface DetailsSectionProps {
  canonicalLink?: string | null;
  date?: string | null;
  tags: App.Tag[];
  editable?: boolean;
  setCanonicalLink(canonicalLink: string | null): void;
  setDate(date: string | null): void;
  setTags(tags: App.Tag[]): void;
}
interface DatePickerProps {
  date: string;
  editable?: boolean;
  setDate(date?: string | null): void;
}

const DatePicker: Component<DatePickerProps> = (props) => {
  return (
    <Input
      type="date"
      value={dayjs(props.date).format("YYYY-MM-DD")}
      class="form-input"
      color={"base"}
      disabled={props.editable === false}
      onBlur={(event) => {
        const { value } = event.currentTarget;

        if (!value) {
          props.setDate(undefined);

          return;
        }

        const parsedValue = dayjs(value, "YYYY-MM-DD");

        props.setDate(
          dayjs(props.date)
            .set("year", parsedValue.get("year"))
            .set("month", parsedValue.get("month"))
            .set("date", parsedValue.get("date"))
            .toISOString()
        );
      }}
    />
  );
};
const DetailsSection: Component<DetailsSectionProps> = (props) => {
  const [newTagOpened, setNewTagOpened] = createSignal(false);
  const handleCanonicalLinkChange = debounce((value: string) => {
    props.setCanonicalLink(value);
  }, 350);

  return (
    <>
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
            setValue={(value) => {
              handleCanonicalLinkChange.clear();
              handleCanonicalLinkChange(value);
            }}
          />
        </Show>
      </div>
      <div class="flex items-center justify-start">
        <Tooltip
          text={props.date ? "Remove date" : "Add date"}
          side="right"
          enabled={props.editable !== false}
        >
          <IconButton
            path={(() => {
              if (props.editable === false) return mdiCalendarOutline;
              if (props.date) return mdiCalendarRemoveOutline;

              return mdiCalendarPlusOutline;
            })()}
            variant="text"
            onClick={() => {
              props.setDate(props.date ? null : new Date().toISOString());
            }}
            disabled={props.editable === false}
            badge={props.editable === false}
            hover={props.editable !== false}
          />
        </Tooltip>
        <Show
          when={props.date}
          fallback={
            <IconButton
              path={mdiCalendarRemoveOutline}
              label="No date"
              color={"base"}
              text="soft"
              onClick={() => {
                props.setDate(props.date ? null : new Date().toISOString());
              }}
              disabled={props.editable === false}
              badge={props.editable === false}
              hover={props.editable !== false}
            />
          }
        >
          <DatePicker date={props.date!} setDate={props.setDate} editable={props.editable} />
        </Show>
      </div>
      <div class="flex items-start justify-start">
        <Show
          when={props.editable !== false}
          fallback={<IconButton path={mdiTagOutline} variant="text" badge hover={false} />}
        >
          <Dropdown
            opened={newTagOpened()}
            setOpened={setNewTagOpened}
            placement="bottom-start"
            fixed
            cardProps={{ class: "p-2 !max-h-64 !max-w-80" }}
            activatorButton={() => (
              <Tooltip text="Add tag" side="right">
                <IconButton path={mdiTagPlusOutline} variant="text" />
              </Tooltip>
            )}
          >
            <TagsDropdown
              opened={newTagOpened()}
              setOpened={setNewTagOpened}
              setTags={props.setTags}
              tags={props.tags}
            />
          </Dropdown>
        </Show>
        <div class={clsx("flex justify-center items-center", props.tags.length && "mt-1 ml-1")}>
          <div class="flex flex-wrap gap-2 justify-start items-center">
            <For
              each={props.tags}
              fallback={
                <IconButton
                  path={mdiTagRemoveOutline}
                  label="No tags"
                  text="soft"
                  class="whitespace-nowrap"
                  disabled={props.editable === false}
                  badge={props.editable === false}
                  hover={props.editable !== false}
                  onClick={() => {
                    setNewTagOpened(true);
                  }}
                />
              }
            >
              {(tag) => {
                return (
                  <button
                    class={clsx(
                      tagColorClasses[tag.color],
                      "rounded-lg px-1.5 border-2 h-8 text-base flex justify-start items-center font-semibold",
                      "border-opacity-50 bg-opacity-20 dark:(border-opacity-50 bg-opacity-20) hover:opacity-80"
                    )}
                  >
                    {tag.label}
                    <Icon
                      path={mdiClose}
                      class="h-5 w-5 ml-1"
                      onClick={() => {
                        props.setTags(
                          props.tags.filter((filteredTag) => filteredTag.id !== tag.id)
                        );
                      }}
                    />
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </div>
    </>
  );
};

export { DetailsSection };
