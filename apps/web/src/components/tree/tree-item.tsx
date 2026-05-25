import { Checkbox } from "@andesine/components";
import clsx from "clsx";
import { Component, createEffect, createSignal, JSX, Show } from "solid-js";
import { useTree } from "./tree-context";

interface TreeItemProps {
  id: string;
  label: string;
  children?: JSX.Element;
  topLevel?: boolean;
  icon: JSX.Element;
  selectable?: boolean;
  actions?: JSX.Element;
  highlighted?: boolean;
  dataAttributes?: Record<string, string>;
  class?: string;
  ref?: (el: HTMLElement) => void;
  onClick?: (event: MouseEvent) => void;
  onRename?: (name: string) => void;
  renderLabel?: (label: JSX.Element) => JSX.Element;
}

const TreeItem: Component<TreeItemProps> = (props) => {
  const [{ isRenaming, isSelected, flattenedOrder }, { setSelection, setRenaming }] = useTree();
  const [currentName, setCurrentName] = createSignal("");

  createEffect(() => {
    if (isRenaming(props.id)) {
      setCurrentName(props.label);
    }
  });

  const handleClick = (event: MouseEvent) => {
    event.stopPropagation();

    if (event.metaKey || event.shiftKey) {
      setSelection((sel) => {
        if (event.shiftKey) {
          if (sel.length === 0) {
            return [props.id];
          }

          const order = flattenedOrder();
          const index = order.indexOf(props.id);
          const startIndex = order.findIndex((id) => sel.includes(id));
          const endIndex = order.findLastIndex((id) => sel.includes(id));

          if (index < startIndex) {
            return order.slice(index, endIndex + 1);
          }

          return order.slice(startIndex, index + 1);
        } else if (event.metaKey) {
          if (sel.includes(props.id)) {
            return sel.filter((id) => id !== props.id);
          }

          return [...sel, props.id];
        }

        return [props.id];
      });
    } else if (
      props.selectable &&
      event.target instanceof HTMLElement &&
      event.target.closest("[data-tree-selectable]")
    ) {
      if (isSelected(props.id)) {
        setSelection((sel) => sel.filter((id) => id !== props.id));
      } else {
        setSelection((sel) => [...sel, props.id]);
      }
    } else {
      setSelection([]);
      props.onClick?.(event);
    }
  };

  const selectableIcon = () => {
    if (!props.selectable) return props.icon;

    const selected = isSelected(props.id);

    return (
      <div data-tree-selectable class="flex items-center justify-center h-6 w-6">
        <Show
          when={selected}
          fallback={
            <div class="h-6 w-6 flex justify-center items-center group-hover:hidden">
              {props.icon}
            </div>
          }
        >
          <Checkbox size="small" checked={true} />
        </Show>
        <Show when={!selected}>
          <div class="hidden group-hover:block">
            <Checkbox size="small" checked={false} />
          </div>
        </Show>
      </div>
    );
  };

  return (
    <div
      class={clsx(
        ":base: relative flex flex-1 gap-1 min-h-7 font-medium items-center pl-0.5 rounded-r-lg group hover:cursor-pointer w-full overflow-hidden",
        !isSelected(props.id) &&
          !props.highlighted &&
          ":base: from-gray-500/10 to-transparent @hover:bg-gradient-to-r",
        props.topLevel && ":base: rounded-l-lg",
        props.class
      )}
      ref={props.ref}
      onClick={handleClick}
      {...Object.fromEntries(
        Object.entries(props.dataAttributes || {}).map(([k, v]) => [`data-${k}`, v])
      )}
    >
      <Show when={props.highlighted && !isSelected(props.id)}>
        <div class="left-0 -z-10 rounded-lg absolute h-full w-full opacity-10 from-secondary via-primary to-transparent bg-gradient-to-r" />
      </Show>
      {selectableIcon()}

      <Show
        when={props.children}
        fallback={(props.renderLabel || ((label) => label))(
          <Show
            when={!isRenaming(props.id)}
            fallback={
              <div
                ref={(el) => {
                  el.textContent = props.label;
                  setCurrentName(props.label);
                  setTimeout(() => {
                    el.focus();
                    const range = document.createRange();
                    range.selectNodeContents(el);
                    const sel = window.getSelection();
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                  }, 0);
                }}
                contentEditable={true}
                class="flex-1 outline-none bg-transparent whitespace-nowrap overflow-hidden min-w-4 cursor-text"
                onInput={(e) => {
                  setCurrentName(e.currentTarget.textContent || "");
                }}
                onBlur={() => {
                  props.onRename?.(currentName());
                  setRenaming("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    setRenaming("");
                  }
                }}
              />
            }
          >
            <span class="flex-1 line-clamp-1" title={props.label}>
              {props.label}
            </span>
          </Show>
        )}
      >
        {props.children}
      </Show>
      {props.actions}
    </div>
  );
};

export { TreeItem };
export type { TreeItemProps };
