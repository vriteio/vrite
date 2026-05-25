import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { TooltipProvider } from "#web/components/primitives";
import { QueryClientProvider, QueryClient } from "@tanstack/solid-query";
import { AppProvider } from "./context";
import "virtual:uno.css";
import "./styles.scss";

const App = () => {
  const queryClient = new QueryClient();

  return (
    <Router
      root={(props) => (
        <Suspense>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <AppProvider>{props.children}</AppProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </Suspense>
      )}
    >
      <FileRoutes />
    </Router>
  );
};

export default App;
