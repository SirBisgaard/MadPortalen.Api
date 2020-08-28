
/*
 * Authentication handler module.
 */

var config = require('./../../configurationModule/module.js').data.restHost.token;;
var jwt = require('jsonwebtoken');

/*
 * This method returns the token data.
 */
exports.getTokenData = function (request, callback) {
    return authenticationHandler.getTokenData(request, callback);
};

/*
 * This method returns the token data.
 */
exports.createToken = function (user) {
    return authenticationHandler.createToken(user);
};

/*
 * Authentication handler.
 */
var authenticationHandler = {
    getTokenData: function (request, callback) {
        // Get token from request.
        var token = request.headers['x-access-token'];
        
        if (token) {
            // Decrypt token.
            jwt.verify(token, config.key, function (err, decoded) {
                if (err) {
                    // Return null if the token is null.
                    callback(null);
                }
                else {
                    // Return token data.
                    callback(decoded);
                }
            });
        }
        else {
            // Return null if there is no token.
            callback(null);
        }
    },

    createToken: function (data) {
        return jwt.sign(data, config.key);
    }
};
