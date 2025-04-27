const axios = require("axios");

async function ttks(query) {
  try {
    const response = await axios.post("https://tikwm.com/api/feed/search", new URLSearchParams({
      keywords: query,
      count: 10,
      cursor: 0,
      HD: 1
    }), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Cookie": "current_language=en",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
      }
    });

    const videos = response.data?.data?.videos || [];
    if (videos.length === 0) throw new Error("No se encontraron videos.");

    const videorndm = videos[Math.floor(Math.random() * videos.length)];

    return {
      status: true,
      creator: "CuervoOFC",
      data: {
        title: videorndm.title,
        cover: videorndm.cover,
        origin_cover: videorndm.origin_cover,
        no_wm: videorndm.play,
        watermark: videorndm.wmplay,
        music: videorndm.music
      }
    };

  } catch (error) {
    throw error;
  }
}

module.exports = { ttks };