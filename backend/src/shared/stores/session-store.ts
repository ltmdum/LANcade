export interface SessionStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  keys(): string[];
}

export function createSessionStore(): SessionStore {
  const data = new Map<string, unknown>();

  return {
    get<T>(key: string): T | undefined {
      return data.get(key) as T | undefined;
    },
    set<T>(key: string, value: T): void {
      data.set(key, value);
    },
    keys(): string[] {
      return Array.from(data.keys());
    },
  };
}
