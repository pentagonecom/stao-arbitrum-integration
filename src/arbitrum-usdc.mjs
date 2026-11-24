// Public review example. No production underwriting or transaction signing.
export const ARBITRUM = Object.freeze({
  chainId: 42161,
  rpcUrl: 'https://arb1.arbitrum.io/rpc',
  usdc: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  decimals: 6,
});

const METHODS = new Set(['eth_chainId', 'eth_getBlockByNumber', 'eth_call']);
const UINT256 = /^0x[0-9a-fA-F]{64}$/;
const QUANTITY = /^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/;

export function createReadOnlyRpc({
  url = ARBITRUM.rpcUrl,
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
} = {}) {
  let endpoint;
  try { endpoint = new URL(url); } catch { throw new Error('INVALID_RPC_URL'); }
  if (endpoint.protocol !== 'https:') throw new Error('HTTPS_RPC_REQUIRED');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) {
    throw new Error('INVALID_RPC_TIMEOUT');
  }
  let nextId = 0;
  return async (method, params) => {
    if (!METHODS.has(method)) throw new Error('READ_ONLY_METHOD_REQUIRED');
    const id = ++nextId;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(endpoint.href, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
        signal: controller.signal,
        redirect: 'error',
      });
      if (!response.ok) throw new Error();
      const payload = await response.json();
      if (payload?.jsonrpc !== '2.0' || payload.id !== id || payload.error != null ||
          payload.result == null) throw new Error();
      return payload.result;
    } catch {
      // Do not expose a credential-bearing URL or upstream response in an error.
      throw new Error(controller.signal.aborted ? 'RPC_TIMEOUT' : 'RPC_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
    }
  };
}

function quantity(value) {
  if (typeof value !== 'string' || !QUANTITY.test(value)) throw new Error('INVALID_RPC_QUANTITY');
  return BigInt(value);
}

function uint256(value) {
  if (typeof value !== 'string' || !UINT256.test(value)) throw new Error('INVALID_TOKEN_RESPONSE');
  return BigInt(value);
}

export function formatUsdc(units) {
  if (typeof units !== 'bigint' || units < 0n || units >= 2n ** 256n) {
    throw new Error('INVALID_TOKEN_UNITS');
  }
  return `${units / 1000000n}.${(units % 1000000n).toString().padStart(6, '0')}`;
}

export async function observeUsdc({ rpc = createReadOnlyRpc(), wallet, now = Date.now } = {}) {
  if (wallet !== undefined && (typeof wallet !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(wallet))) {
    throw new Error('INVALID_WALLET_ADDRESS');
  }
  if (quantity(await rpc('eth_chainId', [])) !== BigInt(ARBITRUM.chainId)) {
    throw new Error('WRONG_CHAIN');
  }
  const block = await rpc('eth_getBlockByNumber', ['latest', false]);
  if (!block || typeof block.hash !== 'string' || !UINT256.test(block.hash) ||
      BigInt(block.hash) === 0n) throw new Error('INVALID_BLOCK');
  const blockNumber = quantity(block.number);
  const timestamp = quantity(block.timestamp);
  const nowMs = now();
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error('INVALID_CLOCK');
  const currentSecond = BigInt(Math.floor(nowMs / 1000));
  // Reference-only limits, not the private STAO underwriting policy.
  if (timestamp > currentSecond + 30n || timestamp < currentSecond - 120n) {
    throw new Error('STALE_OR_FUTURE_BLOCK');
  }
  const checkpoint = { blockHash: block.hash, requireCanonical: true };
  const readToken = (data) => rpc('eth_call', [{ to: ARBITRUM.usdc, data }, checkpoint]);
  if (uint256(await readToken('0x313ce567')) !== BigInt(ARBITRUM.decimals)) {
    throw new Error('TOKEN_DECIMALS_MISMATCH');
  }
  const observation = {
    chainId: ARBITRUM.chainId,
    token: ARBITRUM.usdc,
    decimals: ARBITRUM.decimals,
    blockNumber: blockNumber.toString(),
    blockHash: block.hash,
    blockTimestamp: new Date(Number(timestamp) * 1000).toISOString(),
    observationType: 'READ_ONLY_RPC',
  };
  if (wallet !== undefined) {
    const data = `0x70a08231${wallet.slice(2).toLowerCase().padStart(64, '0')}`;
    const units = uint256(await readToken(data));
    observation.wallet = wallet.toLowerCase();
    observation.balanceUnits = units.toString();
    observation.balanceUsdc = formatUsdc(units);
  }
  return observation;
}
