export type ScopedWorkspaceValue<T> = {
  scopeKey: string | null;
  value: T;
} | null;

export function visibleWorkspaceValue<T>(
  state: ScopedWorkspaceValue<T>,
  activeKey: string | null,
): T | null {
  if (!state) return null;
  return state.scopeKey === null || state.scopeKey === activeKey ? state.value : null;
}
