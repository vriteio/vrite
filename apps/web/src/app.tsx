import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { TooltipProvider, ShortcutsProvider } from "@andesine/components";
import { Suspense } from "solid-js";
import { NotificationsProvider } from "./context/notifications";
import { LayoutProvider } from "./context/layout";
import "virtual:uno.css";
import "./styles.scss";

const App = () => {
  return (
    <Router
      root={(props) => (
        <Suspense>
          <TooltipProvider>
            <ShortcutsProvider>
              <NotificationsProvider>
                <LayoutProvider>{props.children}</LayoutProvider>
              </NotificationsProvider>
            </ShortcutsProvider>
          </TooltipProvider>
        </Suspense>
      )}
    >
      <FileRoutes />
    </Router>
  );
};

export default App;
