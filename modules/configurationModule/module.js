/*
 * Configuration module.
 */
    
var fs = require('fs');
var express = require('express');
var app = express();


/*
 * This contains the configuration.
 */
exports.data = {};
exports.express = express;
exports.app = app;

exports.start = function (callback) {
    app.listen(exports.data.port, function () {
        console.log('[INFO] Host is up.');
        console.log('       - Port: ' + exports.data.port);
        console.log();

        callback();
    });
};

/*
 * This statement loads the configuration.
 */
(function () {
        exports.data = JSON.parse(fs.readFileSync('./config.json', 'utf8').toString().trim());
        
        console.log('[INFO] Configuration loaded.');
        console.log();
    })();