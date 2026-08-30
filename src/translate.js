export async function translateToTurkish(text) {
  if (!text || text.trim() === '') return text;
  
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=tr&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CloudflareWorkerTranslator/1.0)'
      }
    });

    if (!response.ok) return text;
    
    const result = await response.json();
    if (result && result[0]) {
      return result[0].map(segment => segment[0]).join('');
    }
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}
