export function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (value === null) return fallback;
    return (JSON.parse(value) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeParse<T>(window.localStorage.getItem(key), fallback);
}

export function setStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export function removeStorage(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearStorageByKeys(keys: string[]) {
  if (typeof window === "undefined") return;
  keys.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  });
}
