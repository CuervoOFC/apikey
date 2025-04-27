const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const creador = "CuervoOFC";
const KEYS_FILE = path.join(__dirname, 'apikeys.json');

const resDefault = {
  apikeyInvalida: {
    status: false,
    creador,
    codigo: 406,
    mensaje: `Apikey inválida.`
  },
  sinLimite: {
    status: false,
    creador,
    mensaje: 'Se ha alcanzado el límite de uso de esta apikey.'
  },
  error: {
    status: false,
    creador,
    mensaje: 'Error del servidor o en mantenimiento'
  }
};

function loadKeys() {
  if (!fs.existsSync(KEYS_FILE)) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify({
      free: { sylph: 100 },
      vip: { VIP: 10000 }
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync(KEYS_FILE));
}

function saveKeys(data) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(data, null, 2));
}

function resetFreeKeys() {
  const keys = loadKeys();
  if (keys.free) {
    for (const key in keys.free) {
      keys.free[key] = 100;
    }
    saveKeys(keys);
    console.log('Las apikeys gratis se reiniciaron.');
  }
}

/*function resetVipKeys() {
  const keys = loadKeys();
  if (keys.vip) {
    for (const key in keys.vip) {
      keys.vip[key] = 10000;
    }
    saveKeys(keys);
    console.log('Las apikeys VIP se reiniciaron.');
  }
}*/

const msUntilMidnight = () => {
  const now = new Date();
  const mxOffset = -6; 
  const mxNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const midnight = new Date(mxNow);
  midnight.setHours(24, 0, 0, 0);
  return midnight - mxNow;
};

setTimeout(() => {
  resetFreeKeys();
  setInterval(resetFreeKeys, 24 * 60 * 60 * 1000); 
}, msUntilMidnight());

//setInterval(resetVipKeys, 30 * 24 * 60 * 60 * 1000);

function validarKey(apikey) {
  const keys = loadKeys();
  if (keys.free[apikey] !== undefined) return { tipo: 'free', limite: keys.free[apikey] };
  if (keys.vip[apikey] !== undefined) return { tipo: 'vip', limite: keys.vip[apikey] };
  return null;
}

function deluse(apikey, tipo) {
  const keys = loadKeys();
  if (keys[tipo][apikey] > 0) {
    keys[tipo][apikey]--;
    saveKeys(keys);
    return true;
  }
  return false;
}

/*****/
router.get('/endpoints', (req, res) => {
    const endpoints = {
        creator: "CuervoOFC"
    };

    router.stack.forEach(layer => {
        if (layer.route) {
            const path = layer.route.path;
            const parts = path.split('/');
            if (parts.length > 2) {
                const category = parts[1];
                const name = parts[2];
                const fullPath = `/${name}`;
                if (!endpoints[category]) endpoints[category] = [];
                if (!endpoints[category].includes(fullPath)) endpoints[category].push(fullPath);
            }
        }
    });

    Object.keys(endpoints).forEach(cat => {
        if (cat !== 'creator') endpoints[cat].sort((a, b) => a.localeCompare(b));
    });

    endpoints.total = Object.keys(endpoints)
        .filter(key => key !== 'creator' && key !== 'total')
        .reduce((sum, key) => sum + endpoints[key].length, 0);

    res.json(endpoints);
});

router.get('/dl', (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(400).json({ error: 'Missing key parameter' });

  const folder = path.join(__dirname, '../downloads');
  fs.readdir(folder, (err, files) => {
    if (err) return res.status(500).json({ error: 'Error reading downloads folder' });

    const fileName = files.find(f => f.startsWith(key));
    if (!fileName) return res.status(404).json({ error: 'File not found' });

    const filePath = path.join(folder, fileName);
    res.sendFile(filePath, err => {
      if (!err) setTimeout(() => fs.unlink(filePath, () => {}), 5 * 60 * 1000);
    });
  });
});
/******/

router.get('/ikey', (req, res) => {
  const apikey = req.query.apikey;
  if (!apikey) return res.json(resDefault.apikeyInvalida);

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  return res.json({
    status: true,
    creador,
    apikey,
    tipo: info.tipo,
    limite: info.limite
  });
});

router.get('/addkey', (req, res) => {
  const { apikey, tipo = 'free' } = req.query;
  if (!apikey) return res.json({ mensaje: 'Falta el parámetro apikey' });

  const keys = loadKeys();
  if (keys[tipo]?.[apikey]) return res.json({ mensaje: 'La apikey ya está registrada' });

  keys[tipo] = keys[tipo] || {};
  keys[tipo][apikey] = tipo === 'vip' ? 10000 : 100;
  saveKeys(keys);

  return res.json({ mensaje: `apikey '${apikey}' añadida correctamente como ${tipo}` });
});

router.get('/delkey', (req, res) => {
  const { apikey } = req.query;
  if (!apikey) return res.json({ mensaje: 'Falta el parámetro apikey' });

  const keys = loadKeys();
  for (const tipo of ['free', 'vip']) {
    if (keys[tipo]?.[apikey]) {
      delete keys[tipo][apikey];
      saveKeys(keys);
      return res.json({ mensaje: `apikey '${apikey}' eliminada correctamente` });
    }
  }

  return res.json({ mensaje: 'apikey no encontrada' });
});

