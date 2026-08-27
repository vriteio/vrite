import { DropdownMenu, IconButton, Input, type MenuItem } from "@andesine/components";
import { type Component, createMemo, createSignal, type JSX } from "solid-js";
import type { Role } from "#web/lib/api";

interface AccessPrincipal {
  detail: string;
  icon: string;
  id: string;
  label: string;
}
interface AddAccessMenuProps {
  label: string;
  loading: boolean;
  principals: AccessPrincipal[];
  roles: Role[];
  onAdd(id: string, roleID: string): void;
}

const AddAccessMenu: Component<AddAccessMenuProps> = (props) => {
  const [opened, setOpened] = createSignal(false);
  const [search, setSearch] = createSignal("");
  const [searchInputTabIndex, setSearchInputTabIndex] = createSignal(0);
  const principalLabel = () => props.label.slice(0, -1);
  const searchItem = () => (
    <div class="flex w-full min-w-0 flex-col gap-1 p-1 md:min-w-60" data-access-menu-input>
      <Input
        autofocus
        class="w-full min-w-0 bg-gray-50"
        label={`Filter ${principalLabel().toLowerCase()}s`}
        size="small"
        color="contrast"
        variant="outlined"
        placeholder={`Search ${props.label.toLocaleLowerCase()}`}
        tabIndex={searchInputTabIndex()}
        value={search()}
        setValue={setSearch}
        onFocus={() => setSearchInputTabIndex(-1)}
        onKeyDown={(event) => event.stopPropagation()}
      />
    </div>
  );
  const filteredPrincipals = createMemo(() => {
    const query = search().trim().toLocaleLowerCase();

    if (!query) return props.principals;

    return props.principals.filter((principal) => {
      return `${principal.label} ${principal.detail}`.toLocaleLowerCase().includes(query);
    });
  });
  const items = createMemo<Array<Array<MenuItem | (() => JSX.Element)>>>(() => {
    const principalItems = filteredPrincipals().map((principal) => ({
      label: principal.label,
      icon: principal.icon,
      items: props.roles.map((role) => ({
        label: role.name,
        onClick: () => props.onAdd(principal.id, role.id)
      }))
    }));

    if (principalItems.length > 0) return [[searchItem], principalItems];

    return [
      [searchItem],
      [
        {
          label:
            props.principals.length > 0
              ? `No matching ${props.label.toLocaleLowerCase()}`
              : `All ${props.label.toLocaleLowerCase()} have access`,
          disabled: true
        }
      ]
    ];
  });

  return (
    <DropdownMenu
      title={`Add ${props.label.toLocaleLowerCase()}`}
      placement="bottom-end"
      portal={false}
      positioningStrategy="absolute"
      cardProps={{ class: "w-full max-w-none not-prose md:max-w-64" }}
      opened={opened()}
      setOpened={(nextOpened) => {
        if (!opened() && nextOpened) setSearchInputTabIndex(0);

        setOpened(nextOpened);
        if (!nextOpened) setSearch("");
      }}
      trigger={() => (
        <IconButton
          label={() => <span class="px-1">Add {props.label.toLocaleLowerCase()}</span>}
          class="flex-row-reverse pr-1"
          iconProps={{ class: "h-4 w-4" }}
          icon="i-lucide:plus"
          size="small"
          color="contrast"
          variant="outlined"
          text="soft"
          disabled={props.loading || props.roles.length === 0}
        />
      )}
      items={items()}
    />
  );
};

export { AddAccessMenu };
export type { AccessPrincipal };
