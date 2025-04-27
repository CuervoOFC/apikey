const axios = require('axios');
const cheerio = require('cheerio');

const soundcs = async (query) => {
  if (!query) {
    return '👤 Ingresa una consulta de búsqueda';
  }
  try {
    const url = `https://m.soundcloud.com/search?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    let resultados = [];
    $('.List_VerticalList__2uQYU li').each((_, element) => {
      const titulo = $(element).find('.Cell_CellLink__3yLVS').attr('aria-label');
      const urlMusica = 'https://m.soundcloud.com' + $(element).find('.Cell_CellLink__3yLVS').attr('href');
      if (titulo && urlMusica) resultados.push({ titulo, url: urlMusica });
    });
    return resultados.slice(0, 5);
  } catch {
    return [];
  }
};

module.exports = { soundcs };