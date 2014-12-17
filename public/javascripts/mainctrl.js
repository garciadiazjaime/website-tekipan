var ofertaApp = angular.module('ofertaApp', ['wu.masonry']);
var ajaxloader=$('<img class="ajax-loader-tiny" src="/images/ajax-loader.gif" style="height: 17px;" />');
var is_hidden = true;

ofertaApp.directive('myRepeatDirective', function() {
	return function(scope, element, attrs) {
		if (scope.$last){
			setTimeout(function(){
				if(is_hidden){
					$('#content_ofertas').css({'visibility': 'visible'});
					is_hidden = false;
				}
			}, 400);
		}
	};
});

ofertaApp.controller('ofertaCtrl',['$scope', '$http', function($scope, $http){
	$scope.ofertas = [];
	$scope.query = '';
	$scope.last_query = '';
	$scope.page = 1;
	$scope.is_there_more = true;
	$scope.is_fire_available = true;

	$scope.serviceSearch = function(){
		$('#msg').text('');
		$('#searchFormCond').append($(ajaxloader).css({'position': 'absolute', 'top': '7px', 'margin-left': '5px'}));
		$scope.last_query = $scope.query;
		$http({
			method: "GET",
			url: "/ofertas/get",
			params: {
				query : $scope.query,
				page: $scope.page
			}
		}).success(function(response){
			$('#searchFormCond img').remove();
			if(typeof response.status && response.status){
				if($scope.page == 1){
					$('html, body').scrollTop(0)
					$scope.ofertas = [];
				}
				for(row in response.data){
					$scope.ofertas.push(response.data[row]);	
				}
				$scope.is_there_more = true;
				$scope.is_fire_available = true;
			}
			else{
				$scope.is_there_more = false;
				if($scope.page == 1){
					$('#msg').text('Sin resultados');	
				}
			}
		});
	}

	$scope.search = function(){
		if($scope.last_query != $scope.query){
			$scope.page = 1;
			$scope.serviceSearch();
			ga('send', 'event', 'input', 'query', $scope.query);
		}
	}

	$scope.sendEvent = function(value, data){
		if(value == 1){
			// quienes somos
			ga('send', 'event', 'button', 'click', 'quienes-somos');	
		}
		else if(value == 2){
			// click en oferta
			ga('send', 'event', 'oferta', data['tag'], data['_id']);
		}
		else if(value == 3){
			// click en mint
			ga('send', 'event', 'button', 'click', 'mintitmedia');
		}
		else if(value == 31){
			// click en mint
			ga('send', 'event', 'button', 'click', 'powered_mintitmedia');
		}
		else if(value == 4){
			// click en mint
			ga('send', 'event', 'button', 'click', 'email');
		}
		else if(value == 5){
			// click en mint
			ga('send', 'event', 'page', 'scroll', 'end_of_page');
		}
	}

	$scope.scrollListener = function(){
		$(window).scroll(function() {
			if($(window).scrollTop() + $(window).height() == $(document).height()) {
				$scope.sendEvent(5);
			}
			if($(window).scrollTop() + $(window).height() + 300 >= $(document).height()) {
				if($scope.is_fire_available && $scope.is_there_more){
					$scope.page++;
					$scope.is_fire_available = false;
					$scope.serviceSearch()
				}

			}
		});
	}

	$scope.init = function(){
		$scope.serviceSearch();
		$scope.scrollListener();
	}

	$scope.init();
}]);