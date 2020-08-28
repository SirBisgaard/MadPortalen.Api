/*
 * Angular host module.
 */

var config = require('./../configurationModule/module.js').data.angularHost;
var express = require('./../configurationModule/module.js').express;
var app = require('./../configurationModule/module.js').app;

/*
 * This method starts the Angular host.
 */
exports.start = function (done) {
    app.use('/', express.static(config.directory));
    
    console.log('[INFO] Angular host started.');
    console.log('       - Directory loaded: ' + config.directory);
    console.log();
    done();
};