export const hasWindow = typeof window !== "undefined";

export const safeParse = <T>(value: string | null, fallback: T): T => {
  try {
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
};

export const loadStorage = <T>(key: string, fallback: T): T => {
  if (!hasWindow) return fallback;
  return safeParse<T>(window.localStorage.getItem(key), fallback);
};

export const saveStorage = (key: string, value: unknown) => {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write failures
  }
};

export const generateId = (prefix = "id") => {
  if (hasWindow && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};
