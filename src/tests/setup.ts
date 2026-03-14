// Test setup: ensure locale defaults to 'zh' for backward-compatible test assertions
// Provide a minimal localStorage polyfill for Node test environment
const store: Record<string, string> = {}
;(globalThis as any).localStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { for (const k in store) delete store[k] },
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
}

import { setLocale } from '../src/demo/demo-i18n'
setLocale('zh')
