/* Price Table Server | tradekit.io
 *
 * REST Asset Model
 *
 * Copyright (c) 2019 Milen Bilyanov, "cryptoeraser"
 * Licensed under the MIT license.
 */

'use strict';

// Project Imports
const uuidv1 = require('uuid/v1');

var MODULE = 'rest.model';

/** @public Payload() {{{1
 *
 * This is the core payload object that handles the data flow from the data
 * storage to the REST requests.
 */

function Payload() {

    // Internal Storage
    this.storage = {};

    let publicMethods = {

        /** @public update(data) {{{2
         *
         * Receive and store incoming data.
         *
         * @param {Object} data
         */

        update: (data) => {
            this.storage.payload = data;
        },
        //}}}2

        /** @public queryAll() {{{2
         *
         * Return all assets.
         */

        queryAll: () => {
            this.storage.feedback.records.requestTimestamp = [new Date(), new Date().getTime()];
            this.storage.feedback.records.requestId = uuidv1();
            return this.storage;
        },
        //}}}2

        /** @public querySingle(symbol) {{{2
         *
         * Return a single asset.
         *
         * @param {String} symbol
         */

        querySingle: (symbol) => {
            this.storage.feedback.records.requestTimestamp = [new Date(), new Date().getTime()];
            this.storage.feedback.records.requestId = uuidv1();

            if(!this.storage.payload.assets.hasOwnProperty(symbol)){
                throw new Error('Invalid request for asset symbol [' + symbol.toUpperCase() + '] received!');
            }else{
                // We are effectively destroying the stored data here.
                // However, we rely on the fact that in the 'assetController'
                // section, the internal state is always reconstructed prior to
                // calling this function. In that way, we can avoid deep
                // copying the storage in order to return a single asset.
                let getPair = this.storage.payload.pair;
                this.storage.payload = {
                    pair: getPair,
                    asset: this.storage.payload.assets[symbol]
                };
                return this.storage;
            }
        },
        //}}}2

        /** @public init(template) {{{2
         *
         * Populate the internal storage using the provided template.
         *
         * @param {Object} template
         */

        init: (template, name, version) => {
            this.storage = template;
            this.storage.info.server.name = name;
            this.storage.info.server.version = version;
        }
        //}}}2
    };
    return publicMethods;
}
// }}}1

module.exports = {
    Payload: Payload
};

// vim: fdm=marker ts=4
