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
    const changed = firstBlock !== currentFirstBlock || lastBlock !== currentLastBlock;

    currentEditor = editor;
    currentFirstBlock = firstBlock;
    currentLastBlock = lastBlock;
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
