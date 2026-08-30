import { handleOnThisDay } from './modules/onThisDay.js';
import { handleDYK } from './modules/dyk.js';
import { handleArt } from './modules/art.js';
import { handleNasa } from './modules/nasa.js';
import { handlePOTD } from './modules/potd.js';
import { handleQuotes } from './modules/quotes.js';
import { handleScienceRSS } from './modules/scienceRss.js';

export default {
  async scheduled(event, env, ctx) {
    const now = new Date();
    const trHour = (now.getUTCHours() + 3) % 24;

    switch (trHour) {
      case 9: await handleOnThisDay(env); break;
      case 10: case 12: case 14: case 16: await handleDYK(env); break;
      case 11: await handleArt(env); break;
      case 13: await handleNasa(env); break;
      case 15: await handlePOTD(env); break;
      case 17: await handleQuotes(env, 'kitap'); break;
      case 18: await handleScienceRSS(env); break;
      case 19: await handleQuotes(env, 'filozof'); break;
    }
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hourParam = url.searchParams.get('hour');

    if (hourParam) {
      const fakeHour = parseInt(hourParam, 10);
      let result = null;

      switch (fakeHour) {
        case 9: result = await handleOnThisDay(env); break;
        case 10: case 12: case 14: case 16: result = await handleDYK(env); break;
        case 11: result = await handleArt(env); break;
        case 13: result = await handleNasa(env); break;
        case 15: result = await handlePOTD(env); break;
        case 17: result = await handleQuotes(env, 'kitap'); break;
        case 18: result = await handleScienceRSS(env); break;
        case 19: result = await handleQuotes(env, 'filozof'); break;
        default: return new Response('Geçersiz saat parametresi', { status: 400 });
      }

      return new Response(JSON.stringify({ status: 'ok', hour: fakeHour, data: result }, null, 2), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    return new Response('Bot aktif. Test için ?hour=9 parametresini kullanın.');
  }
};
