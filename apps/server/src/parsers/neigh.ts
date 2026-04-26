export type NeighborEntry = {
  ip: string;
  dev?: string;
  mac?: string;
  state?: string;
};

type RawNeighbor = {
  dst?: string;
  dev?: string;
  lladdr?: string;
  state?: string[];
};

export const parseNeighbors = (content: string): NeighborEntry[] => {
  const parsed = JSON.parse(content) as RawNeighbor[];
  return parsed
    .filter((entry) => entry.dst)
    .filter((entry) => !(entry.state ?? []).includes("FAILED"))
    .map((entry) => ({
      ip: entry.dst ?? "",
      dev: entry.dev,
      mac: entry.lladdr?.toLowerCase(),
      state: entry.state?.join(",")
    }));
};
