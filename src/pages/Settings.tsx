import { useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Session } from '../types';
import { formatCode, getSyncStatus, leaveHousehold, renameMember, subscribeSync, syncNow } from '../sync';
import { dateKey, shortDate } from '../lib/dates';
import { usePeople } from '../lib/people';
import HelperList from '../components/HelperList';

export default function Settings({ session, addingHelper }: { session: Session; addingHelper?: boolean }) {
  const { members } = usePeople();
  const [member, setMember] = useState(session.member);
  const [copied, setCopied] = useState(false);
  const status = useSyncExternalStore(subscribeSync, getSyncStatus);
  const pending = useLiveQuery(() => db.outbox.count(), []) ?? 0;

  const code = formatCode(session.code);
  const link = `${location.origin}/#join=${code}`;
  const invite = `Join our "${session.household}" household on ZenHousehold — helpers, leaves and our shared to-do list:\n${link}\nCode: ${code}`;

  const shareInvite = async () => {
    if (navigator.share) {
      try {
        return await navigator.share({ text: invite });
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    open(`https://wa.me/?text=${encodeURIComponent(invite)}`, '_blank', 'noopener');
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leave = async () => {
    const warning = pending ? `\n\n${pending} change(s) haven't reached the server yet and will be lost.` : '';
    if (confirm(`Remove "${session.household}" from this phone? Others keep the data and you can rejoin with the code.${warning}`)) {
      await leaveHousehold();
      location.hash = '';
    }
  };

  return (
    <>
      <header className="page-head">
        <h1>Settings</h1>
      </header>

      <div className="card">
        <h3>{session.household}</h3>
        <p className="muted small">Everyone with this code shares the same helpers and to-do list.</p>
        <div className="code">{code}</div>
        <div className="actions">
          <button className="btn primary" onClick={shareInvite}>
            Invite family
          </button>
          <button className="btn" onClick={copy}>
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Members</h3>
          <small className="muted">{members.length}</small>
        </div>
        {members.map((m) => (
          <div className="list-row static" key={m.id}>
            <span className="avatar">{m.name.slice(0, 1).toUpperCase()}</span>
            <span className="grow">
              <b>
                {m.name}
                {m.id === session.memberId && <span className="muted"> (you)</span>}
              </b>
              <small>Joined {shortDate(dateKey(new Date(m.joinedAt)))}</small>
            </span>
          </div>
        ))}
        {members.length <= 1 && <p className="muted small">Invite family with the code above — they’ll show up here once they join.</p>}
      </div>

      <HelperList adding={addingHelper} />

      <div className="card">
        <label className="field">
          <span>Your name (shown as “marked by”)</span>
          <input value={member} maxLength={30} onChange={(e) => setMember(e.target.value)} onBlur={() => member.trim() && renameMember(member.trim())} />
        </label>
      </div>

      <div className="card">
        <h3>Sync</h3>
        <p className="muted small">
          {status.state === 'syncing' && 'Syncing…'}
          {status.state === 'offline' && 'You’re offline. Changes are saved on this phone and sent when you’re back online.'}
          {status.state === 'error' && `Last sync failed: ${status.error}`}
          {status.state === 'idle' && (status.lastSynced ? `Up to date · ${new Date(status.lastSynced).toLocaleTimeString('en-IN', { timeStyle: 'short' })}` : 'Not synced yet')}
          {pending > 0 && ` · ${pending} change(s) waiting to send`}
        </p>
        <button className="btn" onClick={() => void syncNow()}>
          Sync now
        </button>
      </div>

      <button className="btn block ghost danger" onClick={leave}>
        Leave household on this phone
      </button>
    </>
  );
}
