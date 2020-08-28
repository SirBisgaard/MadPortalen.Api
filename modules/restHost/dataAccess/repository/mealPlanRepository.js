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

function toDataObjects(mealPlans) {
    // Main list of data object.
    var listOfDataObjects = [];
    
    for (var i = 0; i < mealPlans.length; i++) {
        // Convert meal plans to a data object.
        var dataObject = toDataObject(mealPlans[i]);
        
        // Add the object to the list.
        listOfDataObjects.push(dataObject);
    };
    
    return listOfDataObjects;
};

function toDataObject(mealPlan) {
    // Main data object.
    var dataObject = {
        id: mealPlan._id.toString(),
        title: mealPlan.title,
        description: mealPlan.description,
        days: [],
        createdBy: mealPlan.createdBy,
        createdTime: mealPlan.createdTime
    };
    
    // Move days into object.
    for (var i = 0; i < mealPlan.days.length; i++) {
        var day = {
            nameOfDay: mealPlan.days[i].nameOfDay,
            recipes: []
        }
        // Move recipes into day.
        for (var j = 0; j < mealPlan.days[i].recipes.length; j++) {
            day.recipes.push(mealPlan.days[i].recipes[j]);
        };
        // Add day to meal plan.
        dataObject.days.push(day);
    };
    
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
    get: function (id, callback) {
        // Connect.
        connection.connect();
        
        // Find a meal plan from id.
        var MealPlan = connection.MealPlan;
        MealPlan.findById(id).exec(function (error, mealPlan) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            // Check if found a meal plan.
            if (!mealPlan) {
                handleError("The meal plan does not exist.", callback);
                return;
            }
            
            // Replace meal plan created by with user.
            userRepository.getCreatedBy(toDataObject(mealPlan), function (result) {
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
        var MealPlan = connection.MealPlan;
        MealPlan.find(query).exec(function (error, mealPlans) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            // Replace meal plan created by with users.
            userRepository.getCreatedBy(toDataObjects(mealPlans), function (result) {
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
        
        // Find a recipe from id.
        var MealPlan = connection.MealPlan;
        MealPlan.find({
            '_id': {
                $in: ids
            }
        }).exec(function (error, mealPlans) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            // Replace meal plan created by with users.
            userRepository.getCreatedBy(toDataObjects(mealPlans), function (result) {
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
    
    create: function (data, callback) {
        // Connect.
        connection.connect();
        
        // Create recipe from data.
        var MealPlan = connection.MealPlan;
        var mealPlan = new MealPlan({
            title: data.title,
            description: data.description,
            days: data.days,
            createdBy: data.createdBy,
            createdTime: Date.now()
        });
        
        mealPlan.save(function (error) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            callback({
                success: true,
                data: mealPlan._id
            });
        });
    },
    
    update: function (data, callback) {
        // Connect.
        connection.connect();
        
        // Create update query.
        var updateQuery = {
            $set: {
                title: data.title,
                description: data.description,
                days: data.days,
            }
        };
        
        var MealPlan = connection.MealPlan;
        // Update meal plan.
        MealPlan.update({ _id: data.id }, updateQuery, function (error) {
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
        var MealPlan = connection.MealPlan;
        
        // Delete user.
        MealPlan.findByIdAndRemove(id, function (error) {
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