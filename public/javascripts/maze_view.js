// register the directive with your app module
var app = angular.module('ddApp', ['ngAnimate', 'ui.bootstrap', 'rzModule']);

// function referenced by the drop target
app.controller('ddController', ['$scope', '$uibModal', '$log','$timeout', '$http', function($scope, $uibModal, $log, $timeout, $http){

    $scope.z = 0;

    $scope.visType = "side";
    $scope.countWords = ["Bottom", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Ninth"];
    $scope.sliderOptions = {
        floor: 0,
        ceil: 0,
        showSelectionBar: true,
        showTicksValues: true
    };

    $scope.cells = {};
    $scope.tiles = {};
    
    $http.get("/api/runs/maze/"+runId+"?populate=true").then(function(response){

	console.log(response.data);
	$scope.exitBonus = response.data.exitBonus;
	$scope.field = response.data.field.name;
	$scope.round = response.data.round.name;
	$scope.score = response.data.score;
	$scope.team = response.data.team.name;
	$scope.LoPs = response.data.LoPs;
		
	// Verified time by timekeeper
        $scope.minutes = response.data.time.minutes;
        $scope.seconds = response.data.time.seconds;

	// Scoring elements of the tiles
	for(var i = 0; i < response.data.tiles.length; i++){
            $scope.tiles[response.data.tiles[i].x + ',' +
                         response.data.tiles[i].y + ',' +
                         response.data.tiles[i].z] = response.data.tiles[i];
        }
	
	// Get the map
	$http.get("/api/maps/maze/" + response.data.map + "?populate=true").then(function(response){
	    console.log(response.data);
            $scope.startTile = response.data.startTile;
            $scope.height = response.data.height;
            $scope.sliderOptions.ceil = $scope.height - 1;
            $scope.width = response.data.width;
            $scope.length = response.data.length;
	    
	    for(var i = 0; i < response.data.cells.length; i++){
                $scope.cells[response.data.cells[i].x + ',' +
                             response.data.cells[i].y + ',' +
                             response.data.cells[i].z] = response.data.cells[i];
            }

	    
        }, function(response){
            console.log("Error: " + response.statusText);
        });

    }, function(response){
        console.log("Error: " + response.statusText);
    });


    $scope.range = function(n){
        arr = [];
        for (var i=0; i < n; i++) {
            arr.push(i);
        }
        return arr;
    }


    
    $scope.isUndefined = function (thing) {
	return (typeof thing === "undefined");
    }


    $scope.tileStatus = function(x,y,z,isTile){
        // If this is a non-existent tile
	var cell = $scope.cells[x+','+y+','+z];
	if(!cell)
	    return;
	if(!isTile)
	    return;

	if(!$scope.tiles[x+','+y+','+z]){
	    $scope.tiles[x+','+y+','+z] = {scoredItems: {speedbump: false, checkpoint: false, rampBottom: false, rampTop: false, victims: {top: false, right: false, left: false, bottom: false}, rescueKits: {top: 0, right: 0, bottom: 0, left: 0}}};
	}
	var tile = $scope.tiles[x+','+y+','+z];

	// Current "score" for this tile
	var current = 0;
	// Max "score" for this tile. Score is added 1 for every passed mission
	var possible = 0;
	


	if(cell.tile.speedbump){
	    possible++;
	    if(tile.scoredItems.speedbump){
		current++;
	    }
	}
	if(cell.tile.checkpoint){
	    possible++;
	    if(tile.scoredItems.checkpoint){
		current++;
	    }
	}
	if(cell.tile.rampBottom){
	    possible++;
	    if(tile.scoredItems.rampBottom){
		current++;
	    }
	}
	if(cell.tile.rampTop){
	    possible++;
	    if(tile.scoredItems.rampTop){
		current++;
	    }
	}
	switch(cell.tile.victims.top){
	case 'Heated':
	    possible++;
	    current += tile.scoredItems.victims.top || tile.scoredItems.rescueKits.top>0;
	    possible++;
	    current += (tile.scoredItems.rescueKits.top >= 1);
	    break;
	case 'H':
	    possible++;
	    current += tile.scoredItems.victims.top || tile.scoredItems.rescueKits.top>0;
	    possible++;
	    current += (tile.scoredItems.rescueKits.top >= 2);
	    break;
	case 'S':
	    possible++;
	    current += tile.scoredItems.victims.top || tile.scoredItems.rescueKits.top>0;
	    possible++;
	    current += (tile.scoredItems.rescueKits.top >= 1);
	    break;
	case 'U':
	    possible++;
	    current += tile.scoredItems.victims.top || tile.scoredItems.rescueKits.top>0;
	    break;
	}
	switch(cell.tile.victims.right){
	case 'Heated':
	    possible++;
	    current += tile.scoredItems.victims.right || tile.scoredItems.rescueKits.right>0;
	    possible++;
	    current += (tile.scoredItems.rescueKits.right >= 1);
	    break;
	case 'H':
	    possible++;
	    current += tile.scoredItems.victims.right || tile.scoredItems.rescueKits.right>0;
	    possible++;
	    current += (tile.scoredItems.rescueKits.right >= 2);
	    break;
	case 'S':
	    possible++;
	    current += tile.scoredItems.victims.right || tile.scoredItems.rescueKits.right>0;
	    possible++;
	    current += (tile.scoredItems.rescueKits.right >= 1);
	    break;
	case 'U':
	    possible++;
	    current += tile.scoredItems.victims.right || tile.scoredItems.rescueKits.right>0;
	    break;
	}
	switch(cell.tile.victims.bottom){
	case 'Heated':
	    possible++;
	    current += tile.scoredItems.victims.bottom || tile.scoredItems.rescueKits.bottom>0;
	    possible++;
	    current += (tile.scoredItems.rescueKits.bottom >= 1);
	    break;
	case 'H':
	    possible++;
	    current += tile.scoredItems.victims.bottom || tile.scoredItems.rescueKits.bottom>0;
	    possible++;
	    current += (tile.scoredItems.rescueKits.bottom >= 2);
	    break;
	case 'S':
	    possible++;
	    current += tile.scoredItems.victims.bottom || tile.scoredItems.rescueKits.bottom>0;
	    possible++;
	    current += (tile.scoredItems.rescueKits.bottom >= 1);
	    break;
	case 'U':
	    possible++;
	    current += tile.scoredItems.victims.bottom || tile.scoredItems.rescueKits.bottom>0;
	    break;
	}
	switch(cell.tile.victims.left){
	case 'Heated':
	    possible++;
	    current += tile.scoredItems.victims.left || tile.scoredItems.rescueKits.left>0;
	    possible++;
	    current += (tile.scoredItems.rescueKits.left >= 1);
	    break;
	case 'H':
	    possible++;
	    current += tile.scoredItems.victims.left || tile.scoredItems.rescueKits.left>0;
	    possible++;
	    current += (tile.scoredItems.rescueKits.left >= 2);
	    break;
	case 'S':
	    possible++;
	    current += tile.scoredItems.victims.left || tile.scoredItems.rescueKits.left>0;
	    possible++;
	    current += (tile.scoredItems.rescueKits.left >= 1);
	    break;
	case 'U':
	    possible++;
	    current += tile.scoredItems.victims.left || tile.scoredItems.rescueKits.left>0;
	    break;
	}

	
	if(current > 0 && current == possible)
            return "done";
        else if(current > 0)
            return "halfdone";
        else if(possible > 0)
            return "undone";
        else
            return "";
    }


    
    $scope.cellClick = function(x,y,z,isWall,isTile){
	var cell = $scope.cells[x+','+y+','+z];
	if(!cell)
	    return;
	if(!isTile)
	    return;


	if(!$scope.tiles[x+','+y+','+z]){
	    $scope.tiles[x+','+y+','+z] = {scoredItems: {speedbump: false, checkpoint: false, rampBottom: false, rampTop: false, victims: {top: false, right: false, left: false, bottom: false}, rescueKits: {top: 0, right: 0, bottom: 0, left: 0}}};
	}
	var tile = $scope.tiles[x+','+y+','+z];

	var hasVictims = (cell.tile.victims.top != "None") ||
	    (cell.tile.victims.right != "None") ||
	    (cell.tile.victims.bottom != "None") ||
	    (cell.tile.victims.left != "None");

	// Total number of scorable things on this tile
	var total = cell.tile.speedbump +
	    cell.tile.checkpoint +
	    cell.tile.rampBottom +
	    cell.tile.rampTop +
	    hasVictims;
	console.log("totalt antal saker", total);
	console.log("Has victims", hasVictims);

	if(total == 1 && !hasVictims){
	    if(cell.tile.speedbump){
		tile.scoredItems.speedbump = !tile.scoredItems.speedbump;
	    }
	    if(cell.tile.checkpoint){
		tile.scoredItems.checkpoint = !tile.scoredItems.checkpoint;
	    }
	    if(cell.tile.rampBottom){
		tile.scoredItems.rampBottom = !tile.scoredItems.rampBottom;
	    }
	    if(cell.tile.rampTop){
		tile.scoredItems.rampTop = !tile.scoredItems.rampTop;
	    }
	}else if(total > 1 || hasVictims){
	    // Open modal for multi-select
	    $scope.open(x,y,z);
	}
	var httpdata = {tiles: {[x+','+y+','+z]: tile}};
	console.log(httpdata);
        $http.put("/api/runs/maze/"+runId, httpdata).then(function(response){
            $scope.score = response.data.score;
        }, function(response){
            console.log("Error: " + response.statusText);
        });
    }

    $scope.open = function(x,y,z) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: '/templates/maze_judge_modal.html',
            controller: 'ModalInstanceCtrl',
            size: 'sm',
            resolve: {
                cell: function() {
                    return $scope.cells[x+','+y+','+z];
                },
		tile: function() {
                    return $scope.tiles[x+','+y+','+z];
                }
            }
        }).closed.then(function(result){
	    var httpdata = {tiles: {[x+','+y+','+z]: $scope.tiles[x+','+y+','+z]}};
	    console.log(httpdata);
            $http.put("/api/runs/maze/"+runId, httpdata).then(function(response){
                $scope.score = response.data.score;
            }, function(response){
                console.log("Error: " + response.statusText);
            });
        });
    };

    $scope.saveEverything = function(){
        var run = {}
	run.exitBonus = $scope.exitBonus;
	run.LoPs = $scope.LoPs;
	
	// Scoring elements of the tiles
        run.tiles = $scope.tiles;

	run.time = {minutes: $scope.minutes, seconds: $scope.seconds};

	console.log("Update run", run);
        $http.put("/api/runs/maze/"+runId, run).then(function(response){
            $scope.score = response.data.score;
	    console.log("Run updated, got score: ", $scope.score);
        }, function(response){
            console.log("Error: " + response.statusText);
        });
    };

    $scope.sign = function(){
        var run = {}
	run.exitBonus = $scope.exitBonus;
	run.LoPs = $scope.LoPs;
	
	// Scoring elements of the tiles
        run.tiles = $scope.tiles;

        // Verified time by timekeeper
        run.time = {};
        run.time.minutes = $scope.minutes;;
        run.time.seconds = $scope.seconds;
	console.log(run);
        $http.put("/api/runs/maze/"+runId, run).then(function(response){
            $scope.score = response.data.score;
            alert("Run signed");
        }, function(response){
            console.log("Error: " + response.statusText);
        });
    };

}]);


// Please note that $uibModalInstance represents a modal window (instance) dependency.
// It is not the same as the $uibModal service used above.

app.controller('ModalInstanceCtrl', function ($scope, $uibModalInstance, cell, tile) {
    $scope.cell = cell;
    $scope.tile = tile;
    $scope.hasVictims = (cell.tile.victims.top != "None") ||
	(cell.tile.victims.right != "None") ||
	(cell.tile.victims.bottom != "None") ||
	(cell.tile.victims.left != "None");

    $scope.ok = function () {
        $uibModalInstance.close();
    };
});