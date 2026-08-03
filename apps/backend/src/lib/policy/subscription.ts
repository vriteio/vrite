const isTerminalSubscription = (status: string): boolean => {
  return status === "canceled" || status === "incomplete_expired";
};

export { isTerminalSubscription };
