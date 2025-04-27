const { exec } = require("child_process");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

async function npmdl(pkg, pkgver) {
  try {
    await new Promise((resolve, reject) => {
      exec(`npm view ${pkg}@${pkgver}`, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  } catch (e) {
    return {
      status: false,
      msg: `El módulo ${pkg} no se encuentra en https://www.npmjs.com, verifique el nombre y vuelva a intentar.`,
    };
  }

  try {
    const output = await new Promise((resolve, reject) => {
      exec(`npm pack ${pkg}@` + pkgver, (error, stdout) => {
        if (error) return reject(error);
        resolve(stdout.trim());
      });
    });

    const fileName = output;
    const filePath = path.join(process.cwd(), fileName);
    const fileStats = await fs.promises.stat(filePath);
    const sizeKB = (fileStats.size / 1024).toFixed(2) + " KB";

    const match = fileName.match(/.+-(\d+\.\d+\.\d+.*)\.tgz$/);
    const version = match ? match[1] : pkgver;

    const key = "cuervo-" + crypto.randomBytes(60).toString("hex") + `===${version}`;
    const destPath = `./downloads/${key}.tgz`;

    await fs.promises.rename(filePath, destPath);

    return {
      status: true,
      name: pkg,
      version: version,
      size: sizeKB,
      npm_url: `https://www.npmjs.com/package/${pkg}/v/${version}`,
      dl_url: `${global.host}/dl?key=${key}`,
    };

  } catch (err) {
    console.error(`Error al descargar o procesar el paquete: ${err}`);
    return {
      status: false,
      msg: "Ocurrió un error al intentar procesar el módulo. Inténtalo más tarde.",
      error: err
    };
  }
}
module.exports = { npmdl };