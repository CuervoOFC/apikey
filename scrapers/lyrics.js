const fetch = require("node-fetch");
const Lyrics = require("song-lyrics-api");
const lyric = require("@green-code/music-track-data");
const lyrics = new Lyrics();
function format(rawLyrics) {
  return rawLyrics
    .replace(/\r\n|\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .join('\n')
}
async function Lyric(text) {
    try {
        let info = await lyric.getTracks(text);
        if (!info || info.length === 0) return null;

        let { title, artist, preview } = info[0];
        let ly = await lyrics.getLyrics(`${title} ${artist}`);
        if (!ly || ly.length === 0 || !ly[0].lyrics?.lyrics) return null;
const forml = await format(ly[0].lyrics.lyrics)
        return {
               status: true,
               creator: "CuervoOFC",
               info: info[0],
               lyrics: forml
        };
    } catch (error) {
        console.error("Error obteniendo la letra:", error);
        return error;
    }
}
module.exports = { Lyric }