import assert from 'node:assert/strict';
import test from 'node:test';
import { ARBITRUM, createReadOnlyRpc, formatUsdc, observeUsdc } from '../src/arbitrum-usdc.mjs';

// All fixtures are invented, including the address and block hash.
const WALLET = `0x${'12'.repeat(20)}`;
const HASH = `0x${'ab'.repeat(32)}`;
const SECOND = 1700000000;
const NOW = () => SECOND * 1000;
const word = (value) => `0x${BigInt(value).toString(16).padStart(64, '0')}`;

function fixture(overrides = {}) {
  const calls = [];
  const rpc = async (method, params) => {
    calls.push({ method, params });
    if (method === 'eth_chainId') return overrides.chainId ?? '0xa4b1';
    if (method === 'eth_getBlockByNumber') return {
      hash: HASH, number: '0x42', timestamp: `0x${SECOND.toString(16)}`, ...overrides.block,
    };
    if (method === 'eth_call') {
      return params[0].data === '0x313ce567'
        ? (overrides.decimals ?? word(6)) : (overrides.balance ?? word(15000000));
    }
    throw new Error('UNEXPECTED_METHOD');
  };
  return { rpc, calls };
}

test('reads 15 USDC without floating-point conversion', async () => {
  const { rpc } = fixture();
  const result = await observeUsdc({ rpc, wallet: WALLET, now: NOW });
  assert.equal(result.balanceUnits, '15000000');
  assert.equal(result.balanceUsdc, '15.000000');
  assert.equal(result.token, ARBITRUM.usdc);
  assert.equal(result.chainId, 42161);
  assert.equal(result.blockNumber, '66');
});

test('uses only native USDC and the same canonical block for all token reads', async () => {
  const { rpc, calls } = fixture();
  await observeUsdc({ rpc, wallet: WALLET, now: NOW });
  const tokenCalls = calls.filter((call) => call.method === 'eth_call');
  assert.equal(tokenCalls.length, 2);
  for (const call of tokenCalls) {
    assert.equal(call.params[0].to, ARBITRUM.usdc);
    assert.deepEqual(call.params[1], { blockHash: HASH, requireCanonical: true });
  }
  assert.equal(tokenCalls[1].params[0].data, `0x70a08231${WALLET.slice(2).padStart(64, '0')}`);
});

test('metadata-only mode does not request any wallet balance', async () => {
  const { rpc, calls } = fixture();
  const result = await observeUsdc({ rpc, now: NOW });
  assert.equal('wallet' in result, false);
  assert.equal('balanceUsdc' in result, false);
  assert.equal(calls.length, 3);
});

test('a legitimate zero balance remains distinct from failure', async () => {
  const { rpc } = fixture({ balance: word(0) });
  assert.equal((await observeUsdc({ rpc, wallet: WALLET, now: NOW })).balanceUsdc, '0.000000');
});

test('formats six-decimal and large amounts exactly', () => {
  assert.equal(formatUsdc(1n), '0.000001');
  assert.equal(formatUsdc(7140000n), '7.140000');
  assert.equal(formatUsdc(9007199254740993123456n), '9007199254740993.123456');
  assert.throws(() => formatUsdc(-1n), /INVALID_TOKEN_UNITS/);
  assert.throws(() => formatUsdc(2n ** 256n), /INVALID_TOKEN_UNITS/);
});

test('rejects another chain before querying a token', async () => {
  const { rpc, calls } = fixture({ chainId: '0x2105' });
  await assert.rejects(observeUsdc({ rpc, wallet: WALLET, now: NOW }), /WRONG_CHAIN/);
  assert.equal(calls.length, 1);
});

test('rejects wrong decimals', async () => {
  const { rpc } = fixture({ decimals: word(18) });
  await assert.rejects(observeUsdc({ rpc, wallet: WALLET, now: NOW }), /TOKEN_DECIMALS_MISMATCH/);
});

