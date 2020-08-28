/*
 * Main application file.
 */

console.log('[INFO] Starting server.');
console.log();

var config = require('./modules/configurationModule/module.js');
var angularHost = require('./modules/angularHost/module.js');
var restHost = require('./modules/restHost/module.js');

config.start(function () {
    var doneCounter = 0;
    var done = function () {
        doneCounter++;
        if (doneCounter == 2) {
            console.log('[INFO] Everything is up and running.');
        }
    };
    
    // Starting angular host
    angularHost.start(done);
    
    // Starting REST host
    restHost.start(done);
});

