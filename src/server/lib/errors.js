'use strict';
// lib/mock-data.js

class MockExchangeError extends Error {
    constructor(message, cause) {
        super(message);
        this.constructor = MockExchangeError;
        this.cause = cause;
        this.name = 'MockExchangeError';
        this.message = '[' + cause + ']' + ': ' + message;
    }
}

module.exports = {
    MockExchangeError: MockExchangeError
};
