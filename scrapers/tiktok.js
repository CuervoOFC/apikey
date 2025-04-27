const axios = require("axios")

async function tiktok(url, type = '') {
  const result = {
    type: '',
    dl: {}
  }
  try {
    if (!url.includes('tiktok')) throw '¡No se ha introducido ningún enlace de Tiktok válido!'

    const apiUrl = `https://tikwm.com/api/?url=${url}${type === 'hd' ? '&count=12&cursor=0&web=1&hd=1' : ''}`
    const { data } = await axios.post(apiUrl, { timeout: 50000 })
    const res = data.data

    let info = {
      title: res.title || '',
      id: res.id || '',
      region: res.region || '',
      duration: res.duration || '',
      author: res.author?.nickname || res.author || 'Desconocido'
    }

    if (res.images && Array.isArray(res.images)) {
      result.type = 'image'
      result.dl = res.images
    } else {
      result.type = 'video'
      result.dl = {
        url: type === 'hd' ?  res.hdplay : res.play
      }
    }
    const datas = {
    status: true,
    creator: "CuervoOFC",
    data: info,
    dl:  result.dl,
    type: result.type
    }
    return datas
  } catch (e) {
    return { msg: typeof e === 'string' ? e : 'No se pudo obtener información del link : ' + e }
  }
}
module.exports = { tiktok }