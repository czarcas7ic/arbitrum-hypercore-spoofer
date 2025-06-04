// -----------------------------------------------------------------------------
// Arbitrum “chain-ID spoofer” + balance-zeroer
//   • eth_chainId      → 0x539  (hex of 1337)
//   • net_version      → 1337   (decimal)
//   • eth_getBalance   → 0x0    (no native balance)
//   • everything else  → proxied to real Arbitrum One
// -----------------------------------------------------------------------------

// Default upstream (override with an account-level VAR or wrangler.toml/jsonc)
const UPSTREAM = globalThis.UPSTREAM_URL || 'https://arb1.arbitrum.io/rpc';

export default {
  /**
   * Cloudflare Workers “fetch” handler
   * @param {Request} req
   * @returns {Promise<Response>}
   */
  async fetch(req) {
    // Parse the incoming JSON-RPC payload
    const body = await req.json();
    const { id, method } = body;

    // ───────────────────────────────────────────────────────────────────────────
    // 1. Spoof chain-ID methods
    // ───────────────────────────────────────────────────────────────────────────
    if (method === 'eth_chainId' || method === 'net_version') {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: method === 'net_version' ? '1337' : '0x539',
      });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // 1-bis. Always report zero native balance
    // ───────────────────────────────────────────────────────────────────────────
    if (method === 'eth_getBalance') {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: '0x0',        // canonical zero in hex
      });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // 2. Pass-through everything else to the real Arbitrum endpoint
    // ───────────────────────────────────────────────────────────────────────────
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    });

    // Stream the upstream response back to the caller
    return new Response(upstream.body, upstream);
  },
};
