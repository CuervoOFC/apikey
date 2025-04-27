__path = process.cwd()
const express = require('express');
const router = express.Router();

/*router.get('/', (req, res) => {
    res.render(__path + '/views/home.ejs')
})*/
router.get("/", (req, res) => {
  res.render("home");
});
router.get('/home', (req, res) => {
    res.sendFile(__path + '/views/index.html')
})
router.get('/valor', (req, res) => {
    res.sendFile(__path + '/views/valor.html')
})

router.get('/config', (req, res) => {
config = {
status: true,
result: {
    prefix : '/',
    botName: 'SimpleBot-MD',
    creator: "CuervoOFC",
    github: "https://github.com/Nimodo83"
   }
}
res.json(config)
})

module.exports = router
