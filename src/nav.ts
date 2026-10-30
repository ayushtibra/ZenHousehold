export type Route = { tab: 'home' } | { tab: 'todo' } | { tab: 'settings'; addingHelper?: boolean } | { tab: 'helper'; id: string };

export function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  if (h.startsWith('helper/')) return { tab: 'helper', id: decodeURIComponent(h.slice(7)) };
  if (h === 'settings/add-helper') return { tab: 'settings', addingHelper: true };
  // 'helpers' was its own tab before helpers moved into Settings.
  if (h === 'settings' || h === 'helpers') return { tab: 'settings' };
  if (h === 'todo') return { tab: 'todo' };
  return { tab: 'home' };
}

export const go = (path: string) => (location.hash = `/${path}`);

/** Back to wherever the user came from (Home or Settings), or Home on a fresh load. */
export const goBack = () => (history.length > 1 ? history.back() : go(''));

/** Join code from an invite link (`/#join=ABCD-EFGH-JKLM`). */
export function joinCodeFromHash(): string | undefined {
  return location.hash.match(/^#join=([\w-]+)/)?.[1];
}
