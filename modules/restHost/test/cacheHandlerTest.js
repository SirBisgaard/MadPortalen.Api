var should = require('chai').should();

var cacheHandler = require('./../handlers/cacheHandler.js');

beforeEach(function() {
    //cacheHandler.dictionary.clear;
});

describe('#cacheHandler', function() {

    describe('#add()', function() {

        var key = '2x94lzkj6ls4le4v03jl';
        var value = {
            name: 'Bisse',
            age: 32
        };
        var ttl = 60000;
        
        it('should add an element to cache', function () {
            cacheHandler.add(key, value, ttl);
        });

        it('should check that the cache contains the added element', function () {
            expect(cacheHandler.dictionary[key].value.name).to.equal(value.name);
            expect(cacheHandler.dictionary[key].value.age).to.equal(value.age);
            expect(cacheHandler.dictionary[key].ttl).to.equal(ttl);
            assert.equal(1, cacheHandler.dictionary.itemArray.length);
        });
        
    });

    describe('#remove()', function() {

        var key = '2x94lzkj6ls4le5673jl';
        var value = {
            name: 'Bisse',
            age: 32
        };
        var ttl = 60000;
        
        it('should add an element to cache', function () {
            cacheHandler.add(key, value, ttl);
        });

        it('should delete an element from cache', function () {
            cacheHandler.remove(key);
        });

        it('check that the element is removed', function () {
            assert.equal(1, cacheHandler.dictionary.itemArray.length);
            expect(cacheHandler.dictionary[key]).to.equal(undefined);
        });
    });

});
