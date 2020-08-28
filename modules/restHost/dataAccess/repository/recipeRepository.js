var connection = require('./../database/mongooseConnection');

var userRepository = require('./userRepository.js').repo;

function handleError(error, callback) {
    callback({
        success: false,
        error: {
            message: error
        }
    });
}

function toDataObjects(recipes) {
    // Main list of data object.
    var listOfDataObjects = [];
    
    for (var i = 0; i < recipes.length; i++) {
        // Convert recipe to a data object.
        var dataObject = toDataObject(recipes[i]);
        
        // Add the object to the list.
        listOfDataObjects.push(dataObject);
    };
    
    return listOfDataObjects;
};

function toDataObject(recipe) {
    // Main data object.
    var dataObject = {
        id: recipe._id.toString(),
        name: recipe.name,
        pictureLocation: recipe.pictureLocation,
        shortDescription: recipe.shortDescription,
        longDescription: recipe.longDescription,
        serves: recipe.serves,
        dishType: recipe.dishType,
        difficulty: recipe.difficulty,
        ingredients: [],
        ratings: [],
        rating: 0,
        createdBy: recipe.createdBy,
        createdTime: recipe.createdTime
    };
    
    // Moving ingredients to recipe.
    if (recipe.ingredients) {
        for (var i = 0; i < recipe.ingredients.length; i++) {
            // Creating an ingredient object from recipe.
            var ingredient = {
                amount: recipe.ingredients[i].amount,
                ingredient: {
                    id: recipe.ingredients[i].ingredient._id,
                    name: recipe.ingredients[i].ingredient.name,
                    unitType: recipe.ingredients[i].ingredient.unitType
                }
            };
            
            // Add ingredient to list.
            dataObject.ingredients.push(ingredient);
        };
    }
    
    // Moving ratings to recipe.
    if (recipe.ratings) {
        var sum = 0;
        for (var i = 0; i < recipe.ratings.length; i++) {
            dataObject.ratings.push({
                rating: recipe.ratings[i].rating,
                createdBy: recipe.ratings[i].createdBy,
                createdTime: recipe.ratings[i].createdTime
            });
            sum += recipe.ratings[i].rating;
        };
        if (sum > 0) {
            dataObject.rating = sum / dataObject.ratings.length;
        }
    }
    
    /*
     * This method is not needed.
     * Because the recipes does not contain any sensitive data.
    // This method makes a non sensitive version of the object.
    dataObject.toPublic = function () {
        return dataObject;
    };
     */
    
    // Returning data object.
    return dataObject;
};


exports.repo = {
    toID: function (id) {
        return new connection.ObjectID(id);
    },
    
    get: function (id, callback) {
        // Connect.
        connection.connect();
        
        // Find a recipe from id.
        var Recipe = connection.Recipe;
        Recipe.findById(id).populate('ingredients.ingredient').exec(function (error, recipe) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            // Check if found a recipe.
            if (!recipe) {
                handleError("The recipe does not exist.", callback);
                return;
            }
            
            // Replace recipe created by with user.
            userRepository.getCreatedBy(toDataObject(recipe), function (result) {
                if (!result.success && !result.data) {
                    handleError(result.error.message, callback);
                    return;
                }
                
                callback({
                    success: true,
                    data: result.data
                });
            });
        });
    },
    
    getAll: function (query, callback) {
        // Connect.
        connection.connect();
        
        // Find a recipe from id.
        var Recipe = connection.Recipe;
        Recipe.find(query).limit(20).exec(function (error, recipes) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            // Replace recipes created by with users.
            userRepository.getCreatedBy(toDataObjects(recipes), function (result) {
                if (!result.success && !result.data) {
                    handleError(result.error.message, callback);
                    return;
                }
                
                callback({
                    success: true,
                    data: result.data
                });
            });
        });
    },
    
    getFromIds: function (ids, callback) {
        // Connect.
        connection.connect();
        
        // Find a user from email.
        var Recipe = connection.Recipe;
        Recipe.find({
            '_id': {
                $in: ids
            }
        }).populate('ingredients.ingredient').exec(function (error, recipes) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            // Replace recipes created by with users.
            userRepository.getCreatedBy(toDataObjects(recipes), function (result) {
                if (!result.success && !result.data) {
                    handleError(result.error.message, callback);
                    return;
                }
                
                callback({
                    success: true,
                    data: result.data
                });
            });
        });
    },
    
    getTopRated: function (callback) {
        // Connect.
        connection.connect();
        
        var Recipe = connection.Recipe;
        // Find top rated recipes.
        Recipe.aggregate([
            {
                '$unwind': '$ratings'
            },
            {
                '$group' : {
                    '_id' : '$_id',
                    'count': {
                        '$sum' : 1
                    },
                    'total': {
                        '$sum' : '$ratings.rating'
                    }
                }
            },
            {
                '$project' : {
                    '_id' : 1,
                    'rating': {
                        $divide: ['$total', '$count']
                    }
                }
            }]).sort({ rating: -1 }).limit(20).exec(function (error, result) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            // Get the ids from the result.
            var ids = [];
            for (var i = 0; i < result.length; i++) {
                ids.push(result[i]._id);
            };
            
            // Get recipes from ids.
            exports.repo.getFromIds(ids, function (result) {
                if (result.success && result.data) {
                    // return ids.
                    callback({
                        success: true,
                        data: result.data
                    });
                }
                else {
                    handleError(result.error.message, callback);
                }
            });
        });
    },
    
    create: function (data, callback) {
        // Connect.
        connection.connect();
        
        // Create recipe from data.
        var Recipe = connection.Recipe;
        var recipe = new Recipe({
            name: data.name,
            pictureLocation: data.pictureLocation,
            shortDescription: data.shortDescription,
            longDescription: data.longDescription,
            serves: data.serves,
            dishType: data.dishType,
            difficulty: data.difficulty,
            ingredients: data.ingredients,
            createdBy: data.createdBy,
            createdTime: Date.now()
        });
        
        // Save recipe.
        recipe.save(function (error) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            callback({
                success: true,
                data: recipe._id
            });
        });
    },
    
    update: function (data, callback) {
        // Connect.
        connection.connect();
        
        var Recipe = connection.Recipe;
        
        // Check ingredients are correct.
        for (var i = 0; i < data.ingredients.length; i++) {
            var ingredient = data.ingredients[i];
            if (ingredient.ingredient.name) {
                ingredient.ingredient = ingredient.ingredient.id;
            }
        };
        
        // Create update query.
        var updateQuery = {
            $set: {
                name: data.name,
                pictureLocation: data.pictureLocation,
                shortDescription: data.shortDescription,
                longDescription: data.longDescription,
                serves: data.serves,
                dishType: data.dishType,
                difficulty: data.difficulty,
                ingredients: data.ingredients,
                ratings: data.ratings
            }
        };
        
        // Update recipe.
        Recipe.update({ _id: data.id }, updateQuery, function (error) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            callback({
                success: true,
            });
        });
    },
    
    delete: function (id, callback) {
        // Connect.
        connection.connect();
        
        // Find a user from email.
        var Recipe = connection.Recipe;
        
        // Delete user.
        Recipe.findByIdAndRemove(id, function (error) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            callback({
                success: true,
            });
        });
    },
}