var ofertaApp = angular.module('ofertaApp', ['wu.masonry']);
var ajaxloader=$('<img class="ajax-loader-tiny" src="/images/ajax-loader.gif" style="height: 17px;" />');

ofertaApp.directive('myRepeatDirective', function() {
	return function(scope, element, attrs) {
		if (scope.$last){
			$('#content_ofertas').show();
		}
	};
});

ofertaApp.controller('ofertaCtrl',['$scope', '$http', function($scope, $http){
	$scope.ofertas = [];
	$scope.query = '';
	$scope.last_query = '';

	$scope.serviceSearch = function(){
		$('#msg').text('');
		$('#searchFormCond').append($(ajaxloader).css({'position': 'absolute', 'top': '7px', 'margin-left': '5px'}));
		$scope.last_query = $scope.query;
		$http({
			method: "GET",
			url: "/ofertas/get",
			params: {
				query : $scope.query
			}
		}).success(function(response){
			$('#searchFormCond img').remove();
			if(typeof response.status && response.status){
				$scope.ofertas = response.data;
			}
			else{
				$('#msg').text('Sin resultados');
			}
		});
	}

	$scope.search = function(){
		if($scope.last_query != $scope.query){
			$scope.serviceSearch()		
		}
	}

	$scope.init = function(){
		$scope.serviceSearch();
	}

	$scope.init();
}]);