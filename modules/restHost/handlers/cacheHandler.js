/*
 * Cache Handler module.
 */

var config = require('./../../configurationModule/module.js').data.restHost.cache;
var crypto = require('crypto');

/*
 * This method adds a value to the cache.
 */
exports.add = function (key, value, ttl) {
    cacheHandler.add(key, value, ttl);
};

/*
 * This method removes a value from the cache.
 */
exports.remove = function (key) {
    return cacheHandler.remove(key);
};

/*
 * This method gets a value from the cache.
 */
exports.get = function (key) {
    return cacheHandler.get(key);
};

/*
 * This method generates a cache key.
 */
exports.generateKey = function (values) {
    return cacheHandler.generateKey(values);
};

/*
 * Cache Handler module.
 */
var cacheHandler = {
    
    /*
     * This dictionary contains all items.
     * By key and in a array.
     */
    dictionary: {
        itemArray: []
    },
    
    /*
     * This contains a reference to the interval.
     */
    interval: null,
    
    /*
     * This method is instantiate the interval, that reviews the cache items.
     */
    load: function () {
        cacheHandler.interval = setInterval(cacheHandler.reviewCacheItems, config.cleanupTimeout);
    },
    
    /*
     * This method adds a value to the cache.
     */
    add: function (key, value, ttl) {
        var item = cacheHandler.dictionary[key];
        
        var newItem = {
            key: key,
            value: value,
            ttl: ttl,
            created: Date.now()
        };
        
        // Checking if there is an old value in item array.
        if (item) {
            var index = cacheHandler.dictionary.itemArray.indexOf(item);
            cacheHandler.dictionary.itemArray[index] = newItem;
        }
        else {
            cacheHandler.dictionary.itemArray.push(newItem)
        }
        
        cacheHandler.dictionary[key] = newItem;
    },
    
    /*
     * This method gets an value from the cache.
     */
    remove: function (key) {
        var item = cacheHandler.dictionary[key];
        
        if (item) {
            var index = cacheHandler.dictionary.itemArray.indexOf(item);
            cacheHandler.dictionary.itemArray.splice(index, 1);
            
            cacheHandler.dictionary[key] = undefined;
        }
    },
    
    /*
     * This method removes a value from the cache.
    */
    get: function (key) {
        var cacheObject = cacheHandler.dictionary[key]
        
        if (cacheObject) {
            return cacheObject.value;
        }
        else {
            return undefined;
        }
    },
    
    /*
     * This method generates a cache key.
     */
    generateKey: function (values) {
        var keyPotentail = '';
        
        for (var i = 0; i < values.length; i++) {
            keyPotentail += values[i].toString();
        };
        
        return crypto.createHmac('sha256', config.scramble).update(keyPotentail).digest('hex');
    },
    
    /*
     * This method runs every time the interval runs.
     */
    reviewCacheItems: function () {
        var deletedItems = 0;
        var timeBegone = Date.now();
        
        for (var i = 0; i < cacheHandler.dictionary.itemArray.length;) {
            var item = cacheHandler.dictionary.itemArray[i];
            
            if (item.created + item.ttl < timeBegone) {
                cacheHandler.remove(item.key);
                deletedItems++;
            }
            else {
                i++;
            }
        };
        
        if (deletedItems > 0) {
            console.log('[INFO] Cache heartbeat. ITEMS:' + cacheHandler.dictionary.itemArray.length + ' DELETED:' + deletedItems);
        }
    }
};

/*
 * Loading cacheHander.
 */
cacheHandler.load();
exports.dictionary = cacheHandler.dictionary;

/* EXAMPLE
        
    var cacheHandler = require('./modules/restHost/handlers/cacheHandler.js');
    var id = "testID";
    var object = { id: "testID", name: "Martin" };
    var key = cacheHandler.generateKey([id]);
        
    cacheHandler.add(key, object, 0);
    cacheHandler.remove(key);
    if(cacheHandler.get(key) != undefined) { console.log('ERROR'); }
    cacheHandler.add(key, object, 0);
 */