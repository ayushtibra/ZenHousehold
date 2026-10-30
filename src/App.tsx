import { useEffect, useState } from 'react';
import { useSession } from './db';
import { ensureMember, startAutoSync, syncNow } from './sync';
import { go, parseHash } from './nav';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Todo from './pages/Todo';
import HelperDetail from './pages/HelperDetail';
import Settings from './pages/Settings';

const TABS = [
  ['home', '🏠', 'Home'],
  ['todo', '✅', 'To-do'],
  ['settings', '⚙️', 'Settings'],
] as const;

export default function App() {
  const session = useSession();
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const code = session?.code;
  useEffect(() => {
    if (!code) return;
    const stop = startAutoSync();
    // Households joined before members existed get listed once the first sync is in.
    void syncNow().then(ensureMember);
    return stop;
  }, [code]);

  if (session === undefined) return null;
  if (!session) return <Onboarding />;

  const activeTab = route.tab === 'helper' ? 'settings' : route.tab;
  return (
    <div className="app">
      <main className="content">
        {route.tab === 'home' && <Home />}
        {route.tab === 'todo' && <Todo session={session} />}
        {route.tab === 'helper' && <HelperDetail key={route.id} id={route.id} />}
        {route.tab === 'settings' && <Settings session={session} addingHelper={route.addingHelper} />}
      </main>
      <nav className="tabbar">
        {TABS.map(([key, icon, label]) => (
          <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => go(key === 'home' ? '' : key)}>
            <span aria-hidden className="tab-icon">
              {icon}
            </span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
