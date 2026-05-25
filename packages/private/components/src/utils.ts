const isTouchDevice = (): boolean => {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    ("msMaxTouchPoints" in navigator &&
      typeof navigator.msMaxTouchPoints === "number" &&
      navigator.msMaxTouchPoints > 0)
  );
};

export { isTouchDevice };
