import { createReadOnlyRpc, observeUsdc } from '../src/arbitrum-usdc.mjs';

try {
  if (process.argv.length > 3) throw new Error('USAGE: node examples/inspect.mjs [PUBLIC_EVM_ADDRESS]');
  const rpc = createReadOnlyRpc({ url: process.env.ARBITRUM_RPC_URL });
  const observation = await observeUsdc({ rpc, wallet: process.argv[2] });
  console.log(JSON.stringify(observation, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
