const fetch = require('node-fetch');

async function gdrive(url) {
      let id;
      id = (url.match(/\/?id=(.+)/i) || url.match(/\/d\/(.*?)\//))[1];
      if (!id) throw 'No se encontró id de descarga';
      let res = await fetch(
        `https://drive.google.com/uc?id=${id}&authuser=0&export=download`,
        {
          method: 'post',
          headers: {
            'accept-encoding': 'gzip, deflate, br',
            'content-length': 0,
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            origin: 'https://drive.google.com',
            'user-agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
            'x-client-data': 'CKG1yQEIkbbJAQiitskBCMS2yQEIqZ3KAQioo8oBGLeYygE=',
            'x-drive-first-party': 'DriveWebUi',
            'x-json-requested': 'true',
          },
        }
      );
      let { fileName, sizeBytes, downloadUrl } = JSON.parse(
        (await res.text()).slice(4)
      );
      if (!downloadUrl) throw 'Se excedió el número de descargas del link';
      let data = await fetch(downloadUrl);
      if (data.status !== 200) throw data.statusText;
      return {
        status: true,
        creator: "CuervoOFC",
        data: {
        downloadUrl,
        fileName,
        fileSize: `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
        mimetype: data.headers.get('content-type')
        }
      };
    }
module.exports = { gdrive }

/*let r = await fdrivedl('https://drive.google.com/file/d/19F6SDybFPjgixheyWduWrApKwF8FNhVl/view?usp=drivesdk')
return r*/