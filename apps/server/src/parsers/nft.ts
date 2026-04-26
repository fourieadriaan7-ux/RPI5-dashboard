export type NftCounter = {
  ip: string;
  bytes: number;
  packets: number;
};

type NftJson = {
  nftables?: Array<{
    set?: {
      elem?: unknown[];
    };
  }>;
};

const extractCounter = (value: unknown): { bytes: number; packets: number } | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as { counter?: { bytes?: number; packets?: number } };
  if (!candidate.counter) return undefined;
  return {
    bytes: Number(candidate.counter.bytes ?? 0),
    packets: Number(candidate.counter.packets ?? 0)
  };
};

export const parseNftSetCounters = (content: string): NftCounter[] => {
  const parsed = JSON.parse(content) as NftJson;
  const elems = parsed.nftables?.flatMap((item) => item.set?.elem ?? []) ?? [];

  return elems.flatMap((elem) => {
    if (typeof elem === "string") return [{ ip: elem, bytes: 0, packets: 0 }];
    if (!elem || typeof elem !== "object") return [];

    const raw = elem as { elem?: { val?: unknown; counter?: { bytes?: number; packets?: number } } };
    if (raw.elem) {
      const ip = String(raw.elem.val ?? "");
      if (!ip) return [];
      return [
        {
          ip,
          bytes: Number(raw.elem.counter?.bytes ?? 0),
          packets: Number(raw.elem.counter?.packets ?? 0)
        }
      ];
    }

    const tuple = elem as { val?: unknown; counter?: { bytes?: number; packets?: number } };
    const counter = extractCounter(tuple);
    const ip = String(tuple.val ?? "");
    return ip ? [{ ip, bytes: counter?.bytes ?? 0, packets: counter?.packets ?? 0 }] : [];
  });
};