const yts = require('yt-search');

router.get('/search/yt', async (req, res) => {
  const apikey = req.query.apikey;
  const query = req.query.q;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!query) return res.json({ status: false, creador, mensaje: 'Falta el parámetro q' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const results = await yts(query);
    const videos = results.videos.slice(0, 10).map(video => ({
      title: video.title,
      url: video.url,
      duration: video.timestamp,
      views: video.views,
      published: video.ago,
      author: video.author.name,
      channelID: video.author.url,
      thumbnail: video.thumbnail
    }));

    deluse(apikey, info.tipo);

    return res.json({
      status: true,
      creador,
      res: videos
    });
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});
router.get('/download/ytmp4', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro url' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { ytmp4 } = require("../scrapers/youtube.js")
    const result = await ytmp4(url);
    deluse(apikey, info.tipo);

    return res.json({
      status: true,
      creador,
      res: result
    });
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/ytmp3', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro url' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { ytmp3 } = require("../scrapers/youtube.js")
    const result = await ytmp3(url);
    deluse(apikey, info.tipo);

    return res.json({
      status: true,
      creador,
      res: result
    });
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/spotify', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro url' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { Spotify } = require("../scrapers/spotify.js")
    const result = await Spotify(url);
    deluse(apikey, info.tipo);

    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/search/spotify', async (req, res) => {
  const apikey = req.query.apikey;
  const q = req.query.q;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!q) return res.json({ status: false, creador, mensaje: 'Falta el parámetro q' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { search } = require("../scrapers/spotify.js")
    const ress = await search(q);
    deluse(apikey, info.tipo);
let result = {
      status: true,
      creador,
      data: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
})

router.get('/search/pinterest', async (req, res) => {
  const apikey = req.query.apikey;
  const q = req.query.q;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!q) return res.json({ status: false, creador, mensaje: 'Falta el parámetro q' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { pins } = require("../scrapers/pinterest.js")
    const ress = await pins(q);
    deluse(apikey, info.tipo);
let result = {
      status: true,
      creador,
      data: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/pinterest', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro URL' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { pindl } = require("../scrapers/pinterest.js")
    const ress = await pindl(url);
    deluse(apikey, info.tipo);
let result = {
      status: true,
      creador,
      data: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/mediafire', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro URL' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { mediafire } = require("../scrapers/mediafire.js")
    const ress = await mediafire(url);
    deluse(apikey, info.tipo);
let result = {
      status: true,
      creador,
      data: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/instagram', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro URL' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { Instagram } = require("../scrapers/instagram.js")
    const ress = await Instagram(url);
    deluse(apikey, info.tipo);
let result = {
      status: true,
      creador,
      result: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/facebook', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro URL' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { Facebook } = require("../scrapers/facebook.js")
    const ress = await Facebook(url);
    deluse(apikey, info.tipo);
let result = {
      status: true,
      creador,
      data: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/ai/chatgpt', async (req, res) => {
  const apikey = req.query.apikey;
  const text = req.query.text;
  
  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!text) return res.json({ status: false, creador, mensaje: 'Falta el parámetro text' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { openai } = require("../scrapers/openai.js")
    const ress = await openai(text);
    deluse(apikey, info.tipo);
let result = {
      status: true,
      creador,
      result: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/ai/blackbox', async (req, res) => {
  const apikey = req.query.apikey;
  const text = req.query.text;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!text) return res.json({ status: false, creador, mensaje: 'Falta el parámetro text' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { blackbox } = require("../scrapers/openai.js")
    const ress = await blackbox(text);
    deluse(apikey, info.tipo);
let result = {
      status: true,
      creador,
      result: ress

    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/tiktok', async (req, res) => {
  const apikey = req.query.apikey;
  const url = req.query.url;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!url) return res.json({ status: false, creador, mensaje: 'Falta el parámetro URL' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { tiktok } = require("../scrapers/tiktok.js")
    const ress = await tiktok(url);
    deluse(apikey, info.tipo);
    return res.json(ress);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/download/npm', async (req, res) => {
  const apikey = req.query.apikey;
  const pkg = req.query.pkg;
  const version = req.query.version || "latest"

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!pkg) return res.json({ status: false, creador, mensaje: 'Falta el parámetro text' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { npmdl } = require("../scrapers/npmdl.js")
    const ress = await npmdl(pkg, version);
    deluse(apikey, info.tipo);
let result = {
      status: true,
      creador,
      data: ress
    }
    return res.json(result);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

router.get('/tools/lyrics', async (req, res) => {
  const apikey = req.query.apikey;
  const q = req.query.q;

  if (!apikey) return res.json(resDefault.apikeyInvalida);
  if (!q) return res.json({ status: false, creador, mensaje: 'Falta el parámetro q' });

  const info = validarKey(apikey);
  if (!info) return res.json(resDefault.apikeyInvalida);

  if (info.limite <= 0) return res.json(resDefault.sinLimite);

  try {
    const { Lyric } = require("../scrapers/lyrics.js")
    const ress = await Lyric(q);
    deluse(apikey, info.tipo);
    return res.json(ress);
  } catch (e) {
    console.error(e);
    return res.json(resDefault.error);
  }
});

module.exports = router;