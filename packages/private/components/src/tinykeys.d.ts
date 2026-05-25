declare module "tinykeys" {
  export function tinykeys(
    target: Window | Document | HTMLElement,
    keyBindingMap: Record<string, (event: KeyboardEvent) => void>
  ): () => void;
}
