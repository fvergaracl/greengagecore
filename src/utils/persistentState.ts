// src/utils/persistentState.ts

/**
 * Retrieves a persisted state from localStorage or sets a default value.
 * @param key The key used to persist the state.
 * @param defaultValue Default value if no persisted value is found.
 * @returns The retrieved or default value.
 */
export const getPersistedState = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue

  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : defaultValue
}

/**
 * Persists a value to localStorage.
 * @param key The key to persist the value.
 * @param value The value to be stored.
 */
export const persistState = <T>(key: string, value: T): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value))
  }
}
