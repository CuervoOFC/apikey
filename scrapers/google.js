const axios = require('axios');
const cheerio = require('cheerio');
async function google(query) {
    try {
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36"
            }
        });
        const html = response.data;
        const $ = cheerio.load(html);

        const results = [];
        $("div.tF2Cxc").each((index, element) => {
            const title = $(element).find("h3").text().trim();
            const link = $(element).find("a").attr("href");
            const description = $(element).find(".VwiC3b").text().trim();

            if (title && link) {
                results.push({ title, link, description });
            }
        });
let datas = {
status: true,
creator: "CuervoOFC",
result: results
}
        return datas;
    } catch (error) {
        console.error("Error al obtener los resultados de la búsqueda:", error.message);
        throw new Error("No se pudieron recuperar los datos de búsqueda.");
    }
}
module.exports = { google }