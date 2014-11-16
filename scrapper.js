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
    	// urllib.request('https://www.occ.com.mx/Buscar_Empleo/Resultados?loc=MX-BCN&hits=50&page=1&ci=tijuana', {
    	urllib.request('https://www.occ.com.mx/Buscar_Empleo/Resultados?bdtype=OCCM&tm=1&hits=50&page=1&f=true', {
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

    this.doEmpleoNuevo = function(callback){
		console.log('Scrapper::doEmpleoNuevo');    	
		urllib.request('http://www.empleonuevo.com/oportunidades/?ciudad=Tijuana&pagina=1&ordenar=fecha&orden=desc&cantidad=100', {
			method: 'POST',
		}, function(err, data, res) {
			if(!err && res.statusCode == 200){
				var $ = cheerio.load(data);
				var data = $('#quicklist .registros tr');
				for(var i=0; i<data.length; i++){
					var row = $(data[i]).find('td');
					if($(row[2]).find('.link').text()){
						var obj = {
							title: $(row[2]).find('.link').text(),
				 			href: sanitizeHref($(row[2]).find('.link').attr('href'), 'http://www.empleonuevo.com/'),
				 			timestamp: $(row[0]).html(),
				 			description: '',
				 			salary: '',
				 			company: $(row[3]).find('.link').text(),
				 			tag: 'empleonuevo',
				 			source: 'http://www.empleonuevo.com',
						};
						
						lista_ofertas.push(obj);
					}
				}
				setEmpleoNuevoCompletOferta(lista_ofertas, 0, function(){
					saveOfertas(lista_ofertas, callback)
				});
			}
			else{
		    	throw err;
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

    function sanitizeHref(href, needle){
    	if(href.indexOf(needle) !== -1){
			href = href.replace(needle, '/');
		}
		return href;
    }

    function sanitizeSalary(value){
    	if(value.length && value.indexOf('Sueldo') !== -1){
			value = value.replace('Sueldo', '');
		}
		else{
			value = '';
		}
		return value;
    }

    function setEmpleoNuevoCompletOferta(lista_ofertas, index, callback){
    	if(index < lista_ofertas.length){
			urllib.request(lista_ofertas[index].source + lista_ofertas[index].href, {
				method: 'POST',
			}, function(err, data, res) {
				if(!err && res.statusCode == 200){
					var $ = cheerio.load(data);
					lista_ofertas[index]['description'] =  $('#description .descripcion').html();
					lista_ofertas[index]['salary'] = sanitizeSalary($('#description table.colspan2 tbody tr').last().text());
					setEmpleoNuevoCompletOferta(lista_ofertas, index+1, callback);
				}
			});
		}
		else{
			callback();
		}
    }
}

module.exports.Scrapper = Scrapper;
