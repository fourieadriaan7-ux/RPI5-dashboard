export type DhcpLease = {
  expiresAt?: Date;
  mac: string;
  ip: string;
  hostname?: string;
  clientId?: string;
};

export const parseDnsmasqLeases = (content: string, now = new Date()): DhcpLease[] =>
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const [expiry, mac, ip, hostname, clientId] = line.split(/\s+/);
      if (!expiry || !mac || !ip) return [];

      const expirySeconds = Number(expiry);
      const expiresAt =
        Number.isFinite(expirySeconds) && expirySeconds > 0
          ? new Date(expirySeconds * 1000)
          : undefined;

      return [
        {
          expiresAt,
          mac: mac.toLowerCase(),
          ip,
          hostname: hostname && hostname !== "*" ? hostname : undefined,
          clientId: clientId && clientId !== "*" ? clientId : undefined
        }
      ];
    })
    .filter((lease) => !lease.expiresAt || lease.expiresAt.getTime() >= now.getTime());
