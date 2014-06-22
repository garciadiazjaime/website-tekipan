var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Busca trabajo | Encuentra un nuevo empleo ' });
});

module.exports = router;
