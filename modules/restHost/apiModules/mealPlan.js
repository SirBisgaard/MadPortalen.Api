/*
 * Recipe API module.
 */
var apiConfig = {};

var cacheHandler = require('./../handlers/cacheHandler.js');

var recipeRepository = require('./../dataAccess/repository/recipeRepository.js').repo;
var userRepository = require('./../dataAccess/repository/userRepository.js').repo;
var mealPlanRepository = require('./../dataAccess/repository/mealPlanRepository.js').repo;

var handler;

/*
 * 
 */
exports.load = function (expressHandler, config) {
    handler = expressHandler;
    apiConfig = config;
    mealPlanModule.load();
};


var mealPlanModule = {
    load: function () {
        
        handler.register(
            handler.GET,
            '/mealPlan',
            true,
            function (request, response, user) {
                var query = {};
                
                if (request.query.data) {
                    // Translate query string to JSON.
                    var mealPlan = JSON.parse(request.query.data);
                    
                    if (mealPlan.createdBy) {
                        query.createdBy = mealPlan.createdBy
                    }
                }
                
                var listKey = cacheHandler.generateKey(['mealPlan:*']);
                if (Object.keys(query).length === 0 && JSON.stringify(query) === JSON.stringify({})) {

                    var cacheObject = cacheHandler.get(listKey);
                    if (cacheObject) {
                        response.send(cacheObject);
                        console.log('         - Item was cached.');
                        return;
                    }
                }
                
                // Get meal plans.
                mealPlanRepository.getAll(query, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var mealPlans = result.data;
                    if (Object.keys(query).length === 0 && JSON.stringify(query) === JSON.stringify({})) {

                        cacheHandler.add(listKey, mealPlans, apiConfig.ttl.mealPlanList);
                    }
                    response.status(200).send(mealPlans);
                });
            });
        
        handler.register(
            handler.POST,
            '/mealPlan',
            true,
            function (request, response, user) {
                // Create boolean that contains if the data is there.
                var containsData = request.body.title && 
                    request.body.description && 
                    request.body.days;
                
                if (!containsData) {
                    response.status(400).send("Not all data is provided.");
                    return;
                }
                
                var data = request.body;
                data.createdBy = user.data.id;
                
                // Create recipe.
                mealPlanRepository.create(data, function (result) {
                    if (!result.success) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var mealPlanID = result.data;
                    
                    // Remove recipe list from cache.
                    var listKey = cacheHandler.generateKey(['mealPlan:*']);
                    cacheHandler.remove(listKey);
                    
                    // Add to user cookbook.
                    // Get user.
                    userRepository.get(user.data.id, function (result) {
                        if (!result.success && !result.data) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        // Change user.
                        result.data.cookbook.mealPlans.push(mealPlanID);
                        
                        // Update user
                        userRepository.update(result.data, function (result) {
                            if (!result.success) {
                                response.status(400).send(result.error.message);
                                return;
                            }
                            
                            var cookbookKey = cacheHandler.generateKey(["user:cookbook:", user.data.id]);
                            cacheHandler.remove(cookbookKey);
                            
                            var topFollowedKey = cacheHandler.generateKey(['user:', 'TopFollowed']);
                            cacheHandler.remove(topFollowedKey);
                            
                            response.sendStatus(200);
                        });
                    });
                });
            });
        
        handler.register(
            handler.GET,
            '/mealPlan/:id',
            true,
            function (request, response) {
                var key = cacheHandler.generateKey(['mealPlan:', request.params.id]);
                var cacheObject = cacheHandler.get(key);
                if (cacheObject) {
                    response.send(cacheObject);
                    console.log('         - Item was cached.');
                    return;
                }
                
                // Get meal plan.
                mealPlanRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    
                    var mealPlan = result.data;
                    
                    // Get recipe ids.
                    var ids = [];
                    for (var i = 0; i < mealPlan.days.length; i++) {
                        ids = ids.concat(mealPlan.days[i].recipes);
                    };
                    
                    // Download recipes.
                    recipeRepository.getFromIds(ids, function (result) {
                        if (!result.success && !result.data) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        
                        var recipes = result.data;
                        
                        // Loop through every downloaded recipe.
                        for (var r = 0; r < recipes.length; r++) {
                            var recipe = recipes[r];
                            
                            // Loop through every day in meal plan.
                            for (var i = 0; i < mealPlan.days.length; i++) {
                                var day = mealPlan.days[i];
                                
                                // Loop through every recipe and replace it with the downloaded.
                                for (var j = 0; j < day.recipes.length; j++) {
                                    // if ids match replace with recipe.
                                    if (recipe.id.toString() == day.recipes[j].toString()) {
                                        day.recipes[j] = recipe;
                                    }
                                };
                            };
                        };
                        
                        // Clean up recipes that are no longer existing.
                        for (var i = 0; i < mealPlan.days.length; i++) {
                            var day = mealPlan.days[i];

                            // Loop through every recipe and remove the not loaded ones.
                            for (var j = 0; j < day.recipes.length; j++) {
                                var tempRecipe = JSON.parse(JSON.stringify(day.recipes[j]));

                                if (!tempRecipe.id) {
                                    day.recipes.splice(j, 1);
                                    j--;
                                }
                            };

                            mealPlan.days[i] = day;
                        };
                        
                        cacheHandler.add(key, mealPlan, apiConfig.ttl.mealPlan);
                        
                        response.status(200).send(mealPlan);
                    });
                });
            });
        
        handler.register(
            handler.PATCH,
            '/mealPlan/:id',
            true,
            function (request, response, user) {
                // Create boolean that contains if the data is there.
                var containsData = request.body.title && 
                    request.body.description && 
                    request.body.days;
                
                if (!containsData) {
                    response.status(400).send("Not all data is provided.");
                    return;
                }
                
                // Get recipe.
                mealPlanRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var mealPlan = result.data;
                    
                    //see if createdBy is an object that has an id property, and replace it with id
                    if (mealPlan.createdBy.id) {
                        mealPlan.createdBy = mealPlan.createdBy.id;
                    }
                    // validate access.
                    if (mealPlan.createdBy != user.data.id) {
                        response.status(401).send("You do not have access.");
                        return;
                    }
                    
                    // Change recipe data.
                    mealPlan.title = request.body.title;
                    mealPlan.description = request.body.description;
                    mealPlan.days = request.body.days;
                    
                    for (var i = 0; i < mealPlan.days.length; i++) {
                        var day = mealPlan.days[i];
                        for (var j = 0; j < day.recipes.length; j++) {
                            if (day.recipes[j].id) {
                                day.recipes[j] = day.recipes[j].id;
                            }
                        }
                    }
                    
                    // Update recipe.
                    mealPlanRepository.update(mealPlan, function (result) {
                        if (!result.success) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        
                        // Remove recipe and recipe lists from cache.
                        var key = cacheHandler.generateKey(['mealPlan:', request.params.id]);
                        cacheHandler.remove(key);
                        
                        var listKey = cacheHandler.generateKey(['mealPlan:*']);
                        cacheHandler.remove(listKey);
                        
                        response.sendStatus(200);
                    });
                });
            });
        
        handler.register(
            handler.DELETE, 
            '/mealPlan/:id',
            true, 
            function (request, response, user) {
                // Get meal plan.
                mealPlanRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var mealPlan = result.data;
                    
                    // validate access.
                    if (mealPlan.createdBy.id != user.data.id) {
                        response.status(401).send("You do not have access.");
                        return;
                    }
                    
                    // TODO: delete from user cookbook.
                    
                    // Delete meal plan.
                    mealPlanRepository.delete(request.params.id, function (result) {
                        if (!result.success) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        
                        // Remove meal plan and meal plan lists from cache.
                        var key = cacheHandler.generateKey(['mealPlan:', request.params.id]);
                        cacheHandler.remove(key);

                        var userCookbookKey = cacheHandler.generateKey(["user:cookbook:", user.data.id]);
                        cacheHandler.remove(userCookbookKey);

                        var topFollowedKey = cacheHandler.generateKey(['user:', 'TopFollowed']);
                        cacheHandler.remove(topFollowedKey);

                        var listKey = cacheHandler.generateKey(['mealPlan:*']);
                        cacheHandler.remove(listKey);
                        
                        response.sendStatus(200);
                    });
                });
            });
    }
};