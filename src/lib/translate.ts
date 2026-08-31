export interface Env {
  DEEPL_API_KEY: string;
}

export async function translateToTurkish(text: string, apiKey: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      "Authorization": `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [text],
      target_lang: "TR",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`DeepL translate failed: ${res.status} ${errBody}`);
  }

  const data: any = await res.json();
  return data.translations?.[0]?.text ?? text;
}
