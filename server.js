#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');

var path = require('path');
var favicon = require('static-favicon');
var bodyParser = require('body-parser');

var urllib = require('urllib');
var cheerio = require('cheerio');

// default to a 'localhost' configuration:
var connection_string = 'localhost/tekipan';
if(process.env.OPENSHIFT_MONGODB_DB_PASSWORD){
	connection_string = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
	process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
	process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
	process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
	process.env.OPENSHIFT_APP_NAME;
}

var mongoose = require('mongoose');
mongoose.connect('mongodb://' + connection_string);
var ofertaSchema = mongoose.Schema({
	title: String,
	href: String,
	timestamp: String,
	description: String,
	salary: String,
	company: String,
	tag: String,
	source: String
});

var Oferta = mongoose.model('Oferta', ofertaSchema)



/**
 *  Define the sample application.
 */
var SampleApp = function() {

	//  Scope.
	var self = this;


	/*  ================================================================  */
	/*  Helper functions.                                                 */
	/*  ================================================================  */

	/**
	 *  Set up server IP address and port # using env variables/defaults.
	 */
	self.setupVariables = function() {
		//  Set the environment variables we need.
		self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
		self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

		if (typeof self.ipaddress === "undefined") {
			//  Log errors on OpenShift but continue w/ 127.0.0.1 - this
			//  allows us to run/test the app locally.
			console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
			self.ipaddress = "0.0.0.0";
		};
	};


	/**
	 *  Populate the cache.
	 */
	self.populateCache = function() {
		if (typeof self.zcache === "undefined") {
			self.zcache = { 'index.html': '' };
		}

		//  Local cache for static content.
		self.zcache['index.html'] = fs.readFileSync('./index.html');
	};


	/**
	 *  Retrieve entry (content) from cache.
	 *  @param {string} key  Key identifying content to retrieve from cache.
	 */
	self.cache_get = function(key) { return self.zcache[key]; };


	/**
	 *  terminator === the termination handler
	 *  Terminate server on receipt of the specified signal.
	 *  @param {string} sig  Signal to terminate on.
	 */
	self.terminator = function(sig){
		if (typeof sig === "string") {
		   console.log('%s: Received %s - terminating sample app ...',
					   Date(Date.now()), sig);
		   process.exit(1);
		}
		console.log('%s: Node server stopped.', Date(Date.now()) );
	};


	/**
	 *  Setup termination handlers (for exit and a list of signals).
	 */
	self.setupTerminationHandlers = function(){
		//  Process on exit and signals.
		process.on('exit', function() { self.terminator(); });

		// Removed 'SIGPIPE' from the list - bugz 852598.
		['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
		 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
		].forEach(function(element, index, array) {
			process.on(element, function() { self.terminator(element); });
		});
	};


	/*  ================================================================  */
	/*  App server functions (main app logic here).                       */
	/*  ================================================================  */

	/**
	 *  Create the routing table entries + handlers for the application.
	 */
	self.createRoutes = function() {
		self.routes = { };

		self.routes['/asciimo'] = function(req, res) {
			var link = "http://i.imgur.com/kmbjB.png";
			res.send("<html><body><img src='" + link + "'></body></html>");
		};

		self.routes['/'] = function(req, res) {
			Oferta.find(function (err, ofertas) {
				if (err) return console.error(err);
				res.render('index', 
					{ 
						title: 'Busca trabajo | Encuentra un nuevo empleo ',
						ofertas: ofertas
					}
				);
			});
		};

		self.routes['/ofertas/get'] = function(req, res) {
			console.log('ofertas/get');
			query = typeof req.param('query') != 'undefined' && req.param('query') != '' ? req.param('query') : '';
			var regex_title = new RegExp(query, 'gi');
			var regex_description = new RegExp(query, 'gi');
			var regex_salary = new RegExp(query, 'gi');
			var regex_company = new RegExp(query, 'gi');
			var filter = {
				$or: [
					{ title: regex_title },
					{ description: regex_description },
					{ salary: regex_salary },
					{ company: regex_company }
				]
			};
			var fields = {};
			var options = {
				limit: 51
			};
			Oferta.find( filter, fields, options, function (err, ofertas) {
				if (err) return console.error(err);
				if(typeof ofertas && ofertas.length){
					res.json({ 'status': 1, 'data': ofertas })    
				}
				else{
					res.json({ 'status': 0 })
				}
			});
		};

		self.routes['/bot/occ'] = function(req, res){
			console.log('/bot/occ');
			urllib.request('https://www.occ.com.mx/Buscar_Empleo/Resultados?loc=MX-BCN&hits=50&page=1&ci=tijuana', {
				method: 'POST',
			}, function(err, data, res) {
				if(!err && res.statusCode == 200){
					var $ = cheerio.load(data);
					$('#results_sr').children().each(function(i, item) {
						var obj = {};

						obj.title = $(item).find('.title_modn_sr a').text();
						obj.href = $(item).find('.title_modn_sr a').attr('href');
						obj.timestamp = $(item).find('.fecha_modn_sr').text();
						obj.description = $(item).find('.descrip_modn_sr').text();
						obj.salary = $(item).find('.salario_modn_sr').text();
						obj.company = $(item).find('.company_modn_sr a').text();
						obj.tag = 'occ';
						obj.source = 'https://www.occ.com.mx/'

						var oferta = new Oferta({
							title: obj.title,
							href: obj.href,
							timestamp: obj.timestamp,
							description: obj.description,
							salary: obj.salary,
							company: obj.company,
							tag: obj.tag,
							source: obj.source,
						});

						oferta.save(function(err, data){
							if (err) return console.error(err);
							console.log('save oferta: ' + obj.tag + ' / ' + obj.title);
						})
					});
				}
				else{
			    	throw err;
			    }
			});
			res.json({ 'status': 1 })
		}

		self.routes['/bot/empleonuevo'] = function(req, res){
			console.log('/bot/empleonuevo');
			urllib.request('http://www.empleonuevo.com/oportunidades/?ciudad=Tijuana&pagina=1&cantidad=10', {
				method: 'POST',
			}, function(err, data, res) {
				if(!err && res.statusCode == 200){
					var $ = cheerio.load(data);
					$('#quicklist .registros tr').each(function(i, item) {
						var obj = {
							title: '',
				 			href: '',
				 			timestamp: '',
				 			description: '',
				 			salary: '',
				 			company: '',
				 			tag: 'empleonuevo',
				 			source: 'http://www.empleonuevo.com/',
						};

						var tds = $(item).find('td');
						obj.title = $(tds[2]).find('.link').text();
						if(obj.title){
							obj.href = $(tds[2]).find('.link').attr('href');
							obj.timestamp = $(tds[0]).html()
							obj.company = $(tds[3]).find('.link').text();

							if(obj.href.indexOf(obj.source) !== -1){
								obj.href = obj.href.replace(obj.source, '/');
							}
						
							var oferta = new Oferta({
								title: obj.title,
					 			href: obj.href,
					 			timestamp: obj.timestamp,
					 			description: obj.description,
					 			salary: obj.salary,
					 			company: obj.company,
					 			tag: obj.tag,
					 			source: obj.source,
							});	
							oferta.save(function(err, data){
								if (err) return console.error(err);
								console.log('save oferta: ' + obj.tag + ' / ' + obj.title);

								var oferta_id = data._id
								console.log(oferta_id)

								urllib.request(data.source + data.href, {
									method: 'POST',
								}, function(err, data, res) {
									if(!err && res.statusCode == 200){
										var $ = cheerio.load(data);
										var description = $('#description .descripcion').html();
										var salary = $('#description table.colspan2 tbody tr').last().text();
										if(salary.length && salary.indexOf('Sueldo') !== -1){
											salary = salary.replace('Sueldo', '');
										}

										var conditions = {'_id': oferta_id};
										var update = {
											'description': description,
											'salary': salary
										}
										var options = { multi: true };

										Oferta.update(conditions, update, options, callback);

										function callback(err, numAffected){
											console.log('numAffected ' + numAffected);
										}
									}
								});
							})
						}
					});
				}
				else{
			    	throw err;
			    }
			});
			res.json({ 'status': 1 })
		}

		self.routes['/bot/empleogob'] = function(req, res){
			console.log('/bot/empleogob');
			urllib.request('http://app.empleo.gob.mx/STPSEmpleoWebBack/busquedaEspecificaOfertas.do?method=encontrar', {
				method: 'POST',
				data:{
					'locationEntity': '2:Baja California',
					'locationMunicipalities[0]': '4:Tijuana'
				}
			}, function(err, data, res) {
				if(!err && res.statusCode == 200){
					var $ = cheerio.load(data);
					var tmp = res.headers['set-cookie'][0];
					var bits = tmp.split(';');
					var cookie = res.headers['set-cookie'][1] + ';' + bits[0] + ';';
					var ofertas_list = [];
					
					urllib.request('http://app.empleo.gob.mx/STPSEmpleoWebBack/busquedaEspecificaOfertas.do?method=orderByColumn&orderType=desc&columnNumber=5', {
					//urllib.request('http://app.empleo.gob.mx/STPSEmpleoWebBack/busquedaEspecificaOfertas.do?method=page', {
						method: 'POST',
						headers: {
							'Cookie': cookie,
						}
					}, function(err, data, res) {
						if(!err && res.statusCode == 200){

							var $ = cheerio.load(data);

							trs = $('tbody tr');
							for(var i=1; i<trs.length; i++){
								var tds = $(trs[i]).find('td')
								if($(tds[0]).find('.titulo').length){
									var obj = {
										title: '',
							 			href: '',
							 			timestamp: '',
							 			description: '',
							 			salary: '',
							 			company: '',
							 			tag: 'empleogob',
							 			source: 'http://app.empleo.gob.mx/',
									};

									obj.title = cleanString($(tds[0]).find('.titulo').text());
									obj.href = $(tds[0]).find('.titulo').attr('href');
									obj.timestamp = getTimeFromString('empleogob', cleanString($(tds[4]).text()));
									obj.salary = cleanString($(tds[3]).text());
									obj.company = cleanString($(tds[2]).text());

									ofertas_list.push(obj);
								}
							}

							console.log(ofertas_list)
							var ofertas_list_index = 0;

							scrap_ofertas_from_pagina(2, function(){
								console.log(ofertas_list);
								getDescription(ofertas_list_index);
							});
							

							function cleanUpSpecialChars(str){
							    // str = str.replace(/[ÀÁÂÃÄÅ]/g,"A");
							    str = str.replace(/[�]/g,"é");
							    return str;
							}

							function cleanString(data){
								response = data.replace(/(\r\n\t|\n|\r|\t)/gm,"");
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
							
							function getDescription(index){
								urllib.request(ofertas_list[index]['source']+ofertas_list[index]['href'], {
									method: 'POST',
									headers: {
										'Cookie': cookie,
									}
								}, function(err, data, res) {
									if(!err && res.statusCode == 200){
										var $ = cheerio.load(data);
										var tmp = $('.ficha_relacionada')
										var ps = $(tmp[1]).find('p');
										var description = $(ps[1]).html();
										description = description.replace(/<\/?[^>]+(>|$)/g, "");
										description = description.replace('Funciones: ', '');

										var oferta = new Oferta({
											title: ofertas_list[index]['title'],
								 			href: ofertas_list[index]['href'],
								 			timestamp: ofertas_list[index]['timestamp'],
								 			description: description,
								 			salary: ofertas_list[index]['salary'],
								 			company: ofertas_list[index]['company'],
								 			tag: ofertas_list[index]['tag'],
								 			source: ofertas_list[index]['source'],
										});

										oferta.save(function(err, data){
											if (err) return console.error(err);
											console.log('save oferta: ' + data.tag + ' / ' + data.title);

											if(index  + 1 < ofertas_list.length){
												getDescription(index + 1);
											}
										});
									}
									else{
								    	throw err;
								    }
								});
							};

							function scrap_ofertas_from_pagina(page, callback){
								urllib.request('http://app.empleo.gob.mx/STPSEmpleoWebBack/busquedaEspecificaOfertas.do?method=goToPage&goToPageNumber=' + page, {
									method: 'POST',
									headers: {
										'Cookie': cookie,
									}
								}, function(err, data, res) {
									if(!err && res.statusCode == 200){
										var $ = cheerio.load(data);
										console.log('================ PAG ' + page + '================')

										trs = $('tbody tr');
										for(var i=1; i<trs.length; i++){
											var tds = $(trs[i]).find('td')
											if($(tds[0]).find('.titulo').length){
												var obj = {
													title: '',
										 			href: '',
										 			timestamp: '',
										 			description: '',
										 			salary: '',
										 			company: '',
										 			tag: 'empleogob',
										 			source: 'http://app.empleo.gob.mx/',
												};
												
												obj.title = cleanString($(tds[0]).find('.titulo').text());
												obj.href = $(tds[0]).find('.titulo').attr('href');
												obj.timestamp = getTimeFromString('empleogob', cleanString($(tds[4]).text()));
												obj.salary = cleanString($(tds[3]).text());
												obj.company = cleanString($(tds[2]).text());

												ofertas_list.push(obj);

												// var oferta = new Oferta({
												// 	title: obj.title,
										 	// 		href: obj.href,
										 	// 		timestamp: obj.timestamp,
										 	// 		description: obj.description,
										 	// 		salary: obj.salary,
										 	// 		company: obj.company,
										 	// 		tag: obj.tag,
										 	// 		source: obj.source,
												// });

												// oferta.save(function(err, data){
												// 	if (err) return console.error(err);
												// 	console.log('save oferta: ' + data.tag + ' / ' + data.title);
												// });
											}
										}
										if(page < 5){
											scrap_ofertas_from_pagina(page+1, callback);
										}else{
											callback();
										}
									}
								});
							}

						}
					});

				}
				else{
			    	throw err;
			    }
			});
			res.json({ 'status': 1 })
		}
	};


	/**
	 *  Initialize the server (express) and create the routes and register
	 *  the handlers.
	 */
	self.initializeServer = function() {
		self.createRoutes();
		//self.app = express.createServer();
		self.app = express();

		self.app.set('views', path.join(__dirname, 'views'));
		self.app.set('view engine', 'jade');
		self.app.configure('development', function(){ self.app.locals.pretty = true })
		self.app.use(favicon());
		self.app.use(bodyParser.json());
		self.app.use(bodyParser.urlencoded());
		self.app.use(express.static(path.join(__dirname, 'public')));


		//  Add handlers for the app (from the routes).
		for (var r in self.routes) {
			self.app.get(r, self.routes[r]);
		}
	};


	/**
	 *  Initializes the sample application.
	 */
	self.initialize = function() {
		self.setupVariables();
		//self.populateCache();
		self.setupTerminationHandlers();

		// Create the express server and routes.
		self.initializeServer();
	};


	/**
	 *  Start the server (starts up the sample application).
	 */
	self.start = function() {
		//  Start the app on the specific interface (and port).
		self.app.listen(self.port, self.ipaddress, function() {
			console.log('%s: Node server started on %s:%d ...',
						Date(Date.now() ), self.ipaddress, self.port);
		});
	};

};   /*  Sample Application.  */


mongoose.connection.on("connected", function(ref) {
	/**
	 *  main():  Main code.
	 */
	var zapp = new SampleApp();
	zapp.initialize();
	zapp.start();
});

