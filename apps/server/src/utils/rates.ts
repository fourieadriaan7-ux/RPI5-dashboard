export type CounterSample = {
  bytes: number;
  sampledAt: number;
};

export const calculateRateBps = (previous: CounterSample | undefined, current: CounterSample): number => {
  if (!previous) return 0;
  if (current.bytes < previous.bytes) return 0;

  const elapsedSeconds = (current.sampledAt - previous.sampledAt) / 1000;
  if (elapsedSeconds <= 0) return 0;

  return (current.bytes - previous.bytes) / elapsedSeconds;
};
