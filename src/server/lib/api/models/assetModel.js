/*
 * REST Asset Model
 *
 * Copyright (c) 2019 Milen Bilyanov, "cryptoeraser"
 * Licensed under the MIT license.
 */

'use strict';

// Project Imports
// None

function Payload() {
    this.storage = {};

    let publicMethods = {

        // Receive and store incoming data.
        update: (data) => {
            this.storage.payload = data;
        },

        // Return all assets.
        queryAll: () => {
            this.storage.feedback.records.requestTimestamp = [new Date(), new Date().getTime()];
            this.storage.feedback.records.requestId = '6c0b2cfe-914a-4d7d-82e3-66e73d84a9a9';
            return this.storage;
        },

        // Return a single asset.
        querySingle: (symbol) => {
            this.storage.feedback.records.requestTimestamp = [new Date(), new Date().getTime()];
            this.storage.feedback.records.requestId = '6c0b2cfe-914a-4d7d-82e3-66e73d84a9a9';


            if(!this.storage.payload.assets.hasOwnProperty(symbol)){
                throw new Error('Invalid asset symbol: ' + symbol + ' received.');
            }else{
                return this.storage.payload.assets[symbol];
            }
        },

        // Populate the internal storage using the provided template.
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
