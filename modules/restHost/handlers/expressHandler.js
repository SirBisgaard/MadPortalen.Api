/*
 * Express handler.
 */

var config = require('./../../configurationModule/module.js').data.restHost;
var authenticationHandler = require('./authenticationHandler.js');

var Guid = require('guid');
var express = require('./../../configurationModule/module.js').express;
var app = require('./../../configurationModule/module.js').app;
var fileUpload = require('express-fileupload');
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileUpload());

/*
 * Constants 
 */
exports.GET = 'GET',
exports.PUT = 'PUT',
exports.POST = 'POST',
exports.PATCH = 'PATCH',
exports.DELETE = 'DELETE',

/*
 * This method registers a API call path.
 */
exports.register = function (type, route, requireToken, callback) {
    expressHandler.register(type, route, requireToken, callback);
};


/*
 * This method starts the express server.
 */
exports.startHost = function (done) {
    expressHandler.startHost(done);
};

/*
 * Express handler module.
 */
var expressHandler = {
    
    /*
     * 
     */
    dictionary: {},
    
    /*
     *  
     */
    register: function (type, route, requireToken, callback) {
        
        var key = Guid.create();
        expressHandler.dictionary[key] = {
            key: key,
            requireToken: requireToken,
            type: type,
            route: route
        }
        
        var genericCallback = function (request, response) {
            var methodCallback = callback;
            var value = expressHandler.dictionary[key];
            
            expressHandler.handleCallback(request, response, methodCallback, value);
        };
        
        switch (type) {
            case exports.GET:
                app.get('/api' + route, genericCallback);
                break;
            case exports.PUT:
                app.put('/api' + route, genericCallback);
                break;
            case exports.POST:
                app.post('/api' + route, genericCallback);
                break;
            case exports.PATCH:
                app.patch('/api' + route, genericCallback);
                break;
            case exports.DELETE:
                app.delete('/api' + route, genericCallback);
                break;
        }
        
        console.log('         ' + type + ' on \t"/api' + route + '"');
    },
    
    handleCallback: function (request, response, callback, value) {
        /*
         * This part handles the token and generation of the user object.
         */
        var user = {
            hasData: false,
            data: null
        }
        
        // Try to execute the callback
        try {
            // Checks if the call requires a token.
            if (value.requireToken) {
                // Getting the token data from the authenticationHandler.
                authenticationHandler.getTokenData(request, function (tokenData) {
                    if (tokenData) {
                        console.log('[INFO] Request on "TOKEN:' + request.method + ':' + request.originalUrl + '"');
                        
                        // Updating user object.
                        user.hasData = true;
                        user.data = tokenData;
                        
                        callback(request, response, user);
                    }
                    else {
                        console.log('[WARN] Request on "' + request.method + ':' + request.originalUrl + '" was denied, because no token was provided.');
                        response.status(401).send('No token provided.');
                    }
                });
            }
            else {
                // The request does not require a token.
                // This means the user object does not contain data.
                console.log('[INFO] Request on "' + request.method + ':' + request.originalUrl + '"');
                callback(request, response, user);
            }
        } catch (e) {
            console.log('[ERROR] Callback failed! ' + e);
            console.log('       - Sending internal error response');
            response.sendStatus(500);
        };
    },
    
    /*
     * This method starts the REST host.
     */
    startHost: function (done) {
        console.log('[INFO] REST host started.');
        console.log();
        done();
    }
};
