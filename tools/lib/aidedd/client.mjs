const USER_AGENT = "5e-dnd-aidedd-import/1.0 (+https://github.com/defaii/5e-dnd)";

export async function fetchAideDD(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "fr-FR,fr;q=0.9",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} pour ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buffer);
}

export async function fetchBatch(urls, delayMs = 500) {
  const results = new Map();
  for (const url of urls) {
    results.set(url, await fetchAideDD(url));
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
  return results;
}
