// API tests: starts the real backend with fake keys (no real services are called)
// and checks security boundaries from the outside.
// Run with: node --test "tests/*.test.js"

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 5099;
const BASE = `http://127.0.0.1:${PORT}`;
let server;

before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(PORT),
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      HUBSPOT_ACCESS_TOKEN: 'test-hubspot-token',
      GROQ_API_KEY: 'test-groq-key',
      FRONTEND_URL: 'https://allowed-site.example',
    },
    stdio: 'pipe',
  });

  // Wait until the server prints that it is running
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start within 15 seconds')), 15000);
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Server running')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Server exited early with code ${code}`));
    });
  });
});

after(() => {
  if (server) server.kill();
});

function post(url, body, headers = {}) {
  return fetch(BASE + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// ---------- Basic health and error handling ----------

test('health check responds', async () => {
  const res = await fetch(BASE + '/');
  assert.strictEqual(res.status, 200);
  assert.match(await res.text(), /running/);
});

test('unknown routes return a clean 404', async () => {
  const res = await fetch(BASE + '/api/does-not-exist');
  assert.strictEqual(res.status, 404);
  assert.deepStrictEqual(await res.json(), { error: 'Not found.' });
});

test('broken JSON returns 400 without crashing', async () => {
  const res = await post('/api/chatbot/message', '{this is not json');
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(await res.json(), { error: 'Invalid request body.' });
});

test('oversized requests are rejected (413)', async () => {
  const res = await post('/api/chatbot/message', { message: 'x'.repeat(200 * 1024) });
  assert.strictEqual(res.status, 413);
});

test('server is still alive after bad requests', async () => {
  const res = await fetch(BASE + '/');
  assert.strictEqual(res.status, 200);
});

// ---------- Security headers ----------

test('security headers are set and framework is hidden', async () => {
  const res = await fetch(BASE + '/');
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
  assert.ok(res.headers.get('strict-transport-security'));
  assert.strictEqual(res.headers.get('x-powered-by'), null);
});

// ---------- CORS ----------

test('CORS allows the portal site', async () => {
  const res = await fetch(BASE + '/', { headers: { Origin: 'https://allowed-site.example' } });
  assert.strictEqual(res.headers.get('access-control-allow-origin'), 'https://allowed-site.example');
});

test('CORS does not allow other websites', async () => {
  const res = await fetch(BASE + '/', { headers: { Origin: 'https://evil-site.example' } });
  assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
});

// ---------- Authentication on protected routes ----------

test('deal stage route rejects requests without login', async () => {
  const res = await post('/api/application/hubspot-stage', { applicationId: 'abc', stage: 'Submitted' });
  assert.strictEqual(res.status, 401);
});

test('decision status route rejects requests without login', async () => {
  const res = await fetch(BASE + '/api/application/hubspot-status');
  assert.strictEqual(res.status, 401);
});

test('HubSpot contact route rejects a wrong token format', async () => {
  const res = await post('/api/auth/hubspot-contact', {}, { Authorization: 'Basic abc123' });
  assert.strictEqual(res.status, 401);
});

test('profile route rejects requests without login', async () => {
  const res = await fetch(BASE + '/api/auth/profile');
  assert.strictEqual(res.status, 401);
});

// ---------- Regression: old insecure routes stay removed ----------

test('old unprotected profile-creation route is gone', async () => {
  const res = await post('/api/auth/profile', { user_id: 'someone', first_name: 'A', last_name: 'B', email: 'a@b.c' });
  assert.strictEqual(res.status, 404);
});

test('old unprotected HubSpot sync route is gone', async () => {
  const res = await post('/api/application/sync-hubspot', { email: 'a@b.c' });
  assert.strictEqual(res.status, 404);
});

// ---------- Chatbot input checks (no AI call is made) ----------

test('chatbot rejects an empty message', async () => {
  const res = await post('/api/chatbot/message', { message: '' });
  assert.strictEqual(res.status, 400);
});

test('chatbot rejects a message over 500 characters', async () => {
  const res = await post('/api/chatbot/message', { message: 'a'.repeat(501) });
  assert.strictEqual(res.status, 400);
});