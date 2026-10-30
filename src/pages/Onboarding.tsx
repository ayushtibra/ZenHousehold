import { useState, type FormEvent } from 'react';
import { createHousehold, joinHousehold } from '../sync';
import { joinCodeFromHash } from '../nav';

export default function Onboarding() {
  const invited = joinCodeFromHash();
  const [mode, setMode] = useState<'join' | 'create'>(invited ? 'join' : 'create');
  const [household, setHousehold] = useState('');
  const [code, setCode] = useState(invited ?? '');
  const [member, setMember] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'create') await createHousehold(household.trim(), member.trim());
      else await joinHousehold(code, member.trim());
      history.replaceState(null, '', location.pathname);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const ready = member.trim() !== '' && (mode === 'create' ? household.trim() !== '' : code.replace(/[^0-9a-z]/gi, '').length === 12);

  return (
    <div className="app onboarding">
      <div className="brand">
        <img src="/icon.svg" alt="" width={64} height={64} />
        <h1>ZenHousehold</h1>
        <p className="muted">Your home's helpers and to-dos, shared with your family — leaves, half days, pay, bills and chores.</p>
      </div>

      <div className="chips segmented">
        <button className={`chip ${mode === 'create' ? 'on present' : ''}`} onClick={() => setMode('create')}>
          Start a household
        </button>
        <button className={`chip ${mode === 'join' ? 'on present' : ''}`} onClick={() => setMode('join')}>
          Join with a code
        </button>
      </div>

      <form className="card" onSubmit={submit}>
        {mode === 'create' ? (
          <label className="field">
            <span>Household name</span>
            <input value={household} onChange={(e) => setHousehold(e.target.value)} placeholder="e.g. Tibra home" maxLength={60} />
          </label>
        ) : (
          <label className="field">
            <span>Join code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD-EFGH-JKLM"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
            <small className="muted">Ask whoever set it up to share it from Settings.</small>
          </label>
        )}
        <label className="field">
          <span>Your name</span>
          <input value={member} onChange={(e) => setMember(e.target.value)} placeholder="Shown when you mark a day" maxLength={30} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={!ready || busy}>
          {busy ? 'Please wait…' : mode === 'create' ? 'Create household' : 'Join household'}
        </button>
      </form>
    </div>
  );
}
