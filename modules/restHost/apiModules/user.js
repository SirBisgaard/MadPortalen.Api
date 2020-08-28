/*
 * User API module.
 */
var apiConfig = {};

var cacheHandler = require('./../handlers/cacheHandler.js');
var emailHandler = require('./../handlers/emailHandler.js');
var authenticationHandler = require('./../handlers/authenticationHandler.js');

var userRepository = require('./../dataAccess/repository/userRepository.js').repo;
var recipeRepository = require('./../dataAccess/repository/recipeRepository.js').repo;
var mealPlanRepository = require('./../dataAccess/repository/mealPlanRepository.js').repo;
var crypto = require('crypto');

var handler;

/*
 * 
 */
exports.load = function (expressHandler, config) {
    handler = expressHandler;
    apiConfig = config;
    userModule.load();
};

/*
 * 
 */
var userModule = {
    load: function () {
        
        handler.register(
            handler.POST, 
            '/user',
            false, 
            function (request, response, user) {
                // Create boolean that contains if the data is there.
                var containsData = request.body.email && 
                    request.body.password && 
                    request.body.firstName && 
                    request.body.lastName && 
                    request.body.authorName;
                
                if (!containsData) {
                    response.status(400).send("Not all data is provided.");
                    return;
                }
                
                var data = request.body;
                data.pictureLocation = "/pics/user/defaultProfilePic.png";

                // Create user if the data is there.
                userRepository.create(data, function (result) {
                    if (!result.success) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    // Send confirmation mail.
                    var token = authenticationHandler.createToken({ id: result.data });
                    emailHandler.sendConfirmationMail(token, request.body.email, request.body.firstName)
                    
                    response.status(201).send(result.data);
                });
            });
        
        handler.register(
            handler.GET, 
            '/user/topFollowed',
            true, 
            function (request, response, user) {
                var key = cacheHandler.generateKey(['user:', 'TopFollowed']);
                var cacheObject = cacheHandler.get(key);
                if (cacheObject) {
                    response.send(cacheObject);
                    console.log('         - Item was cached.');
                    return;
                }
                
                // Get top rated recipes.
                userRepository.getTopFollowed(function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    var users = result.data || [];
                    var mealPlans = [];
                    var recipes = [];
                
                    // Get all meal plans and recipes from users.
                    for (var i = 0; i < users.length; i++) {
                        var userCookbook = users[i].cookbook;
                        
                        // Loop trough meal plans.
                        for (var j = 0; j < userCookbook.mealPlans.length; j++) {
                            // Check if exist in array.
                            if (mealPlans.indexOf(userCookbook.mealPlans[j]) == -1) {
                                // Add id to meal plans
                                mealPlans.push(userCookbook.mealPlans[j]);
                            }
                        };
                        
                        // Loop trough recipes.
                        for (var j = 0; j < userCookbook.recipes.length; j++) {
                            // Check if exist in array.
                            if (recipes.indexOf(userCookbook.recipes[j]) == -1) {
                                // Add id to meal plans
                                recipes.push(userCookbook.recipes[j]);
                            }
                        };
                    };
                    
                    
                    // Get meal plans.
                    mealPlanRepository.getFromIds(mealPlans, function (result) {
                        if (!result.success && !result.data) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        
                        // Override ids with real data.
                        mealPlans = result.data;
                        
                        // Get recipes.
                        recipeRepository.getFromIds(recipes, function (result) {
                            if (!result.success && !result.data) {
                                response.status(400).send(result.error.message);
                                return;
                            }
                            
                            // Override ids with real data.
                            recipes = result.data;
                            
                            // Map meal plans and recipes.
                            // ONLY meal plans and recipes where the user has created it.
                            for (var j = 0; j < users.length; j++) {
                                var userRecipes = users[j].cookbook.recipes;
                                var userMealPlans = users[j].cookbook.mealPlans;
                                users[j].cookbook.recipes = [];
                                users[j].cookbook.mealPlans = [];
                                
                                // Map recipes to user.
                                for (var i = 0; i < recipes.length; i++) {
                                    var recipe = recipes[i];
                                    
                                    // Check if recipe is in user cookbook
                                    if (userRecipes.indexOf(recipe.id) > -1) {
                                        // Check if the user has created the recipe
                                        if (recipe.createdBy.id == users[j].id) {
                                            // Add recipe to cookbook.
                                            users[j].cookbook.recipes.push(recipe);
                                        }
                                    }
                                };
                                
                                // Map meal plans to user.
                                for (var i = 0; i < mealPlans.length; i++) {
                                    var mealPlan = mealPlans[i];
                                    
                                    // Check if recipe is in user cookbook
                                    if (userMealPlans.indexOf(mealPlan.id) > -1) {
                                        // Check if the user has created the recipe
                                        if (mealPlan.createdBy.id == users[j].id) {
                                            // Add recipe to cookbook.
                                            users[j].cookbook.mealPlans.push(mealPlan);
                                        }
                                    }
                                };
                            };
                            
                            var userIds = [];
                            // Fill user ids.
                            for (var i = 0; i < users.length; i++) {
                                userIds.push(users[i].id);
                                
                                // Create followers field.
                                // This is needed when mapping followers.
                                users[i].followers = [];
                            };
                            
                            // Get followers.
                            userRepository.getFollowersFromIds(userIds, function (result) {
                                if (!result.success && !result.data) {
                                    response.status(400).send(result.error.message);
                                    return;
                                }
                                
                                var followers = result.data;
                                // Map followers to users.
                                for (var i = 0; i < followers.length; i++) {
                                    var follow = followers[i];
                                    
                                    for (var j = 0; j < users.length; j++) {
                                        if (users[j].id == follow.followed) {
                                            // Add follow to user and break;
                                            users[j].followers.push(follow.follower);
                                            break;
                                        }
                                    };
                                };
                                
                                users.sort(function (a, b) {
                                    if (a.followers.length < b.followers.length)
                                        return 1;
                                    else if (a.followers.length > b.followers.length)
                                        return -1;
                                    else
                                        return 0;
                                });
                                
                                // Cache recipes.
                                cacheHandler.add(key, users, apiConfig.ttl.recipelist);
                                
                                // Send users.
                                response.status(200).send(users);
                            });
                        });
                    });
                });
            });
        
        handler.register(
            handler.PATCH,
            '/user/activateEmail',
            true,
            function (request, response, user) {
                // Activate user email.
                // Get user.
                userRepository.get(user.data.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    // Change user.
                    result.data.emailIsActivated = true;
                    
                    // Update user
                    userRepository.update(result.data, function (result) {
                        if (!result.success) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        
                        response.sendStatus(201);
                    });
                });
            });
        
        handler.register(
            handler.POST,
            '/user/resetPassword',
            false,
            function (request, response, user) {
                // See if the data is there.
                if (!request.body.email) {
                    response.status(400).send("Not all data is provided.");
                    return;
                }
                
                // Find user.
                userRepository.getFromEmail(request.body.email.toLowerCase(), function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    
                    // Create token and send reset password mail.
                    var token = authenticationHandler.createToken({ id: result.data.id });
                    emailHandler.sendEmail(token, result.data.email, result.data.firstName);
                    
                    response.sendStatus(201);
                });
            });
        
        handler.register(
            handler.PATCH,
            '/user/resetPassword/',
            true,
            function (request, response, user) {
                
                // See if the data is there.
                if (!request.body.password) {
                    response.status(400).send("Not all data is provided.");
                    return;
                }
                
                // Get user.
                userRepository.get(user.data.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    // Change user.
                    result.data.password = crypto.createHmac('sha256', '').update(request.body.password).digest('hex');
                    
                    // Update user
                    userRepository.update(result.data, function (result) {
                        if (!result.success) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        response.sendStatus(200);
                    });
                });
            });
        
        handler.register(
            handler.GET, 
            '/user/:id',
            true, 
            function (request, response, user) {
                
                var key = cacheHandler.generateKey(["user:", request.params.id]);
                var cacheObject = cacheHandler.get(key);
                if (cacheObject) {
                    response.status(200).send(cacheObject);
                    console.log('         - Item was cached.');
                    return;
                }
                
                // Get user.
                userRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    
                    var data = result.data.toPublic();
                    
                    // Insert into cache.
                    cacheHandler.add(key, data, apiConfig.ttl.user);
                    
                    // Send user.
                    response.status(200).send(data);
                });
            });
        
        handler.register(
            handler.PATCH, 
            '/user/:id',
            true, 
            function (request, response, user) {
                
                // validate access.
                if (request.params.id != user.data.id) {
                    response.status(401).send("You do not have access.");
                    return;
                }
                
                // Create boolean that contains if the data is there.
                var containsData = request.body.firstName && 
                    request.body.lastName && 
                    request.body.authorName;
                
                if (!containsData) {
                    response.status(400).send("Not all data is provided.");
                    return;
                }
                
                
                // Get user.
                userRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    // Change user data.
                    var data = result.data;
                    data.firstName = request.body.firstName;
                    data.lastName = request.body.lastName;
                    data.authorName = request.body.authorName;
                    data.description = request.body.description || "";
                    
                    // Update user.
                    userRepository.update(data, function (result) {
                        if (!result.success) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        var key = cacheHandler.generateKey(['user:', request.params.id]);
                        cacheHandler.add(key, data.toPublic(), apiConfig.ttl.user);
                        
                        var topFollowedKey = cacheHandler.generateKey(['user:', 'TopFollowed']);
                        cacheHandler.remove(topFollowedKey);

                        // Send user.
                        response.sendStatus(200);
                    });
                });
            });
        
        handler.register(
            handler.POST, 
            '/user/:id/profilePicture',
            true, 
            function (request, response, user) {
                // validate access. 
                if (request.params.id != user.data.id) {
                    response.status(401).send("You do not have access.");
                    return;
                }
                
                // Check if there is any files.
                if (!request.files) {
                    response.status(400).send('No files were uploaded.');
                    return;
                }
                
                
                var profilePicture = request.files.file;
                // Move the posted file to the upload path.
                profilePicture.mv(apiConfig.uploadPath + request.params.id + '.jpg', function (error) {
                    if (error) {
                        response.sendStatus(500);
                        return;
                    }
                    
                    // Get user.
                    userRepository.get(request.params.id, function (result) {
                        if (!result.success && !result.data) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        // Change user data.
                        var data = result.data;
                        data.pictureLocation = '/pics/user/' + request.params.id + '.jpg';
                        
                        // Update user.
                        userRepository.update(data, function (result) {
                            
                            if (!result.success && !result.data) {
                                response.status(400).send(result.error.message);
                                return;
                            }
                            
                            // Cache user again.
                            var key = cacheHandler.generateKey(['user:', request.params.id]);
                            cacheHandler.add(key, data.toPublic(), apiConfig.ttl.user);
                            
                            // Send user.
                            response.sendStatus(200);
                        });
                    });
                });
            });
        
        handler.register(
            handler.POST, 
            '/user/:id/follow',
            true, 
            function (request, response, requestUser) {
                // Get user to check if exist.
                userRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    
                    // Create follow.
                    userRepository.createFollow(requestUser.data.id, result.data.id, function (result) {
                        if (!result.success) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        
                        var key = cacheHandler.generateKey(['user:', request.params.id]);
                        cacheHandler.remove(key);

                        var topFollowedKey = cacheHandler.generateKey(['user:', 'TopFollowed']);
                        cacheHandler.remove(topFollowedKey);

                        response.sendStatus(200);
                    });
                });
            });
        
        handler.register(
            handler.DELETE, 
            '/user/:id/follow',
            true, 
            function (request, response, requestUser) {
                // Get user to check if exist.
                userRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    
                    // Create follow.
                    userRepository.deleteFollow(requestUser.data.id, result.data.id, function (result) {
                        if (!result.success) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        
                        var key = cacheHandler.generateKey(['user:', request.params.id]);
                        cacheHandler.remove(key);

                        var topFollowedKey = cacheHandler.generateKey(['user:', 'TopFollowed']);
                        cacheHandler.remove(topFollowedKey);

                        response.sendStatus(200);
                    });
                });
            });
        
        handler.register(
            handler.GET, 
            '/user/:id/cookbook',
            true,
            function (request, response, user) {
                
                var key = cacheHandler.generateKey(["user:cookbook:", request.params.id]);
                var cacheObject = cacheHandler.get(key);
                if (cacheObject) {
                    response.status(200).send(cacheObject);
                    console.log('         - Item was cached.');
                    return;
                }
                
                // Get user.
                userRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    // Get cookbook.
                    var cookbook = result.data.cookbook;
                    
                    // Get meal plans.
                    mealPlanRepository.getFromIds(cookbook.mealPlans, function (result) {
                        if (!result.success && !result.data) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        
                        cookbook.mealPlans = result.data;
                        
                        // Get recipes.
                        recipeRepository.getFromIds(cookbook.recipes, function (result) {
                            if (!result.success && !result.data) {
                                response.status(400).send(result.error.message);
                                return;
                            }
                            
                            cookbook.recipes = result.data;
                            cacheHandler.add(key, cookbook, apiConfig.ttl.cookbook);
                            
                            response.status(200).send(cookbook);
                        });
                    });
                });
            });
        
        handler.register(
            handler.PUT, 
            '/user/:id/cookbook/:type/:tid',
            true, 
            function (request, response, user) {
                // validate access. 
                if (request.params.id != user.data.id) {
                    response.status(401).send("You do not have access.");
                    return;
                }
                
                // Get user.
                userRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    // Change user data.
                    var user = result.data;
                    
                    var cookbookTarget = [];
                    // Find the target array.
                    switch (request.params.type) {
                        case 'recipes':
                            cookbookTarget = user.cookbook.recipes || [];
                            break;

                        case 'mealPlans':
                            cookbookTarget = user.cookbook.mealPlans || [];
                            break;
                    }
                    
                    // Insert into cookbook if not exist.
                    var contains = false;
                    for (var i = 0; i < cookbookTarget.length; i++) {
                        if (cookbookTarget[i] == request.params.tid) {
                            contains = true;
                            break;
                        }
                    };
                    if (!contains) {
                        cookbookTarget.push(request.params.tid);
                    }
                    
                    // Update user.
                    userRepository.update(user, function (result) {
                        if (!result.success) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        
                        // Cache user with new data.
                        var key = cacheHandler.generateKey(['user:', request.params.id]);
                        cacheHandler.add(key, user.toPublic(), apiConfig.ttl.user);
                        
                        var cookbookKey = cacheHandler.generateKey(["user:cookbook:", request.params.id]);
                        cacheHandler.remove(cookbookKey);
                        
                        response.sendStatus(200);
                    });
                });
            });
        
        handler.register(
            handler.DELETE, 
            '/user/:id/cookbook/:type/:tid',
            true, 
            function (request, response, user) {
                // validate access.
                if (request.params.id != user.data.id) {
                    response.status(401).send("You do not have access.");
                    return;
                }
                
                // Get user.
                userRepository.get(request.params.id, function (result) {
                    if (!result.success && !result.data) {
                        response.status(400).send(result.error.message);
                        return;
                    }
                    // Change user data.
                    var user = result.data;
                    
                    var cookbookTarget = [];
                    var repoTarget;
                    // Find the target array and repository.
                    switch (request.params.type) {
                        case 'recipes':
                            cookbookTarget = user.cookbook.recipes || [];
                            repoTarget = recipeRepository;
                            break;

                        case 'mealPlans':
                            cookbookTarget = user.cookbook.mealPlans || [];
                            repoTarget = mealPlanRepository;
                            break;
                        default:
                            response.status(400).send("The request cannot be handled.");
                            return;
                    }
                    
                    // Get recipes from cookbook.
                    repoTarget.getFromIds(cookbookTarget, function (result) {
                        if (!result.success && !result.data) {
                            response.status(400).send(result.error.message);
                            return;
                        }
                        
                        var targetData = result.data;
                        
                        // Remove from cookbook if not exist.
                        for (var i = 0; i < targetData.length; i++) {
                            // The current recipe.
                            var data = targetData[i];
                            
                            // Match request id.
                            if (data.id.toString() == request.params.tid.toString()) {
                                if (data.createdBy.toString() == user.id.toString()) {
                                    response.status(401).send("You cannot remove you own " + request.params.type + ".");
                                    return;
                                }
                                
                                // Remove recipe id from user.
                                for (var j = 0; j < cookbookTarget.length; j++) {
                                    if (cookbookTarget[j].toString() == request.params.tid.toString()) {
                                        cookbookTarget.splice(j, 1);
                                        break;
                                    }
                                };
                                
                                break;
                            }
                        };
                        
                        // Update user.
                        userRepository.update(user, function (result) {
                            if (!result.success) {
                                response.status(400).send(result.error.message);
                                return;
                            }
                            
                            // Cache user with new data.
                            var key = cacheHandler.generateKey(['user:', request.params.id]);
                            cacheHandler.add(key, user.toPublic(), apiConfig.ttl.user);
                            
                            var cookbookKey = cacheHandler.generateKey(["user:cookbook:", request.params.id]);
                            cacheHandler.remove(cookbookKey);
                            
                            response.sendStatus(200);
                        });
                    });
                });
            });
    }
};