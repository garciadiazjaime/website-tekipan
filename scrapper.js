var urllib = require('urllib');
var cheerio = require('cheerio');
var OfertasDAO = require('./ofertas').OfertasDAO

/* The Scrapper must be constructed with a mongoose Schema object */
function Scrapper(Oferta) {
    "use strict";

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object. Log a warning and call it correctly. */
    if (false === (this instanceof Scrapper)) {
        console.log('Warning: Scrapper constructor called without "new" operator');
        return new Scrapper();
    }

    var lista_ofertas = [];
    var ofertas = new OfertasDAO(Oferta);

    this.doOcc = function (callback) {
    	console.log('Scrapper::doOcc');
    	urllib.request('https://www.occ.com.mx/Buscar_Empleo/Resultados?loc=MX-BCN&hits=50&page=1&ci=tijuana', {
			method: 'POST',
		}, function(err, data, res) {
			if(!err && res.statusCode == 200){
				var $ = cheerio.load(data);
				var data = $('#results_sr').children();
				for(var i=0; i<data.length; i++){
					var obj = {
						title: $(data[i]).find('.title_modn_sr a').text(),
			 			href: $(data[i]).find('.title_modn_sr a').attr('href'),
			 			timestamp: $(data[i]).find('.fecha_modn_sr').text(),
			 			description: $(data[i]).find('.descrip_modn_sr').text(),
			 			salary: $(data[i]).find('.salario_modn_sr').text(),
			 			company: $(data[i]).find('.company_modn_sr a').text(),
			 			tag: 'occ',
			 			source: 'https://www.occ.com.mx',
					};
					lista_ofertas.push(obj);
				}
				saveOfertas(lista_ofertas, callback);
			}
			else{
		    	callback(false, err)
		    }
		});
    }

    function saveOfertas(data, callback){
    	if(data.length){
	    	for(var i=0; i<data.length; i++){
				ofertas.insertEntry(data[i], function(data) {
		            console.log('save oferta: ' + data.tag + ' / ' + data.title);
		        });
			}
			console.log(data.length + ' ofertas guardads de ' + data[0].tag);
			callback(true, data.length)
		}
		else{
			callback(true, 0)	
		}
    }
}

module.exports.Scrapper = Scrapper;
