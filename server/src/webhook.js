/** Optionally mirrors an event into another internal system (CRM, sheet, etc.). Resolves false when none is configured. */
async function postWebhook(payload) {
  const url = process.env.INTERNAL_WEBHOOK_URL;
  if (!url) return false;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(process.env.INTERNAL_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.INTERNAL_WEBHOOK_TOKEN}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`webhook responded ${res.status}`);
  return true;
}

module.exports = { postWebhook };
