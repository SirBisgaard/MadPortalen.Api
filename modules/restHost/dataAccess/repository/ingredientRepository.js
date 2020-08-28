var connection = require('./../database/mongooseConnection');

function handleError(error, callback) {
    callback({
        success: false,
        error: {
            message: error
        }
    });
} 

function toDataObjects(ingredients) {
    // Main list of data object.
    var listOfDataObjects = [];
    
    for (var i = 0; i < ingredients.length; i++) {
        // Convert ingredients to a data object.
        var dataObject = toDataObject(ingredients[i]);
        
        // Add the object to the list.
        listOfDataObjects.push(dataObject);
    }
    
    return listOfDataObjects;
}

function toDataObject(ingredient) {
    // Main data object.
    var dataObject = {
        id: ingredient._id,
        name: ingredient.name,
        unitType: ingredient.unitType
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
}

exports.repo = {
    get: function (id, callback) {
        
    },

    getAll: function (query, callback) {
        // Connect.
        connection.connect();
        
        // Find a recipe from id.
        var Ingredient = connection.Ingredient;
        Ingredient.find(query).limit(20).exec(function (error, ingredients) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            callback({
                success: true,
                data: toDataObjects(ingredients)
            });
        });
    },
    
    create: function (data, callback) {
        // Connect.
        connection.connect();
        
        // Create ingredient from data.
        var Ingredient = connection.Ingredient;
        var ingredient = new Ingredient({
            name: data.name.toLowerCase(),
            unitType: data.unitType,
            createdTime: Date.now()
        });
        
        // Find a ingredient with the same name.
        Ingredient.findOne({ name: data.name }, function (error, existingIngredient) {
            if (error) {
                handleError(error, callback);
                return;
            }

            // There was found a ingredient.
            if (existingIngredient) {
                handleError("The ingredient already exits", callback);
                return;
            }
            
            // Save ingredient.
            ingredient.save(function (error) {
                if (error) {
                    handleError(error, callback);
                    return;
                }
                
                callback({
                    success: true
                });
            });
        });
    },
    
    update: function (data, callback) {
    },
    
    delete: function (id, callback) {
    }
};
