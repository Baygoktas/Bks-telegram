const USER_AGENT = "BKS-TelegramBot/1.0 (bilim kultur sanat telegram kanali)";

export async function wikiFetch(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Wikimedia fetch failed: ${res.status} ${url}`);
  }
  return res.json();
}

export async function wikiFetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(`Wikimedia fetch failed: ${res.status} ${url}`);
  }
  return res.text();
}
