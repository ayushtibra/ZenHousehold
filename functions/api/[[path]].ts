// Pages Function for every /api/* request; Pages serves the built app (dist) itself.
interface Env {
  DB: D1Database;
}

/** Record kinds clients may sync. Add a kind here when a new household feature needs storage. */
const KINDS = new Set(['helper', 'entry', 'payment', 'member', 'task']);
// No 0/O/1/I so codes can be read out over the phone.
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_MUTATIONS = 200;
const MAX_RECORD_CHARS = 4000;
const PAGE_SIZE = 1000;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** 12 random chars from a 32-char alphabet: 60 bits, unguessable for a household join code. */
function newCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => CODE_CHARS[b & 31]).join('');
}

const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[^0-9A-Z]/g, '');

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new HttpError(400, 'Expected a JSON object body');
}

async function createHousehold(req: Request, env: Env): Promise<Response> {
  const body = await readJson(req);
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
  if (!name) throw new HttpError(400, 'Household name is required');
  const code = newCode();
  await env.DB.prepare('INSERT INTO households (code, name, rev, created_at) VALUES (?, ?, 0, ?)')
    .bind(code, name, new Date().toISOString())
    .run();
  return json({ code, name }, 201);
}

interface Mutation {
  kind: string;
  id: string;
  data: string;
}

function parseMutations(raw: unknown): Mutation[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > MAX_MUTATIONS) throw new HttpError(400, `mutations must be an array of at most ${MAX_MUTATIONS}`);
  return raw.map((m) => {
    const { kind, id, data } = (m ?? {}) as Record<string, unknown>;
    if (typeof kind !== 'string' || !KINDS.has(kind)) throw new HttpError(400, `Unknown record kind: ${String(kind)}`);
    if (typeof id !== 'string' || !id || id.length > 100) throw new HttpError(400, 'Invalid record id');
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Record data must be an object');
    const text = JSON.stringify(data);
    if (text.length > MAX_RECORD_CHARS) throw new HttpError(413, 'Record too large');
    return { kind, id, data: text };
  });
}

/**
 * Push local changes and pull everything newer than `cursor` in one round trip.
 * Writes and the read run in one D1 batch (a transaction), so a pull never sees a rev
 * without the rows below it — clients can safely resume from the returned cursor.
 */
async function sync(req: Request, env: Env): Promise<Response> {
  const code = normalizeCode(req.headers.get('x-household') ?? '');
  const body = await readJson(req);
  const cursor = typeof body.cursor === 'number' && Number.isSafeInteger(body.cursor) && body.cursor > 0 ? body.cursor : 0;
  const mutations = parseMutations(body.mutations);

  const household = code
    ? await env.DB.prepare('SELECT name FROM households WHERE code = ?').bind(code).first<{ name: string }>()
    : null;
  if (!household) throw new HttpError(404, 'Household not found');

  const statements: D1PreparedStatement[] = [];
  if (mutations.length) {
    statements.push(env.DB.prepare('UPDATE households SET rev = rev + ? WHERE code = ?').bind(mutations.length, code));
    mutations.forEach((m, i) =>
      statements.push(
        env.DB.prepare(
          `INSERT INTO records (household, kind, id, data, rev)
           VALUES (?1, ?2, ?3, ?4, (SELECT rev FROM households WHERE code = ?1) - ?5)
           ON CONFLICT (household, kind, id) DO UPDATE SET data = excluded.data, rev = excluded.rev`,
        ).bind(code, m.kind, m.id, m.data, mutations.length - 1 - i),
      ),
    );
  }
  statements.push(
    env.DB.prepare('SELECT kind, id, data, rev FROM records WHERE household = ? AND rev > ? ORDER BY rev LIMIT ?').bind(
      code,
      cursor,
      PAGE_SIZE + 1,
    ),
  );

  const results = await env.DB.batch<{ kind: string; id: string; data: string; rev: number }>(statements);
  const rows = results[results.length - 1].results;
  const page = rows.slice(0, PAGE_SIZE);
  return json({
    household: { name: household.name },
    cursor: page.length ? page[page.length - 1].rev : cursor,
    more: rows.length > PAGE_SIZE,
    records: page.map((r) => ({ kind: r.kind, id: r.id, data: JSON.parse(r.data) })),
  });
}

export const onRequest: PagesFunction<Env> = async ({ request: req, env }) => {
  const { pathname } = new URL(req.url);
  try {
    if (req.method === 'POST' && pathname === '/api/households') return await createHousehold(req, env);
    if (req.method === 'POST' && pathname === '/api/sync') return await sync(req, env);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'Something went wrong' }, 500);
  }
};
