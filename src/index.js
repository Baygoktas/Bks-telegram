import { handleOnThisDay } from './modules/onThisDay.js';
import { handleDYK } from './modules/dyk.js';
import { handleArt } from './modules/art.js';
import { handleNasa } from './modules/nasa.js';
import { handlePOTD } from './modules/potd.js';
import { handleQuotes } from './modules/quotes.js';
import { handleScienceRSS } from './modules/scienceRss.js';

export default {
  async scheduled(event, env, ctx) {
    // Türkiye saati hesaplama (UTC+3)
    const now = new Date();
    const trHour = (now.getUTCHours() + 3) % 24;

    switch (trHour) {
      case 9:
        await handleOnThisDay(env);
        break;
      case 10:
      case 12:
      case 14:
      case 16:
        await handleDYK(env);
        break;
      case 11:
        await handleArt(env);
        break;
      case 13:
        await handleNasa(env);
        break;
      case 15:
        await handlePOTD(env);
        break;
      case 17:
        await handleQuotes(env, 'kitap');
        break;
      case 18:
        await handleScienceRSS(env);
        break;
      case 19:
        await handleQuotes(env, 'filozof');
        break;
      default:
        console.log(`Saat ${trHour}:00 için tanımlı görev bulunamadı.`);
    }
  },

  // Manuel tarayıcı testi için uç nokta
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hourParam = url.searchParams.get('hour');

    if (hourParam) {
      const fakeHour = parseInt(hourParam, 10);
      switch (fakeHour) {
        case 9: await handleOnThisDay(env); break;
        case 10: case 12: case 14: case 16: await handleDYK(env); break;
        case 11: await handleArt(env); break;
        case 13: await handleNasa(env); break;
        case 15: await handlePOTD(env); break;
        case 17: await handleQuotes(env, 'kitap'); break;
        case 18: await handleScienceRSS(env); break;
        case 19: await handleQuotes(env, 'filozof'); break;
        default: return new Response('Geçersiz saat parametresi', { status: 400 });
      }
      return new Response(`Saat ${fakeHour}:00 görevi başarıyla tetiklendi.`);
    }

    return new Response('Bot çalışıyor. Test etmek için ?hour=9 şeklinde parametre verin.');
  }
};
