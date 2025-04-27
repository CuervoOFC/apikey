const { fetch } = require("undici");
async function bytesToMb(bytes) {
  const mb = bytes / (1024 * 1024);
  return mb.toFixed(2);
}

async function getInfo(link) {
    try {
        const url = `https://terabox.hnn.workers.dev/api/get-info?shorturl=${link.split("/").pop()}&pwd=`;
        const headers = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
            Referer: "https://terabox.hnn.workers.dev/",
        };
        const respuesta = await fetch(url, { headers });
        if (!respuesta.ok) {
            throw new Error(`Error al obtener información del archivo: ${respuesta.status} ${respuesta.statusText}`);
        }
        return await respuesta.json();
    } catch (error) {
        console.error("Error al obtener información del archivo:", error);
        throw error;
    }
}

async function getLinks(fsId, shareid, uk, sign, timestamp) {
    try {
        const url = "https://terabox.hnn.workers.dev/api/get-download";
        const headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
            Referer: "https://terabox.hnn.workers.dev/",
        };
        const datos = {
            shareid,
            uk,
            sign,
            timestamp,
            fs_id: fsId,
        };
        const respuesta = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(datos),
        });
        if (!respuesta.ok) {
            throw new Error(`Error al obtener el enlace de descarga: ${respuesta.status} ${respuesta.statusText}`);
        }
        return await respuesta.json();
    } catch (error) {
        console.error("Error al obtener el enlace de descarga:", error);
        throw error;
    }
}

async function teraboxdl(url) {
    try {
        const { list, shareid, uk, sign, timestamp } = await getInfo(url);
        if (!list) {
            throw new Error("Archivo no encontrado");
        }
        let resultados = {
           status: true,
           creator: "CuervoOFC",
           data: []
            }
        for (let i = 0; i < list.length; i++) {
            const fsId = list[i].fs_id;
            const { downloadLink } = await getLinks(fsId, shareid, uk, sign, timestamp);
            resultados.data.push({
                filename: list[i].filename,
                size: await bytesToMb(list[i].size) + ' MB',
                dl: downloadLink,
            });
        }
        return resultados;
    } catch (error) {
        console.error("Error al descargar el archivo:", error);
        throw error;
    }
}

module.exports = { teraboxdl };