var ofertaApp = angular.module('ofertaApp', ['wu.masonry']);

ofertaApp.directive('myRepeatDirective', function() {
	return function(scope, element, attrs) {
		if (scope.$last){
			setTimeout(function(){
				$('#content_ofertas').show();	
			}, 10);
			
		}
	};
});

ofertaApp.controller('ofertaCtrl',['$scope', '$http', function($scope, $http){
	$scope.ofertas = [];
	$scope.query = '';

	$scope.serviceSearch = function(){
		$http({
			method: "GET",
			url: "/ofertas/get",
			params: {
				query : $scope.query
			}
		}).success(function(response){
			if(typeof response.status && response.status){
				$scope.ofertas = response.data;
			}
		});
	}

	$scope.search = function(){
		if($scope.query.length > 2){
			$scope.serviceSearch()	
		}
	}

	$scope.init = function(){
		$scope.serviceSearch();
	}

	$scope.init();
}]);