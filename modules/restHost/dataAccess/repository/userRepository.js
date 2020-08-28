var connection = require('./../database/mongooseConnection');

var crypto = require('crypto');


function handleError(errorMessage, callback) {
    callback({
        success: false,
        error: {
            message: errorMessage
        }
    });
}

function toDataObjects(users) {
    // Main list of data object.
    var listOfDataObjects = [];
    
    for (var i = 0; i < users.length; i++) {
        // Convert users to a data object.
        var dataObject = toDataObject(users[i]);
        
        // Add the object to the list.
        listOfDataObjects.push(dataObject);
    };
    
    return listOfDataObjects;
};

function toDataObject(user) {
    // Main data object.
    var dataObject = {
        id: user._id.toString(),
        email: user.email,
        pictureLocation: user.pictureLocation,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        authorName: user.authorName,
        description: user.description,
        cookbook: {
            recipes: [],
            mealPlans: [],
        },
        createdTime: user.createdTime,
        emailIsActivated: user.emailIsActivated
    };
    
    // Moving recipes to cookbook.
    if (user.cookbook.recipes) {
        for (var i = 0; i < user.cookbook.recipes.length; i++) {
            dataObject.cookbook.recipes.push(user.cookbook.recipes[i].toString());
        };
    }
    // Moving meal plans to cookbook.
    if (user.cookbook.mealPlans) {
        for (var i = 0; i < user.cookbook.mealPlans.length; i++) {
            dataObject.cookbook.mealPlans.push(user.cookbook.mealPlans[i].toString());
        };
    }
    
    // This method makes a non sensitive version of the object.
    dataObject.toPublic = function () {
        return {
            id: dataObject.id,
            email: dataObject.email,
            pictureLocation: dataObject.pictureLocation,
            firstName: dataObject.firstName,
            lastName: dataObject.lastName,
            authorName: dataObject.authorName,
            description: dataObject.description,
            followers: dataObject.followers,
            cookbook: dataObject.cookbook,
            createdTime: dataObject.createdTime,
        }
    };
    
    // Returning data object.
    return dataObject;
};