test('rejects stale and future block timestamps', async () => {
  for (const delta of [-121, 31]) {
    const { rpc } = fixture({ block: { timestamp: `0x${(SECOND + delta).toString(16)}` } });
    await assert.rejects(observeUsdc({ rpc, now: NOW }), /STALE_OR_FUTURE_BLOCK/);
  }
});

test('rejects malformed block and quantities', async () => {
  for (const block of [{ hash: '0x' }, { hash: word(0) }, { number: '66' }, { timestamp: '0x00' }]) {
    const { rpc } = fixture({ block });
    await assert.rejects(observeUsdc({ rpc, now: NOW }), /INVALID_BLOCK|INVALID_RPC_QUANTITY/);
  }
});

test('rejects malformed token responses rather than assuming zero', async () => {
  for (const balance of ['0x', '0xf', '15', `0x${'a'.repeat(66)}`]) {
    const { rpc } = fixture({ balance });
    await assert.rejects(observeUsdc({ rpc, wallet: WALLET, now: NOW }), /INVALID_TOKEN_RESPONSE/);
  }
});

test('validates wallet syntax before contacting the provider', async () => {
  const { rpc, calls } = fixture();
  await assert.rejects(observeUsdc({ rpc, wallet: 'not-an-address', now: NOW }), /INVALID_WALLET_ADDRESS/);
  assert.equal(calls.length, 0);
});

test('propagates provider failure without a successful observation', async () => {
  await assert.rejects(observeUsdc({ rpc: async () => { throw new Error('UNAVAILABLE'); } }), /UNAVAILABLE/);
});

test('repeat reads of a fixed checkpoint are deterministic', async () => {
  const { rpc } = fixture();
  assert.deepEqual(await observeUsdc({ rpc, wallet: WALLET, now: NOW }),
    await observeUsdc({ rpc, wallet: WALLET, now: NOW }));
});

test('RPC wrapper blocks transaction submission and insecure transport', async () => {
  assert.throws(() => createReadOnlyRpc({ url: 'http://rpc.invalid' }), /HTTPS_RPC_REQUIRED/);
  assert.throws(() => createReadOnlyRpc({ timeoutMs: 0 }), /INVALID_RPC_TIMEOUT/);
  const rpc = createReadOnlyRpc({ fetchImpl: async () => { throw new Error('must not run'); } });
  await assert.rejects(rpc('eth_sendRawTransaction', []), /READ_ONLY_METHOD_REQUIRED/);
});

test('RPC wrapper validates response identity and hides provider details', async () => {
  for (const payload of [null, {}, { jsonrpc: '2.0', id: 99, result: '0xa4b1' },
    { jsonrpc: '2.0', id: 1, error: { message: 'private-provider-detail' } }]) {
    const rpc = createReadOnlyRpc({ fetchImpl: async () => ({ ok: true, json: async () => payload }) });
    await assert.rejects(rpc('eth_chainId', []), { message: 'RPC_UNAVAILABLE' });
  }
});

test('RPC wrapper reports HTTP failure, invalid JSON and timeouts safely', async () => {
  const responses = [async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => { throw new Error('invalid JSON'); } }),
    async () => { throw new Error('private-provider-detail'); }];
  for (const fetchImpl of responses) {
    await assert.rejects(createReadOnlyRpc({ fetchImpl })('eth_chainId', []), { message: 'RPC_UNAVAILABLE' });
  }
  const fetchImpl = async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  await assert.rejects(createReadOnlyRpc({ fetchImpl, timeoutMs: 5 })('eth_chainId', []), { message: 'RPC_TIMEOUT' });
});

test('RPC wrapper creates distinct request IDs and accepts valid results', async () => {
  const ids = [];
  const fetchImpl = async (_url, { body, redirect }) => {
    const request = JSON.parse(body);
    ids.push(request.id);
    assert.equal(redirect, 'error');
    return { ok: true, json: async () => ({ jsonrpc: '2.0', id: request.id, result: '0xa4b1' }) };
  };
  const rpc = createReadOnlyRpc({ fetchImpl });
  assert.equal(await rpc('eth_chainId', []), '0xa4b1');
  await rpc('eth_chainId', []);
  assert.deepEqual(ids, [1, 2]);
});
