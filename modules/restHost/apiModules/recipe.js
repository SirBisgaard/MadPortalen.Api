/*
 * Recipe API module.
 */
var fs = require('fs');

var apiConfig = {};

var cacheHandler = require('./../handlers/cacheHandler.js');

var recipeRepository = require('./../dataAccess/repository/recipeRepository.js').repo;
var userRepository = require('./../dataAccess/repository/userRepository.js').repo;
var handler;

/*
 * 
 */
exports.load = function (expressHandler, config) {
    handler = expressHandler;
    apiConfig = config;
    recipeModule.load();
};

/*
 *
 */

var recipeModule = {
    load: function () {
        
        handler.register(
            handler.GET, 
            '/recipe', 
            true, 
            function (request, response) {
                // Search query
                var query = {};
                
                if (request.query.data) {
                    // Translate query string to JSON.
                    var recipe = JSON.parse(request.query.data);
                    
                    if (recipe.name) {
                        query.name = {
                            $regex: ".*" + recipe.name + ".*"
                        }
                    }
                    
                    if (recipe.dishType) {
                        query.dishType = recipe.dishType
                    }
                    if (recipe.difficulty) {
                        query.difficulty = recipe.difficulty
                    }
                    if (recipe.serves) {
                        query.serves = recipe.serves
                    }
                    if (recipe.createdBy) {
                        query.createdBy = recipe.createdBy
                    }
                    if (recipe.ingredients) {
                        if (recipe.ingredients.length > 0) {
                            // The $all, means that the search have to match all items in array.
                            query.ingredients = { $all: [] };
                            
                            for (var i = 0; i < recipe.ingredients.length; i++) {
                                
                                var element = {
                                    $elemMatch: {
                                        ingredient: recipeRepository.toID(recipe.ingredients[i].ingredient.id)
                                    }
                                };
                                if (recipe.ingredients[i].amount > 0) {
                                    element.$elemMatch.amount = { $lte: recipe.ingredients[i].amount };
                                }
                                
                                query.ingredients.$all.push(element);
                            };
                        }
                    }
                }
                
                var key = cacheHandler.generateKey(['recipe:*']);
                if (Object.keys(query).length === 0 && JSON.stringify(query) === JSON.stringify({})) {
                    var cacheObject = cacheHandler.get(key);
                    if (cacheObject) {
                        response.send(cacheObject);
                        console.log('         - Item was cached.');
                        return;
                    }
                }
                
                // Get recipes.
                recipeRepository.getAll(query, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var data = result.data;
                    
                    // Insert into cache.
                    if (Object.keys(query).length === 0 && JSON.stringify(query) === JSON.stringify({})) {
                        
                        cacheHandler.add(key, data, apiConfig.ttl.recipe);
                    }
                    // Send recipes.
                    response.status(200).send(data);
                });
            });
        
        handler.register(
            handler.POST, 
            '/recipe', 
            true, 
            function (request, response, user) {
                // Create boolean that contains if the data is there.
                var containsData = request.body.name && 
                    request.body.shortDescription && 
                    request.body.longDescription && 
                    request.body.serves && 
                    request.body.dishType && 
                    request.body.difficulty && 
                    request.body.ingredients;
                
                if (!containsData) {
                    response.status(400).send("Not all data is provided.");
                    return;
                }
                
                var data = request.body;
                data.createdBy = user.data.id;
                data.pictureLocation = '/pics/recipe/defaultRecipePic.png';
                
                var ingredients = [];
                if (request.body.ingredients) {
                    for (var i = 0; i < request.body.ingredients.length; i++) {
                        ingredients.push({
                            ingredient: request.body.ingredients[i].ingredient.id,
                            amount: request.body.ingredients[i].amount
                        });
                    };
                }
                data.ingredients = ingredients;
                
                // Create recipe.
                recipeRepository.create(data, function (result) {
                    if (!result.success) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var recipeId = result.data;
                    
                    // Remove recipe list from cache.
                    var listKey = cacheHandler.generateKey(['recipe:*']);
                    cacheHandler.remove(listKey);
                    
                    // Add to user cookbook.
                    // Get user.
                    userRepository.get(user.data.id, function (result) {
                        if (!result.success && !result.data) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        // Change user.
                        result.data.cookbook.recipes.push(recipeId);
                        
                        // Update user
                        userRepository.update(result.data, function (result) {
                            if (!result.success) {
                                response.status(400).send(result.error.message);
                                return;
                            }
                            
                            var cookbookKey = cacheHandler.generateKey(["user:cookbook:", user.data.id]);
                            cacheHandler.remove(cookbookKey);
                            
                            response.status(200).send({ id: recipeId });
                        });
                    });
                });
            });
        
        handler.register(
            handler.GET, 
            '/recipe/topRated',
            true, 
            function (request, response, user) {
                var key = cacheHandler.generateKey(['recipe:', 'TopRated']);
                var cacheObject = cacheHandler.get(key);
                if (cacheObject) {
                    response.send(cacheObject);
                    console.log('         - Item was cached.');
                    return;
                }
                
                // Get top rated recipes.
                recipeRepository.getTopRated(function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var data = result.data;
                    
                    data.sort(function (a, b) {
                        if (a.rating < b.rating)
                            return 1;
                        else if (a.rating > b.rating)
                            return -1;
                        else
                            return 0;
                    });
                    
                    // Cache recipes.
                    cacheHandler.add(key, data, apiConfig.ttl.recipelist);
                    
                    // Send recipes.
                    response.status(200).send(data);
                });
            });
        
        handler.register(
            handler.GET, 
            '/recipe/:id', 
            true, 
            function (request, response) {
                var key = cacheHandler.generateKey(["recipe:", request.params.id]);
                var cacheObject = cacheHandler.get(key);
                if (cacheObject) {
                    response.status(200).send(cacheObject);
                    console.log('         - Item was cached.');
                    return;
                }
                
                // Get recipe.
                recipeRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var data = result.data;
                    
                    // Insert into cache.
                    cacheHandler.add(key, data, apiConfig.ttl.recipe);
                    
                    // Send recipe.
                    response.status(200).send(data);
                });
            });
        
        
        handler.register(
            handler.PATCH, 
            '/recipe/:id', 
            true, 
            function (request, response, user) {
                // Create boolean that contains if the data is there.
                var containsData = request.body.name && 
                    request.body.shortDescription && 
                    request.body.longDescription && 
                    request.body.serves && 
                    request.body.dishType && 
                    request.body.difficulty && 
                    request.body.ingredients;
                
                if (!containsData) {
                    response.status(400).send("Not all data is provided.");
                    return;
                }
                
                // Get recipe.
                recipeRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var recipe = result.data;
                    
                    // validate access.
                    if (recipe.createdBy.id != user.data.id) {
                        response.status(401).send("You do not have access.");
                        return;
                    }
                    
                    // Change recipe data.
                    recipe.name = request.body.name;
                    recipe.pictureLocation = request.body.pictureLocation;
                    recipe.shortDescription = request.body.shortDescription;
                    recipe.longDescription = request.body.longDescription;
                    recipe.serves = request.body.serves;
                    recipe.dishType = request.body.dishType;
                    recipe.difficulty = request.body.difficulty;
                    recipe.ingredients = [];
                    
                    for (var i = 0; i < request.body.ingredients.length; i++) {
                        recipe.ingredients.push({
                            ingredient: request.body.ingredients[i].ingredient.id,
                            amount: request.body.ingredients[i].amount
                        });
                    };
                    
                    // Update recipe.
                    recipeRepository.update(recipe, function (result) {
                        if (!result.success) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        // Remove recipe and recipe lists from cache.
                        var key = cacheHandler.generateKey(['recipe:', request.params.id]);
                        cacheHandler.remove(key);
                        
                        var listKey = cacheHandler.generateKey(['recipe:*']);
                        cacheHandler.remove(listKey);
                        
                        var topRatedKey = cacheHandler.generateKey(['recipe:', 'TopRated']);
                        cacheHandler.remove(topRatedKey);
                        
                        response.sendStatus(200);
                    });
                });
            });
        
        handler.register(
            handler.DELETE, 
            '/recipe/:id',
            true, 
            function (request, response, user) {
                // Get recipe.
                recipeRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var recipe = result.data;
                    
                    // validate access.
                    if (recipe.createdBy.id != user.data.id) {
                        response.status(401).send("You do not have access.");
                        return;
                    }
                    try {
                        fs.unlinkSync(apiConfig.uploadPath + recipe.id + '.jpg');
                    } catch (error) {

                    }
                    
                    // TODO: delete from user cookbook.
                    
                    // Delete recipe.
                    recipeRepository.delete(request.params.id, function (result) {
                        if (!result.success) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        
                        // Remove recipe and recipe lists from cache.
                        var key = cacheHandler.generateKey(['recipe:', request.params.id]);
                        cacheHandler.remove(key);
                        
                        var userCookbookKey = cacheHandler.generateKey(["user:cookbook:", user.data.id]);
                        cacheHandler.remove(userCookbookKey);
                        
                        var listKey = cacheHandler.generateKey(['recipe:*']);
                        cacheHandler.remove(listKey);
                        
                        var topFollowedKey = cacheHandler.generateKey(['user:', 'TopFollowed']);
                        cacheHandler.remove(topFollowedKey);
                        
                        var topRatedKey = cacheHandler.generateKey(['recipe:', 'TopRated']);
                        cacheHandler.remove(topRatedKey);
                        
                        response.sendStatus(200);
                    });
                });
            });
        
        handler.register(
            handler.POST, 
            '/recipe/:id/recipePicture',
            true, 
            function (request, response, user) {
                // Check if there is any files.
                if (!request.files) {
                    response.status(400).send('No files were uploaded.');
                    return;
                }
                
                // Get recipe.
                recipeRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var recipe = result.data;
                    
                    // validate access.
                    if (recipe.createdBy.id != user.data.id) {
                        response.status(401).send("You do not have access.");
                        return;
                    }
                    
                    var recipePicture = request.files.file;
                    // Move the posted file to the upload path.
                    recipePicture.mv(apiConfig.uploadPath + recipe.id + '.jpg', function (err) {
                        if (err) {
                            response.sendStatus(500);
                            return;
                        }
                        
                        recipe.pictureLocation = '/pics/recipe/' + request.params.id + '.jpg';
                        
                        // Update user.
                        recipeRepository.update(recipe, function (result) {
                            if (!result.success) {
                                response.status(400).send(result.error.message);
                                return;
                            }
                            // Remove recipe and recipe lists from cache.
                            var key = cacheHandler.generateKey(['recipe:', request.params.id]);
                            cacheHandler.remove(key);
                            
                            var listKey = cacheHandler.generateKey(['recipe:*']);
                            cacheHandler.remove(listKey);
                            
                            var topRatedKey = cacheHandler.generateKey(['recipe:', 'TopRated']);
                            cacheHandler.remove(topRatedKey);
                            
                            response.sendStatus(200);
                        });
                    });
                });
            });
        
        
        handler.register(
            handler.PUT, 
            '/recipe/:id/rate',
            true, 
            function (request, response, user) {
                // Create boolean that contains if the data is there.
                var containsData = request.body.rating;
                
                if (!containsData) {
                    response.status(400).send("Not all data is provided.");
                    return;
                }
                // Get recipe.
                recipeRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var recipe = result.data;
                    
                    var changed = false;
                    // Find old rating.
                    for (var i = 0; i < recipe.ratings.length; i++) {
                        var tempRating = recipe.ratings[i]
                        if (tempRating.createdBy == user.data.id) {
                            tempRating.rating = request.body.rating;
                            createdTime = Date.now();
                            changed = true;
                            break;
                        }
                    };
                    if (!changed) {
                        // Insert new rating.
                        recipe.ratings.push({
                            rating: request.body.rating,
                            createdBy: user.data.id,
                            createdTime: Date.now()
                        });
                    }
                    
                    // Update recipe.
                    recipeRepository.update(recipe, function (result) {
                        if (!result.success && !result.data) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        // Cache the recipe.
                        var key = cacheHandler.generateKey(['recipe:', request.params.id]);
                        cacheHandler.remove(key);
                        
                        var listKey = cacheHandler.generateKey(['recipe:*']);
                        cacheHandler.remove(listKey);
                        
                        var topRatedKey = cacheHandler.generateKey(['recipe:', 'TopRated']);
                        cacheHandler.remove(topRatedKey);
                        
                        response.sendStatus(200);
                    });
                });
            });
    }
};