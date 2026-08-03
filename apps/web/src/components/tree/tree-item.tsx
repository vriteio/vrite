import { Checkbox, createRef } from "@andesine/components";
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
  checkbox?: boolean;
  actions?: JSX.Element;
  highlighted?: boolean;
  dataAttributes?: Record<string, string>;
  class?: string;
  labelMaxLength?: number;
  ref?: (el: HTMLElement) => void;
  onClick?: (event: MouseEvent) => void;
  onRename?: (name: string) => void;
  renderLabel?: (label: JSX.Element) => JSX.Element;
}

const TreeItem: Component<TreeItemProps> = (props) => {
  const [
    { focusedSource, isFocused, isRenaming, isSelected, flattenedOrder },
    { setFocusedItem, setSelection, setRenaming }
  ] = useTree();
  const [currentName, setCurrentName] = createSignal("");
  const [cancelledRef, setCancelledRef] = createRef(false);
  const focusItem = () => {
    setFocusedItem(props.id, "hover");
  };
  const clearHoverFocus = () => {
    if (isFocused(props.id) && focusedSource() === "hover") {
      setFocusedItem(null, null);
    }
  };
  const handleClick = (event: MouseEvent) => {
    const selected = isSelected(props.id);

    event.stopPropagation();

    if (
      props.selectable &&
      (selected || props.checkbox) &&
      event.target instanceof HTMLElement &&
      event.target.closest("[data-tree-selectable]")
    ) {
      setSelection((sel) => {
        if (selected) {
          return sel.filter((id) => id !== props.id);
        } else {
          return [...sel, props.id];
        }
      });

      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey) {
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
        } else if (event.metaKey || event.ctrlKey) {
          if (sel.includes(props.id)) {
            return sel.filter((id) => id !== props.id);
          }

          return [...sel, props.id];
        }

        return [props.id];
      });
    } else {
      setSelection([]);
      props.onClick?.(event);
    }
  };

  createEffect(() => {
    if (isRenaming(props.id)) {
      setCancelledRef(false);
      setCurrentName(props.label);
    }
  });
  const submitRename = () => {
    props.onRename?.(currentName());
    setSelection([]);
    setRenaming("");
  };

  return (
    <div
      class={clsx(
        ":base: relative flex flex-1 gap-1 min-h-7 font-medium items-center pl-0.5 rounded-r-lg group hover:cursor-pointer w-full overflow-hidden select-none",
        props.selectable &&
          isFocused(props.id) &&
          !isSelected(props.id) &&
          !props.highlighted &&
          ":base: bg-gradient-to-r from-gray-500/10 to-transparent",
        props.topLevel && ":base: rounded-l-lg",
        props.class
      )}
      ref={props.ref}
      onClick={handleClick}
      onPointerEnter={focusItem}
      onPointerLeave={clearHoverFocus}
      data-tree-item={props.id}
      {...Object.fromEntries(
        Object.entries(props.dataAttributes || {}).map(([k, v]) => [`data-${k}`, v])
      )}
    >
      <Show when={props.highlighted && !isSelected(props.id)}>
        <div
          class={clsx(
            "left-0 -z-10 rounded-r-lg absolute h-full w-full opacity-10 from-secondary via-primary to-transparent bg-gradient-to-r",
            props.topLevel && "rounded-l-lg"
          )}
        />
      </Show>
      <Show
        when={props.selectable}
        fallback={<div class="flex items-center justify-center h-6 w-6">{props.icon}</div>}
      >
        <div data-tree-selectable class="flex items-center justify-center h-6 w-6">
          <Show when={!props.checkbox || !isSelected(props.id)}>
            <div
              class={clsx(
                "h-6 w-6 flex justify-center items-center",
                props.checkbox && "group-hover:hidden"
              )}
            >
              {props.icon}
            </div>
          </Show>
          <Show when={props.checkbox}>
            <div class={clsx(!isSelected(props.id) && "hidden group-hover:block")}>
              <Checkbox size="small" checked={isSelected(props.id)} />
            </div>
          </Show>
        </div>
      </Show>
      <Show
        when={props.children}
        fallback={(props.renderLabel || ((label) => label))(
          <Show
            when={!isRenaming(props.id)}
            fallback={
              <input
                ref={(el) => {
                  setCurrentName(props.label);
                  setTimeout(() => {
                    el.focus();
                    el.select();
                  }, 0);
                }}
                type="text"
                value={currentName()}
                maxLength={props.labelMaxLength}
                class="min-w-4 flex-1 cursor-text select-text overflow-hidden whitespace-nowrap bg-transparent outline-none"
                onInput={(e) => {
                  setCurrentName(e.currentTarget.value);
                }}
                onBlur={() => {
                  if (cancelledRef()) return;

                  submitRename();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    setCancelledRef(true);
                    submitRename();
                  }

                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    setRenaming("");
                    setCancelledRef(true);
                  }
                }}
              />
            }
          >
            <span class="flex-1 line-clamp-1">{props.label}</span>
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
