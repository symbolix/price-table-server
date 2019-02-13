'use strict';
// lib/mock-data.js

// A custom error allocated for out mock-data error.
class MockExchangeError extends Error {
    constructor(message, cause) {
        super(message);
        this.constructor = MockExchangeError;
        this.cause = cause;
        this.name = 'MockExchangeError';
        this.message = '[' + cause + ']' + ': ' + message;
    }
}

// Exports
module.exports = {
    MockExchangeError: MockExchangeError,
};
