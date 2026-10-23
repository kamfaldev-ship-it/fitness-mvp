import { Context, createContext } from 'react';

// Fast Refresh re-runs a module each time it is edited. A plain `createContext()` at module level
// then creates a NEW context while the already mounted provider still uses the old one, and every
// consumer fails with "useStore outside StoreProvider". Keeping the context on globalThis makes
// both the old and the new module instance share the same object. No effect in production.
export function stableContext<T>(name: string, initial: T): Context<T> {
  const registry = ((globalThis as any).__stableContexts ??= {}) as Record<string, Context<T>>;
  return (registry[name] ??= createContext<T>(initial));
}
