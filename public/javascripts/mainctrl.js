var ofertaApp = angular.module('ofertaApp', []);

ofertaApp.controller('ofertaCtrl',['$scope', '$http', function($scope, $http){
	$scope.ofertas = [
		{
		  "title": "Asesor comercial - Giro Educativo",
		  "href": "/Empleo/Oferta/7474810/Asesor-comercial-Giro-Educativo?loc=MX-BCN&amp;hits=50&amp;page=1&amp;ci=tijuana&amp;bdtype=OCCM&amp;f=true",
		  "timestamp": "Jun 19",
		  "description": "Empresa internacional líder en el giro Editorial digital requiere por expansión y posicionamiento de nuevos productos:     Asesor Comercial - Giro Educativo         Requisitos:     Zona: Residencia  ... ",
		  "salary": "$15,000 MXN - $22,000 MXN Mensual",
		  "company": "Planeta DeAgostini Servicios, S.A. de C.V.",
		  "tag": "occ",
		  "source": "https://www.occ.com.mx/"
		}
	];

	$scope.init = function(){
		$http.get('ofertas/get').success(function(response) {
			if(typeof response.status && response.status){
				$scope.ofertas = response.data;	
			}
		});
	}

	$scope.init();
}]);