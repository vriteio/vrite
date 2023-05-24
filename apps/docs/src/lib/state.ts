import { createSignal } from "solid-js";

const [menuOpened, setMenuOpened] = createSignal(false);

export { menuOpened, setMenuOpened };
