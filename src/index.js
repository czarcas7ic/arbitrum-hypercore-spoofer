// -----------------------------------------------------------------------------
// Arbitrum “chain-ID spoofer” + balance-zeroer  (env-configurable)
//
//   • CHAIN_ID env var (decimal "1" or hex "0x1")
//         └─ eth_chainId  → 0x<hex>
//         └─ net_version  → <decimal>
//   • eth_getBalance      → 0x0      (always zero)
//   • all other methods   → proxied to real Arbitrum One
// -----------------------------------------------------------------------------

// Read env vars that Wrangler/Cloudflare injects as global bindings
const UPSTREAM_RAW = globalThis.UPSTREAM_URL || 'https://arb1.arbitrum.io/rpc';
const CHAIN_RAW    = globalThis.CHAIN_ID    || '1337';   // default 1337 if unset

// Normalise CHAIN_ID into both forms -------------------------------
let CHAIN_DEC;   // "1"
let CHAIN_HEX;   // "0x1"

if (/^0x/i.test(CHAIN_RAW)) {
  // User supplied hex
  CHAIN_HEX = '0x' + CHAIN_RAW.slice(2).toLowerCase();
  CHAIN_DEC = String(parseInt(CHAIN_RAW, 16));
} else {
  // User supplied decimal
  CHAIN_DEC = String(parseInt(CHAIN_RAW, 10));
  CHAIN_HEX = '0x' + BigInt(CHAIN_DEC).toString(16);
}

export default {
  async fetch(req) {
    const body = await req.json();
    const { id, method } = body;

    // ────────────────────────────────────────────────
    // Spoof chain ID family
    // ────────────────────────────────────────────────
    if (method === 'eth_chainId' || method === 'net_version') {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: method === 'net_version' ? CHAIN_DEC : CHAIN_HEX,
      });
    }

    // ────────────────────────────────────────────────
    // Always zero native balance
    // ────────────────────────────────────────────────
    if (method === 'eth_getBalance') {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: '0x0',
      });
    }

    // ────────────────────────────────────────────────
    // Pass-through for everything else
    // ────────────────────────────────────────────────
    const upstream = await fetch(UPSTREAM_RAW, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    });

    return new Response(upstream.body, upstream);
  },
};
