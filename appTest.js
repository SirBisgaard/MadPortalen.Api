var chai = require('chai');

chai.config.includeStack = true;

global.expect = chai.expect;
global.AssertionError = chai.AssertionError;
global.Assertion = chai.Assertion;
global.assert = chai.assert;
global.should = chai.should();


//run all tests with 'npm test'
require('./modules/restHost/test/testSample.js');
require('./modules/restHost/test/cacheHandlerTest.js');

