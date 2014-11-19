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
    	lista_ofertas = []
    	urllib.request('https://www.occ.com.mx/Buscar_Empleo/Resultados?loc=MX-BCN&hits=100&page=1&ci=tijuana', {
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
		lista_ofertas = [];
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

    this.doEmpleoGob = function(callback){
    	console.log('Scrapper::doEmpleoGob');
    	lista_ofertas = [];
    	urllib.request('http://app.empleo.gob.mx/STPSEmpleoWebBack/busquedaEspecificaOfertas.do?method=encontrar', {
			method: 'POST',
			data:{
				'locationEntity': '2:Baja California',
				'locationMunicipalities[0]': '4:Tijuana'
			}
		}, function(err, data, res) {
			if(!err && res.statusCode == 200){
				var $ = cheerio.load(data);
				var bits = res.headers['set-cookie'][0].split(';');
				var cookie = res.headers['set-cookie'][1] + ';' + bits[0] + ';';

				getEmpleoGobOfertas(cookie, 1, function(response, data){
					if(response){
						setEmpleoGobDescription(cookie, 0, function(response, data){
							if(response){
								saveOfertas(lista_ofertas, callback)
							}
							else{
								callback(false, data);
							}
						});
					}
					else{
						callback(false, data);
					}
				});
			}
			else{
		    	callback(false, err);
		    }
		});
    }

    this.doCompuTrabajo = function(callback){
    	console.log('Scrapper::doCompuTrabajo');
    	lista_ofertas = [];
    	urllib.request('http://www.computrabajo.com.mx/ofertas-de-trabajo/empleos-en-baja-california-en-tijuana?pubdate=1', {
			method: 'POST',
		}, function(err, data, res) {
			if(!err && res.statusCode == 200){
				var $ = cheerio.load(data);
				var info = $('#p_ofertas >li');
				for(var i=0; i<info.length; i++){
					var obj = {
						title: sanitizeTitle($(info[i]).find('.js-o-link').text()),
			 			href: $(info[i]).find('.js-o-link').attr('href'),
			 			timestamp: new Date().toJSON().slice(0,10),
			 			description: $(info[i]).find('p').text(),
			 			salary: '',
			 			company: $(info[i]).find('h2').text(),
			 			tag: 'computrabajo',
			 			source: 'http://www.computrabajo.com.mx/',
					};
					lista_ofertas.push(obj);
				}
				setCompuTrabajoSalary(0, function(response, data){
					if(response){
						saveOfertas(lista_ofertas, callback);
					}
					else{
						callback(false, data)
					}
				});
			}
			else{
		    	callback(false, err);
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
			callback(true, data.length);
		}
		else{
			callback(true, 'There is no info to save');
		}
    }

    function capitaliseFirstLetter(string){
    	return string.charAt(0).toUpperCase() + string.slice(1);
	}

    function sanitizeTitle(value){
		value = value.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
		value = value.replace(/tijuana|mexicali|tijuana bc/gi, '');
		value = value.replace(/\s{2,}/g, ' ');
		return capitaliseFirstLetter(value.trim().toLowerCase());
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

	function cleanUpSpecialChars(str){
	    // str = str.replace(/[ÀÁÂÃÄÅ]/g,"A");
	    str = str.replace(/[�]/g,"é");
	    return str;
	}

	function sanitizeDescription(value){
		if(value){
			value = value.replace(/<\/?[^>]+(>|$)/g, "");
			return value.replace('Funciones: ', '');
		}
		return '';
	}

	function cleanString(data){
		var response = data.replace(/(\r\n\t|\n|\r|\t)/gm,"");
		response = cleanUpSpecialChars(response.trim());
		return response;
	}

	function getTimeFromString(format, data){
		var response = '';
		if(format == 'empleogob'){
			var bits = data.split('de');
			response =  bits[2] + '-' + getMonthFromString(bits[1]) + '-' + bits[0];
		}
		return response;
	}

	function getMonthFromString(data){
		var months = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
		var response = months.indexOf(data.trim().toLowerCase());
		return response;
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

    function getEmpleoGobOfertas(cookie, page, callback){
    	var url = page == 1 ? 'http://app.empleo.gob.mx/STPSEmpleoWebBack/busquedaEspecificaOfertas.do?method=orderByColumn&orderType=desc&columnNumber=5' : 'http://app.empleo.gob.mx/STPSEmpleoWebBack/busquedaEspecificaOfertas.do?method=goToPage&goToPageNumber=' + page;
    	urllib.request(url, {
			method: 'POST',
			headers: {
				'Cookie': cookie,
			}
		}, function(err, data, res) {
			if(!err && res.statusCode == 200){
				var $ = cheerio.load(data);
				var trs = $('tbody tr');
				for(var i=1; i<trs.length; i++){
					var tds = $(trs[i]).find('td')
					if($(tds[0]).find('.titulo').length){
						var obj = {
							title: cleanString($(tds[0]).find('.titulo').text()),
				 			href: $(tds[0]).find('.titulo').attr('href'),
				 			timestamp: getTimeFromString('empleogob', cleanString($(tds[4]).text())),
				 			description: '',
				 			salary: cleanString($(tds[3]).text()),
				 			company: cleanString($(tds[2]).text()),
				 			tag: 'empleogob',
				 			source: 'http://app.empleo.gob.mx/',
						};
						lista_ofertas.push(obj);
					}
				}
				if(page < 6){
					getEmpleoGobOfertas(cookie, page+1, callback)
				}
				else{
					callback(true, '')
				}
			}
			else{
		    	callback(false, err);
		    }
		});
    }

	function setEmpleoGobDescription(cookie, index, callback){
		if(index < lista_ofertas.length){
			urllib.request(lista_ofertas[index]['source']+lista_ofertas[index]['href'], {
				method: 'POST',
				headers: {
					'Cookie': cookie,
				}
			}, function(err, data, res) {
				if(!err && res.statusCode == 200){
					var $ = cheerio.load(data);
					var tmp = $('.ficha_relacionada')
					var ps = $(tmp[1]).find('p');
					lista_ofertas[index]['description'] = sanitizeDescription($(ps[1]).html());
					setEmpleoGobDescription(cookie, index+1, callback)
				}
				else{
			    	callback(false, err);
			    }
			});
		}
		else{
			callback(true, '');
		}	
	}

	function setCompuTrabajoSalary(index, callback){
		if(index < lista_ofertas.length){
			urllib.request(lista_ofertas[index]['source'] + lista_ofertas[index]['href'], {
				method: 'POST',
			}, function(err, data, res) {
				if(!err && res.statusCode == 200){
					var $ = cheerio.load(data);
					lista_ofertas[index]['salary'] = $('.detalle_oferta li').first().text();
					setCompuTrabajoSalary(index+1, callback)						
				}
				else{
					callback(false, err)
				}
			});
		}
		else{
			callback(true, '');	
		}
	}
}

module.exports.Scrapper = Scrapper;
