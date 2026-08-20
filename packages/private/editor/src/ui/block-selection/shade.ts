const createBlockSelectionShade = (
  container: HTMLElement,
  className: string,
  { prepend = false }: { prepend?: boolean } = {}
) => {
  const element = document.createElement("div");

  let currentEditor: HTMLElement | null = null;
  let currentFirstBlock: HTMLElement | null = null;
  let currentLastBlock: HTMLElement | null = null;

  element.className = className;
  element.hidden = true;
  element.setAttribute("aria-hidden", "true");

  if (prepend) {
    container.prepend(element);
  } else {
    container.append(element);
  }

  const getFragment = (block: HTMLElement): HTMLElement | null => {
    if (block.matches("[data-fragment-node-view]")) return block;

    return block.querySelector<HTMLElement>("[data-fragment-node-view]");
  };
  const getFirstVisualBlock = (block: HTMLElement): HTMLElement => {
    const fragment = getFragment(block);

    if (!fragment) return block;

    return fragment.querySelector<HTMLElement>("[data-fragment-header]") || block;
  };
  const getLastVisualBlock = (block: HTMLElement): HTMLElement => {
    const fragment = getFragment(block);

    if (!fragment) return block;

    const content = fragment.querySelector<HTMLElement>("[data-node-view-content]");

    return content?.lastElementChild instanceof HTMLElement ? content.lastElementChild : block;
  };
  const position = () => {
    if (!currentEditor || !currentFirstBlock || !currentLastBlock) return;

    const containerRect = container.getBoundingClientRect();
    const editorRect = currentEditor.getBoundingClientRect();
    const firstRect = currentFirstBlock.getBoundingClientRect();
    const lastRect = currentLastBlock.getBoundingClientRect();

    element.style.height = `${lastRect.bottom - firstRect.top + 8}px`;
    element.style.left = `${editorRect.left - containerRect.left + container.scrollLeft - 8}px`;
    element.style.top = `${firstRect.top - containerRect.top + container.scrollTop - 4}px`;
    element.style.width = `${editorRect.width + 16}px`;
  };
  const show = (editor: HTMLElement, firstBlock: HTMLElement, lastBlock: HTMLElement) => {
    const firstVisualBlock = getFirstVisualBlock(firstBlock);
    const lastVisualBlock = getLastVisualBlock(lastBlock);
    const changed = firstVisualBlock !== currentFirstBlock || lastVisualBlock !== currentLastBlock;

    currentEditor = editor;
    currentFirstBlock = firstVisualBlock;
    currentLastBlock = lastVisualBlock;
    if (changed) position();
    element.hidden = false;
  };

  return {
    element,
    hide: () => {
      element.hidden = true;
      currentFirstBlock = null;
      currentLastBlock = null;
    },
    refresh: position,
    remove: () => element.remove(),
    show
  };
};

export { createBlockSelectionShade };
