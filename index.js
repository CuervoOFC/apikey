const express = require('express')
const cors = require('cors')
const secure = require('ssl-express-www')
const chalk = require("chalk");
const favicon = require("serve-favicon");
const path = require("path");
const PORT = 12101
const { color } = require('./lib/color.js')

const mainrouter = require('./routes/main')
const apirouter = require('./routes/api')

const app = express()
app.enable('trust proxy');
app.set("json spaces",2)
app.use(cors())
//app.use(secure)
app.use(express.static("public"))
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

app.use('/', mainrouter)
app.use('/', apirouter)

app.use("/", (req, res, next) => {
  global.host = "https://" + req.get('host');
  next();
});
let totalReq = 0;
app.use((req, res, next) => {
  totalReq++;
  const endpoint = req.originalUrl;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log(
    chalk.green("🌱 Solicitud al endpoint:") + " " + chalk.blue(endpoint)
  );
  console.log(
    chalk.cyan("🌿 IP:") + " " + chalk.red(ip)
  );
  console.log(chalk.yellow("------"));
  next();
});

app.get("/req", (req, res) => {
  res.json({ creator: "CuervoOFC", total: totalReq });
});

app.listen(PORT, () => {
console.log(color("Servidor abierto en el puerto " + PORT,'green'))
})
module.exports = app