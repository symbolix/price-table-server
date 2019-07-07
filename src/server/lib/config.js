/* Price Table Server | tradekit.io
 *
 * @mudule: config
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 */

'use strict';

// Main Configuration Data Structure
var resources = {
    PAIRS: ['eur', 'usd'],
    ASSETS: ['btc', 'eth', 'zec', 'ltc', 'xmr', 'dash', 'eos', 'etc', 'xlm', 'xrp'],
    FORMAT: {
        btc: 2,
        eth: 2,
        zec: 2,
        ltc: 2,
        xmr: 2,
        dash: 2,
        eos: 2,
        etc: 2,
        xlm: 4,
        xrp: 4
    },
    EXCHANGE: 'kraken',
    DEBUG_DATA_FEED_STATUS: false,
    SILENT: false,
    STATE_CACHE_FILE: './data/statecache.json',
    DEBUG: {
        console: true,
        logfile: false
    },
    EXCHANGE_DATA_IMPORT_RETRY_LIMIT: 10,
    EXCHANGE_DATA_EXPORT_RETRY_LIMIT: 9,
    STATE_CACHE_IMPORT_RETRY_LIMIT: 9,
    STATE_CACHE_FILE_AGE_LIMIT: {
        days: 0,
        hours: 0,
        minutes: 4,
        seconds: 59
    },
    /* This is the verbosity depth required by the function hosting the verbosity request.*/
    REQUIRED_VERBOSITY_DEPTH: 1,
    /* This is the current global verbosity depth.*/
    CURRENT_VERBOSITY_DEPTH: 9,
};

/** @public getResource(resource) {{{1
 *
 * A public getter for the configuration items. The item is requested through
 * the _resource_ parameter.
 *
 * @param {String} resource
 *
 */

function getResource(resource){
    return resources[resource];
}
// }}}1

/** @public setResource(resource, value) {{{1
 *
 * A public setter for the configuration items. The item is requested through
 * the _resource_ parameter and the value to be set is passed in through the
 * _value_ argument.
 *
 * @param {String} resource
 * @param {String|Number} value
 *
 */

function setResource(resource, value){
    // resources[resource] = value;
    throw new Error('Changing configuration options is NOT allowed!');
}
// }}}1

module.exports = {
    set: setResource,
    get: getResource
};

// vim: fdm=marker ts=4
