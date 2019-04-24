/*
 * R£ST Asset Model
 *
 * Copyright (c) 2019 Milen Bilyanov, "cryptoeraser"
 * Licensed under the MIT license.
 */

'use strict';

// Project Imports
// None.

function Payload() {
    this.storage = {};

    let publicMethods = {
        update: (data) => {
            this.storage.package = data;
        },

        findAll: () => {
            this.storage.timestamp = [new Date(), new Date().getTime()];
            return this.storage;
        },

        init: (template) => {
            this.storage = template;
        }
    };

    return publicMethods;
}

module.exports = {
    Payload: Payload
};

// vim: fdm=marker ts=4
