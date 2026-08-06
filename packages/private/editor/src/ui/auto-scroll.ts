interface ClientPosition {
  clientX: number;
  clientY: number;
}

const SCROLL_THRESHOLD = 50;
const BASE_SPEED = 3;
const MAX_SPEED_MULTIPLIER = 10;

const createVerticalAutoScroll = (
  getContainer: () => HTMLElement | null,
  onScroll?: (position: ClientPosition, offset: number) => void
) => {
  let frame: number | null = null;
  let position: ClientPosition | null = null;
  const stop = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    position = null;
  };
  const scroll = () => {
    frame = null;
    const container = getContainer();

    if (!container || !position) return;

    const rect = container.getBoundingClientRect();
    const distanceFromTop = Math.max(0, position.clientY - rect.top);
    const distanceFromBottom = Math.max(0, rect.bottom - position.clientY);
    const distance =
      distanceFromTop < SCROLL_THRESHOLD
        ? distanceFromTop
        : distanceFromBottom < SCROLL_THRESHOLD
          ? distanceFromBottom
          : null;

    if (distance === null) return;

    const direction = distance === distanceFromTop ? -1 : 1;
    const speed =
      BASE_SPEED *
      Math.max(1, ((SCROLL_THRESHOLD - distance) / SCROLL_THRESHOLD) * MAX_SPEED_MULTIPLIER);
    const previous = container.scrollTop;
    const max = container.scrollHeight - container.clientHeight;

    container.scrollTop = Math.min(max, Math.max(0, previous + direction * speed));

    const offset = container.scrollTop - previous;

    if (!offset) return;

    onScroll?.(position, offset);
    frame = requestAnimationFrame(scroll);
  };
  const update = (nextPosition: ClientPosition) => {
    position = {
      clientX: nextPosition.clientX,
      clientY: nextPosition.clientY
    };

    if (frame === null) frame = requestAnimationFrame(scroll);
  };

  return { stop, update };
};

export { createVerticalAutoScroll };
