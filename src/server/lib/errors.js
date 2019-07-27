/* Price Table Server | tradekit.io
 *
 * @mudule: errors
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 *
 */

'use strict';

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

// A custom error allocated for file stream errors.
class FileStreamError extends Error {
    constructor(message, cause) {
        super(message);
        this.constructor = FileStreamError;
        this.cause = cause;
        this.name = 'FileStreamError';
        this.message = '[' + cause + ']' + ': ' + message;
    }
}
// Exports
module.exports = {
    MockExchangeError: MockExchangeError,
    FileStreamError: FileStreamError
};

// vim: fdm=marker ts=4
