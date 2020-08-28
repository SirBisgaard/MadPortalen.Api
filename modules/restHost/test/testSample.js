var should = require('chai').should();

//sample of unitTest with mocha and chai
describe('#chaiTestsSample()', function() {

    //This is a assert test
    describe('assert', function () {
        it('should return -1 when the value is not present', function () {
            assert.equal(1, [1,2,3].indexOf(2));
            assert.equal(5, 2+3);
        });

    });

    //This is a should test
    describe('should',  function(){
        it('should return -1 when the value is not present', function() {
            [1,4,9].indexOf(9).should.equal(2);
            [1,2,3].indexOf(0).should.equal(-1);
        });
    });

    //This is a expect test
    describe('expect',  function(){
        it('should work not be equal', function(){
            expect('foo').to.not.equal('bar');
        });

        it('should be equal', function(){
            expect('test').to.equal('test');
        });
    });
});