exports.repo = {
    get: function (id, callback) {
        // Connect.
        connection.connect();
        
        // Find a user from id.
        var User = connection.User;
        User.findById(id, function (error, user) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            // Check if found a user.
            if (!user) {
                handleError("The user does not exist.", callback);
                return;
            }
            
            // Get user from id.
            exports.repo.getFollowers(toDataObject(user), function (result) {
                if (!result.success && !result.data) {
                    handleError(result.error.message, callback);
                    return;
                }
                
                // return object.
                callback({
                    success: true,
                    data: result.data
                });
            });
        });
    },
    
    getFromEmail: function (email, callback) {
        // Connect.
        connection.connect();
        
        // Find a user from email.
        var User = connection.User;
        User.findOne({ email: email }, function (error, user) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            // Check if found a user.
            if (!user) {
                handleError("The user does not exit.", callback);
                return;
            }

            // Get followers.
            exports.repo.getFollowers(toDataObject(user), function (result) {
                if (!result.success && !result.data) {
                    handleError(result.error.message, callback);
                    return;
                }
                
                // return object.
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
        var User = connection.User;
        User.find({
            '_id': {
                $in: ids
            }
        }).exec(function (error, users) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            callback({
                success: true,
                data: toDataObjects(users)
            });
        });
    },
    
    getTopFollowed: function (callback) {
        // Connect.
        connection.connect();
        
        var Follow = connection.Follow;
        // Find top rated recipes.
        Follow.aggregate([
            {
                '$group' : {
                    '_id' : '$followed',
                    'count': {
                        '$sum' : 1
                    },
                }
            },
            {
                '$project' : {
                    '_id' : 1,
                    'count': 1,
                }
            }]).sort({ count: -1 }).limit(20).exec(function (error, result) {
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
                    
                    var users = [];
                    for (var i = 0; i < result.data.length; i++) {
                        users.push(result.data[i].toPublic());
                    };
                    
                    // return ids.
                    callback({
                        success: true,
                        data: users
                    });
                }
                else {
                    handleError(result.error.message, callback);
                }
            });
        });
    },
    
    getCreatedBy: function (data, callback) {
        // If data is an array.
        if (Array.isArray(data)) {
            // Get ids from data.
            var ids = [];
            for (var i = 0; i < data.length; i++) {
                ids.push(data[i].createdBy);
            };
            
            // Get users from ids.
            exports.repo.getFromIds(ids, function (result) {
                if (!result.success && !result.data) {
                    handleError(result.error.message, callback);
                    return;
                }
                
                var users = result.data;
                
                // Map users to the ids.
                for (var i = 0; i < users.length; i++) {
                    // Current user.
                    var user = users[i].toPublic();
                    
                    // Each object.
                    for (var j = 0; j < data.length; j++) {
                        if (user.id.toString() == data[j].createdBy.toString()) {
                            data[j].createdBy = user;
                        }
                    };
                };
                
                // return objects.
                callback({
                    success: true,
                    data: data
                });
            });
        }
        else {
            // Get user from id.
            exports.repo.get(data.createdBy, function (result) {
                if (!result.success && !result.data) {
                    handleError(result.error.message, callback);
                    return;
                }
                // Replace id with user.
                data.createdBy = result.data.toPublic();
                
                // return object.
                callback({
                    success: true,
                    data: data
                });
            });
        }
    },
    
    create: function (data, callback) {
        // Hash password.
        data.password = crypto.createHmac('sha256', '').update(data.password).digest('hex');
        // Change email to lower.
        data.email = data.email.toLowerCase();
        
        // Connect.
        connection.connect();
        
        // Create user from data.
        var User = connection.User;
        var user = new User({
            email: data.email,
            password: data.password,
            pictureLocation: data.pictureLocation,
            firstName: data.firstName,
            lastName: data.lastName,
            authorName: data.authorName,
            createdTime: Date.now(),
            // The user might not have filled the description field.
            // So if null give it an empty string.
            description: data.description || "", 
            emailIsActivated: false
        });
        
        // Find a user with the same email.
        User.findOne({ email: data.email }, function (error, existingUser) {
            if (error) {
                handleError(error, callback);
                return;
            }
            // There was found a user.
            if (existingUser) {
                handleError("The user already exits", callback);
                return;
            }
            
            // Save user.
            user.save(function (error) {
                if (error) {
                    handleError(error, callback);
                    return;
                }
                
                callback({
                    success: true,
                    data: user._id
                });
            });
        });
    },
    
    update: function (data, callback) {
        // Connect.
        connection.connect();
        
        var User = connection.User;
        // Create update query.
        var updateQuery = {
            $set: {
                email: data.email,
                pictureLocation: data.pictureLocation,
                password: data.password,
                firstName: data.firstName,
                lastName: data.lastName,
                authorName: data.authorName,
                description: data.description,
                cookbook: data.cookbook,
                emailIsActivated: data.emailIsActivated
            }
        };
        
        // Update user.
        User.update({ _id: data.id }, updateQuery, function (error) {
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
        var User = connection.User;
        // Update user.
        User.findByIdAndRemove(id, function (error) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            callback({
                success: true,
            });
        });
    },
    
    getFollowers: function (dataUser, callback) {
        // Connect.
        connection.connect();
        
        var Follow = connection.Follow;
        // Find a user with the same email.
        Follow.find({ followed: dataUser.id }, function (error, followers) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            dataUser.followers = [];
            for (var i = 0; i < followers.length; i++) {
                dataUser.followers.push(followers[i].follower);
            };
            
            callback({
                success: true,
                data: dataUser,
            });
        });
    },
    
    getFollowersFromIds: function (ids, callback) {
        // Connect.
        connection.connect();
        
        var Follow = connection.Follow;
        // Find a user with the same email.
        Follow.find({
            followed: {
                $in: ids
            }
        }, function (error, followers) {
            if (error) {
                handleError(error, callback);
                return;
            }
            
            var dataFollowers = [];
            for (var i = 0; i < followers.length; i++) {
                dataFollowers.push({
                    follower: followers[i].follower.toString(),
                    followed: followers[i].followed.toString()
                });
            };
            
            
            callback({
                success: true,
                data: dataFollowers,
            });
        });
    },
    
    createFollow: function (followerId, followedId, callback) {
        // Connect.
        connection.connect();
        
        var Follow = connection.Follow;
        // Find a user with the same email.
        Follow.findOne({ follower: followerId, followed: followedId }, function (error, existingFollow) {
            if (error) {
                handleError(error, callback);
                return;
            }
            // There was found a user.
            if (existingFollow) {
                callback({ success: true });
                return;
            }
            
            var follow = new Follow({
                follower: followerId, 
                followed: followedId
            });
            
            // Save user.
            follow.save(function (error) {
                if (error) {
                    handleError(error, callback);
                    return;
                }
                
                callback({
                    success: true,
                });
            });
        });
    },
    
    deleteFollow: function (followerId, followedId, callback) {
        // Connect.
        connection.connect();
        
        var Follow = connection.Follow;
        // Update user.
        Follow.findOneAndRemove({ follower: followerId, followed: followedId }, function (error) {
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