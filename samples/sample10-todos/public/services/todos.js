// var baseUrl = 'http://localhost:5000';
var baseUrl = 'https://86kopo5fm1.execute-api.us-east-1.amazonaws.com/demo';
angular.module('todoService', [])

	// super simple service
	// each function returns a promise object 
	.factory('Todos', ['$http', function ($http) {
		return {
			get: function () {
				return $http.get(baseUrl + '/api/todos');
			},
			create: function (todoData) {
				return $http.post(baseUrl + '/api/todos', todoData);
			},
			delete: function (id) {
				return $http.delete(baseUrl + '/api/todos/' + id, { t: 1 });
			},
			markAsDone: function (id) {
				return $http.put(baseUrl + '/api/todos/' + id);
			}
		}
	}]);