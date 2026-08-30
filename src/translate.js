export async function translateToTurkish(text) {
  if (!text || typeof text !== 'string' || text.trim() === '') return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=tr&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) return text;

    const data = await response.json();
    if (data && data[0]) {
      return data[0].map(item => item[0]).join('');
    }
    return text;
  } catch (error) {
    console.error('Translation Error:', error);
    return text;
  }
}
