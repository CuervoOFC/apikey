const cheerio = require("cheerio");
const { fetch } = require("undici");
const { lookup } = require("mime-types");

async function mediafire(url) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al acceder a la URL');

            const html = await response.text();
            const $ = cheerio.load(html);

            const typeClass = $(".dl-btn-cont").find(".icon").attr("class");
            const type = typeClass ? typeClass.split("archive")[1]?.trim() : 'desconocido';

            const filename = $(".dl-btn-label").attr("title") || 'archivo desconocido';

            const sizeMatch = $('.download_link .input').text().trim().match(/\((.*?)\)/);
            const size = sizeMatch ? sizeMatch[1] : 'desconocido';

            const ext = filename.split(".").pop();
            const mimetype = lookup(ext.toLowerCase()) || "application/" + ext.toLowerCase();

            const download = $(".input").attr("href");
            if (!download) throw new Error('No se pudo encontrar el enlace de descarga');

            resolve({
                filename,
                type,
                size,
                ext,
                mimetype,
                download,
            });
        } catch (error) {
            reject({
                msg: "Error al obtener datos del enlace: " + error.message,
            });
        }
    });
}

module.exports =  { mediafire };