/* Price Table Server | tradekit.io
 *
 * REST Asset Model
 *
 * Copyright (c) 2019 Milen Bilyanov, "cryptoeraser"
 * Licensed under the MIT license.
 */

'use strict';

// Project Imports
// None

var MODULE = 'rest.model';

/** @public Payload() {{{1
 *
 * This is the core payload object that handles the data flow from the data
 * storage to the REST requests.
 */

function Payload() {
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
            this.storage.feedback.records.requestId = '6c0b2cfe-914a-4d7d-82e3-66e73d84a9a9';
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
            this.storage.feedback.records.requestId = '6c0b2cfe-914a-4d7d-82e3-66e73d84a9a9';


            if(!this.storage.payload.assets.hasOwnProperty(symbol)){
                throw new Error('Invalid request for asset symbol [' + symbol.toUpperCase() + '] received!');
            }else{
                return this.storage.payload.assets[symbol];
            }
        },
        //}}}2

        /** @public init(template) {{{2
         *
         * Populate the internal storage using the provided template.
         *
         * @param {Object} template
         */

        init: (template) => {
            this.storage = template;
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
