const fs = require('fs');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const path = require('path');

const axios = require('axios')
const FormData = require('form-data')
const WebSocket = require('ws')
const cheerio = require('cheerio')

async function save(url, ext) {
  return new Promise((resolve, reject) => {
    const randomName = "cuervo-" + crypto.randomBytes(100).toString('hex');
    const filePath = `./downloads/${randomName}.${ext}`;
    const file = fs.createWriteStream(filePath);
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();

        setTimeout(() => {
          fs.unlink(filePath, () => {});
        }, 5 * 60 * 1000);

        resolve({ file: filePath, key: randomName });
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => reject(err));
    });
  });
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  bytes = Number(bytes);
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

async function ytmp4(url) {
let quality = 360
  const base_url = 'https://amp4.cc'
  const headers = { Accept: 'application/json', 'User-Agent': 'Postify/1.0.0' }
  const cookies = {}

  const parse_cookies = (set_cookie_headers) => {
    if (set_cookie_headers) {
      set_cookie_headers.forEach((cookie) => {
        const [key_value] = cookie.split(';')
        const [key, value] = key_value.split('=')
        cookies[key] = value
      })
    }
  }

  const get_cookie_string = () =>
    Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ')

  const client_get = async (url) => {
    const res = await axios.get(url, {
      headers: { ...headers, Cookie: get_cookie_string() }
    })
    parse_cookies(res.headers['set-cookie'])
    return res
  }

  const client_post = async (url, data, custom_headers = {}) => {
    const res = await axios.post(url, data, {
      headers: { ...headers, Cookie: get_cookie_string(), ...custom_headers }
    })
    parse_cookies(res.headers['set-cookie'])
    return res
  }

  const yt_regex = /^((?:https?:)?\/\/)?((?:www|m|music)\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(?:embed\/)?(?:v\/)?(?:shorts\/)?([a-zA-Z0-9_-]{11})/

  const hash_challenge = async (salt, number, algorithm) =>
    crypto.createHash(algorithm.toLowerCase()).update(salt + number).digest('hex')

  const verify_challenge = async (challenge_data, salt, algorithm, max_number) => {
    for (let i = 0; i <= max_number; i++) {
      if (await hash_challenge(salt, i, algorithm) === challenge_data) {
        return { number: i, took: Date.now() }
      }
    }
    throw new Error('Captcha verification failed')
  }

  const solve_captcha = async (challenge) => {
    const { algorithm, challenge: challenge_data, salt, maxnumber, signature } = challenge
    const solution = await verify_challenge(challenge_data, salt, algorithm, maxnumber)
    return Buffer.from(
      JSON.stringify({
        algorithm,
        challenge: challenge_data,
        number: solution.number,
        salt,
        signature,
        took: solution.took
      })
    ).toString('base64')
  }

  const connect_ws = async (id) => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`wss://amp4.cc/ws`, ['json'], {
        headers: { ...headers, Origin: `https://amp4.cc` },
        rejectUnauthorized: false
      })

      let file_info = {}
      let timeout_id = setTimeout(() => {
        ws.close()
      }, 30000)

      ws.on('open', () => ws.send(id))
      ws.on('message', (data) => {
        const res = JSON.parse(data)
        if (res.event === 'query' || res.event === 'queue') {
          file_info = {
            thumbnail: res.thumbnail,
            title: res.title,
            duration: res.duration,
            uploader: res.uploader
          }
        } else if (res.event === 'file' && res.done) {
          clearTimeout(timeout_id)
          ws.close()
          resolve({ ...file_info, ...res })
        }
      })
      ws.on('error', () => clearTimeout(timeout_id))
    })
  }

  try {
    const link_match = url.match(yt_regex)
    if (!link_match) throw new Error('Invalid YouTube URL')
    const fixed_url = `https://youtu.be/${link_match[3]}`
    const page_data = await client_get(`${base_url}/`)
    const $ = cheerio.load(page_data.data)
    const csrf_token = $('meta[name="csrf-token"]').attr('content')

    if (!isNaN(quality)) quality = `${quality}p`

    const form = new FormData()
    form.append('url', fixed_url)
    form.append('format', 'mp4')
    form.append('quality', quality)
    form.append('service', 'youtube')
    form.append('_token', csrf_token)

    const captcha_data = await client_get(`${base_url}/captcha`)
    if (captcha_data.data) {
      const solved_captcha = await solve_captcha(captcha_data.data)
      form.append('altcha', solved_captcha)
    }

    const res = await client_post(`${base_url}/convertVideo`, form, form.getHeaders())
    const ws = await connect_ws(res.data.message)
    const dlink = `${base_url}/dl/${ws.worker}/${res.data.message}/${encodeURIComponent(ws.file)}`
//const file = await save(dlink, "mp4");
    return {
      title: ws.title || '-',
      uploader: ws.uploader,
      duration: ws.duration,
      quality,
      type: 'video',
      format: 'mp4',
      thumbnail: ws.thumbnail || `https://i.ytimg.com/vi/${link_match[3]}/maxresdefault.jpg`,
      download: dlink //`${global.host}/dl?key=${file.key}`
    }
  } catch (err) {
    throw Error(err.message)
  }
}
async function ytmp3(link) {
let format = "mp3"
  const apiBase = "https://media.savetube.me/api";
  const apiCDN = "/random-cdn";
  const apiInfo = "/v2/info";
  const apiDownload = "/download";

  const decryptData = async (enc) => {
    try {
      const key = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12', 'hex');
      const data = Buffer.from(enc, 'base64');
      const iv = data.slice(0, 16);
      const content = data.slice(16);
      
      const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
      let decrypted = decipher.update(content);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return JSON.parse(decrypted.toString());
    } catch (error) {
      return null;
    }
  };

  const request = async (endpoint, data = {}, method = 'post') => {
    try {
      const { data: response } = await axios({
        method,
        url: `${endpoint.startsWith('http') ? '' : apiBase}${endpoint}`,
        data: method === 'post' ? data : undefined,
        params: method === 'get' ? data : undefined,
        headers: {
          'accept': '*/*',
          'content-type': 'application/json',
          'origin': 'https://yt.savetube.me',
          'referer': 'https://yt.savetube.me/',
          'user-agent': 'Postify/1.0.0'
        }
      });
      return { status: true, data: response };
    } catch (error) {
      return { status: false, error: error.message };
    }
  };

  const youtubeID = link.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  if (!youtubeID) return { status: false, error: "Gagal mengekstrak ID video dari URL." };

  const qualityOptions = ['1080', '720', '480', '360', '240']; 
  try {
    const cdnRes = await request(apiCDN, {}, 'get');
    if (!cdnRes.status) return cdnRes;
    const cdn = cdnRes.data.cdn;

    const infoRes = await request(`https://${cdn}${apiInfo}`, { url: `https://www.youtube.com/watch?v=${youtubeID[1]}` });
    if (!infoRes.status) return infoRes;
    
    const decrypted = await decryptData(infoRes.data.data);
    if (!decrypted) return { status: false, error: "Gagal mendekripsi data video." };

    let downloadUrl = null;
    for (const quality of qualityOptions) {
      const downloadRes = await request(`https://${cdn}${apiDownload}`, {
        id: youtubeID[1],
        downloadType: format === 'mp3' ? 'audio' : 'video',
        quality: quality,
        key: decrypted.key
      });
      if (downloadRes.status && downloadRes.data.data.downloadUrl) {
        downloadUrl = downloadRes.data.data.downloadUrl;
        break;
      }
    }

    if (!downloadUrl) {
      return { status: false, error: "No se pudo encontrar un enlace de descarga disponible para el video." };
    }
    const fileResponse = await axios.head(downloadUrl); 
    const size = fileResponse.headers['content-length']; 
const file = await save(downloadUrl, "mp3")
    return {
        title: decrypted.title || "Unknown",
        type: format === 'mp3' ? 'audio' : 'video',
        format: format,
        dl: downloadUrl, // `${global.host}/dl?key=${file.key}`,
        size: size ? `${(size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'
      }
    
  } catch (error) {
    return { status: false, error: error.message };
  }
}
module.exports = { ytmp4, ytmp3 };