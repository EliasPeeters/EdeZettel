const assert = require('assert');
const request = require('supertest');
const main = require('../main.js');

describe('GeneralCheck', function() {

    it('Check general maths', function() {
        assert.strictEqual(5===5, true);
    });
});

describe('Checking public views', function() {

    it('login View', function() {
        return request(main.app)
            .get('/login')
            .then(function(response){
                assert.strictEqual(response.status, 200)
            })
    });

    it('register View', function() {
        return request(main.app)
            .get('/register')
            .then(function(response){
                assert.strictEqual(response.status, 200)
            })
    });
});

describe('Checking internal functions', function() {

    it('editString function', function() {
        assert.strictEqual(main.editString('Öl'), 'Oel');
    });

    it('replace function', function() {
        assert.strictEqual(main.replace('Öl', 'Ö', 'Oe'), 'Oel');
    });

    it('strictEqual function (1)', function() {
        assert.strictEqual(main.checkForChars('2498024a'), true);
    });
    it('strictEqual function (2)', function() {
        assert.strictEqual(main.checkForChars('2498024'), false);
    });
});

