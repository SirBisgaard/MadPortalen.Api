/*
 * Authentication API module.
 */

var crypto = require('crypto');

var authenticationHandler = require('./../handlers/authenticationHandler.js');

var userRepository = require('./../dataAccess/repository/userRepository.js').repo;

var handler;

/*
 * 
 */
exports.load = function (expressHandler, config) {
    handler = expressHandler;
    
    authModule.load();
};

/*
 * 
 */
var authModule = {
    load: function () {
        handler.register(
            handler.GET, 
            '/auth',
            false, 
            function (request, response, user) {
                // See if the data is there.
                if (!request.query.email && !request.query.password) {
                    response.status(400).send("Not all data is provided.");
                    return;
                }
                
                // Find user.
                userRepository.getFromEmail(request.query.email.toLowerCase(), function (result) {
                    if (result.success && result.data) {
                        var user = result.data;
                        // Generate password hash.
                        var password = crypto.createHmac('sha256', '').update(request.query.password).digest('hex');
                        
                        // Check if the passwords match.
                        if (user.password != password) {
                            response.status(401).send("Authentication failed.");
                            return;
                        }
                        
                        // Check if email is activated.
                        if(!user.emailIsActivated) {
                            response.status(400).send("Email is not activated");
                            return;
                        }
                        
                        // Send token and user id.
                        response.status(200).send({
                            id: user.id,
                            token: authenticationHandler.createToken({id: user.id})
                        });
                    }
                    else {
                        response.status(401).send("Authentication failed.");
                    }
                });
            });
    }
};