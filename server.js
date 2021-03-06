#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');

var path = require('path');
var favicon = require('static-favicon');
var bodyParser = require('body-parser');

var urllib = require('urllib');
var cheerio = require('cheerio');

var Scrapper = require('./scrapper').Scrapper

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
var scrapper = new Scrapper(Oferta);



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

		self.routes['/'] = function(req, res) {
			res.render('index', 
				{ 
					title: 'Busca ofertas de trabajo en Tijuana | Encuentra nuevo empleo',
				}
			);
		};

		self.routes['/ofertas/get'] = function(req, res) {
			var query = typeof req.param('query') != 'undefined' && req.param('query') != '' ? req.param('query') : '';
			var page = typeof req.param('page') != 'undefined' && req.param('page') != '' ? req.param('page') : '';
			var regex_title = new RegExp(query, 'gi');
			var regex_description = new RegExp(query, 'gi');
			var regex_salary = new RegExp(query, 'gi');
			var regex_company = new RegExp(query, 'gi');

			console.log('ofertas/get ' + query + ' ' + page);

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
				limit: 30,
				skip: (page - 1) * 30
			};
			Oferta.find( filter, fields, options).sort({timestamp:-1}).exec(function (err, ofertas) {
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
			scrapper.doOcc(function(response, data){
				if(response){
					res.json({ 'status': true, 'items_saved': data })	
				}
				else{
					res.json({ 'status': false, 'error': data })
				}
			});
		}

		self.routes['/bot/empleonuevo'] = function(req, res){
			scrapper.doEmpleoNuevo(function(response, data){
				if(response){
					res.json({ 'status': true, 'items_saved': data })	
				}
				else{
					res.json({ 'status': false, 'error': data })
				}
			});
		}

		self.routes['/bot/empleogob'] = function(req, res){
			scrapper.doEmpleoGob(function(response, data){
				if(response){
					res.json({ 'status': true, 'items_saved': data })	
				}
				else{
					res.json({ 'status': false, 'error': data })
				}
			});
		}

		self.routes['/bot/computrabajo'] = function(req, res){
			scrapper.doCompuTrabajo(function(response, data){
				if(response){
					res.json({ 'status': true, 'items_saved': data })	
				}
				else{
					res.json({ 'status': false, 'error': data })
				}
			});
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

