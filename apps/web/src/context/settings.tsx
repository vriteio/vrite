import { useNavigate, useParams } from "@solidjs/router";
import { createContext, createMemo, ParentComponent, useContext } from "solid-js";

import { useWorkspace } from "#web/context/workspace";

interface SettingsMenuItem {
  icon: string;
  label: string;
  id: string;
}

interface SettingsMenuGroup {
  label?: string;
  items: SettingsMenuItem[];
}

interface SettingsContextValue {
  activeTabID: string;
  setActiveTabID(tabID: string): void;
  menu: () => SettingsMenuGroup[];
}

const SettingsContext = createContext<SettingsContextValue>();

const useSettings = () => {
  const settings = useContext(SettingsContext);

  if (!settings) {
    throw new Error("Settings components must be used within SettingsProvider");
  }

  return settings;
};

const SettingsProvider: ParentComponent = (props) => {
  const { sessions, currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string; tabID?: string }>();
  const activeTabID = () => params.tabID || "profile";
  const setActiveTabID = (tabID: string) => {
    navigate(`/${params.workspaceID || ""}/settings/${encodeURIComponent(tabID)}`);
  };
  const userName = createMemo(() => {
    const sessionList = sessions();
    const user = sessionList.find((s) => s.user.id === currentWorkspace()?.userID)?.user;

    return user?.name || user?.email || "Profile";
  });
  const menu = createMemo<SettingsMenuGroup[]>(() => {
    return [
      {
        label: "Personal",
        items: [
          {
            icon: "i-lucide:circle-user",
            label: userName(),
            id: "personal"
          }
        ]
      },
      ...(Boolean(currentWorkspace())
        ? [
            {
              label: "Workspace",
              items: [
                {
                  icon: "i-lucide:hexagon",
                  label: "General",
                  id: "workspace"
                },
                {
                  icon: "i-lucide:users",
                  label: "People",
                  id: "people"
                },
                {
                  icon: "i-lucide:credit-card",
                  label: "Billing",
                  id: "billing"
                },
                {
                  icon: "i-lucide:code-xml",
                  label: "API",
                  id: "api"
                }
              ]
            }
          ]
        : [])
    ];
  });

  return (
    <SettingsContext.Provider
      value={{
        get activeTabID() {
          return activeTabID();
        },
        setActiveTabID,
        menu
      }}
    >
      {props.children}
    </SettingsContext.Provider>
  );
};

export { SettingsProvider, useSettings };
export type { SettingsContextValue, SettingsMenuGroup, SettingsMenuItem };
