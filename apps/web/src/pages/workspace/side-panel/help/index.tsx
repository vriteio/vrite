import { type Component, For } from "solid-js";

interface HelpMenuItem {
  icon: string;
  label: string;
  href: string;
}

interface HelpMenuSection {
  label: string;
  items: HelpMenuItem[];
}

// TODO: Update links once new resources are available
const menu: HelpMenuSection[] = [
  {
    label: "Resources",
    items: [
      {
        icon: "i-lucide:book-open",
        label: "Documentation",
        href: "https://docs.vrite.io"
      },
      {
        icon: "i-lucide:square-terminal",
        label: "API Reference",
        href: "https://docs.vrite.io/api/authentication"
      }
    ]
  },
  {
    label: "Community",
    items: [
      {
        icon: "i-tabler:brand-github",
        label: "Star on GitHub",
        href: "https://github.com/vriteio/vrite"
      },
      {
        icon: "i-tabler:brand-discord",
        label: "Join Discord",
        href: "https://discord.gg/yYqDWyKnqE"
      }
    ]
  }
];

const HelpPanel: Component = () => (
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-1 scrollbar-sm">
    <h2 class="my-0.5 text-2xl font-semibold">Help</h2>
    <div class="flex flex-col gap-3">
      <For each={menu}>
        {(section) => (
          <div class="flex min-w-0 flex-col">
            <span class="ml-1 text-gray-400 dark:text-gray-500 text-xs leading-normal">
              {section.label}
            </span>
            <div class="flex flex-col gap-0.5">
              <For each={section.items}>
                {(item) => (
                  <a
                    class="group relative flex min-h-7 w-full flex-1 select-none items-center gap-1 overflow-hidden rounded-lg pl-0.5 text-left font-medium hover:bg-gradient-to-r hover:from-gray-500/10 hover:to-transparent focus:outline-none"
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div class="flex h-6 w-6 items-center justify-center">
                      <div class={`${item.icon} h-5 w-5 text-gray-400 dark:text-gray-500`} />
                    </div>
                    <span class="flex-1 line-clamp-1">{item.label}</span>
                  </a>
                )}
              </For>
            </div>
          </div>
        )}
      </For>
    </div>
  </div>
);

export { HelpPanel };
