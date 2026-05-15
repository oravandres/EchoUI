import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

const testLocalStorage = createMemoryStorage();

// Vitest globals are disabled in this project, so React Testing Library's
// automatic cleanup (normally wired to `afterEach`) is not registered.
// Register it once here so every test file unmounts rendered components
// between cases and queries do not see stale DOM from previous tests.
beforeEach(() => {
  installMemoryLocalStorage();
  resetBrowserState();
});

afterEach(() => {
  cleanup();
  resetBrowserState();
});

function installMemoryLocalStorage() {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: testLocalStorage,
  });
}

function resetBrowserState() {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}
