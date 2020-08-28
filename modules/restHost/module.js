/*
 * REST host module.
 */

var config = require('../configurationModule/module.js').data.restHost;
var expressHandler = require('./handlers/expressHandler.js');

/*
 * The start method that are transfer.
 */
exports.start = function (done) {
    apiController.loadModules();
    
    expressHandler.startHost(done);
};

/*
 * API controller.
 */
var apiController = {
    /*
     * This array contains the loaded modules.
     */
    modules: [],
    
    /*
     * This method loads the modules from the configuration.
     */
    loadModules: function () {
        console.log('[INFO] Loading API modules.');

        for (var i = 0; i < config.apiModules.length; i++) {
            var moduleConfig = config.apiModules[i];
            var module = require('./apiModules/' + moduleConfig.name + '.js')
            
            console.log('       - ' + moduleConfig.name.toUpperCase());

            module.load(expressHandler, moduleConfig);

            apiController.modules.push({
                module: module,
                config: moduleConfig
            });
            console.log();
        }
        console.log('[INFO] API modules are loaded.');
        console.log();
    }
}