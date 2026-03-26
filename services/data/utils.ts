export const safeUuid = () => crypto.randomUUID();

export const sortByNewest = <T extends { createdAt?: string; timestamp?: string; updatedAt?: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    const left = new Date(a.updatedAt || a.timestamp || a.createdAt || 0).getTime();
    const right = new Date(b.updatedAt || b.timestamp || b.createdAt || 0).getTime();
    return right - left;
  });
