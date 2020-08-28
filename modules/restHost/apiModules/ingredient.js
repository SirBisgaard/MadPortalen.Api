/*
 * Ingredient API module.
 */

var apiConfig = {};

var cacheHandler = require('./../handlers/cacheHandler.js');

var ingredientRepository = require('./../dataAccess/repository/ingredientRepository.js').repo;
var handler;

/*
 * 
 */
exports.load = function (expressHandler, config) {
    handler = expressHandler;
    apiConfig = config;
    ingredientModule.load();
};

/*
 * 
 */
var ingredientModule = {
    load: function () {
        
        handler.register(
            handler.GET,
            '/ingredient',
            true,
            function (request, response) {

                var query = {};
                if (request.query.data) {
                    var ingredient = JSON.parse(request.query.data);
                    
                    if (ingredient.name) {
                        query.name = {
                            $regex: ".*" + ingredient.name.toLowerCase() + ".*"
                        }
                    }
                }

                // Get ingredients.
                ingredientRepository.getAll(query, function (result) {
                    if (result.success && result.data) {
                        var data = result.data;

                        // Send ingredients.
                        response.status(200).send(data);
                    }
                    else {
                        response.status(400).send(result.error.message);
                    }
                });
            });
        
        handler.register(
            handler.POST,
            '/ingredient',
            true,
            function (request, response) {
                // Create boolean that contains if the data is there.
                var containsData = request.body.name && 
                    request.body.unitType;
                
                if (!containsData) {
                    response.status(400).send("Not all data is provided.");
                    return;
                }
                
                // Create recipe.
                ingredientRepository.create(request.body, function (result) {
                    if (result.success) {

                        response.sendStatus(200);
                    }
                    else {
                        response.status(400).send(result.error.message);
                    }
                });
            });
    }
};