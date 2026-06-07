/* @refresh reload */
import { hydrate } from "solid-js/web";
import App from "./app";

hydrate(() => <App />, document.getElementById("app")!);
