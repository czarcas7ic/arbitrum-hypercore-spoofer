export default {
  async fetch(req) {
    const body = await req.json();
    const { id, method } = body;

    // 1. Spoof ID
    if (method === 'eth_chainId' || method === 'net_version') {
      return Response.json({
        jsonrpc: '2.0',
        id,
        result: method === 'net_version' ? '1337' : '0x539',
      });
    }

    // 2. Pass-through everything else
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' }
    });
    return new Response(upstream.body, upstream);
  }
}

// Default upstream (can be overridden with a VAR)
const UPSTREAM = globalThis.UPSTREAM_URL || 'https://arb1.arbitrum.io/rpc';
