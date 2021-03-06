/* Price Table Server | tradekit.io
 *
 * @mudule: config
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 *
 */

'use strict';

var path = require('path');

/** @private trimPath(arr, depth) {{{1
 *
 * A private function that is used to trim the end of a path array. The _arr_
 * argument is used to pass in a path array and the _depth_ argument determines
 * how deep we are going to trim the tail of the incoming array.
 *
 * @param {Array} arr
 * @param {Intiger} depth
 *
 */

const trimPath = (arr, depth) => {
    for ( var i = 0; i < depth; i++ ) {
        arr.pop();
    }
};
//}}}1

/** @private getStateCacheFilePath() {{{1
 *
 * A private function that is used as a getter to query the location of the state cache file.
 * Returns a string with the appropriate file path.
 *
 * @param {String} resource
 * @return {String}
 *
 */

const getStateCacheFilePath = () => {
    // Test the current environment.
    // Assume 'development' environment by default.
    let isDevelopmentEnvironment = process.env.NODE_ENV == 'production' ? false : true;

    let separator = path.sep;
    let currentPath = __dirname.split(separator);

    //currentPath.pop();
    trimPath(currentPath, 2);

    let stateCacheProductionLocation = (currentPath.join(separator) + '/data/statecache.json');
    let stateCacheDevelopmentLocation = path.resolve('./data/statecache.json');

    let stateCacheFilePath = isDevelopmentEnvironment ? stateCacheDevelopmentLocation : stateCacheProductionLocation;
    return (stateCacheFilePath);
};
//}}}1

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
    SOCKET_SERVER_PORT: 9000,
    REST_SERVER_PORT: 9001,
    USE_MOCK_DATA_FEED: false,
    DEBUG_DATA_FEED_STATUS: false,
    DATA_CONTAINER_WAIT_INTERVAL: 3000,
    DATA_REQUEST_INTERVAL: {
        /* Skip that many minutes {Integer}: 0, 1, 2, 3 ... */
        skip: 1,
        /* Wait that many seconds {Integer} 0-59 */
        delay: 0
    },
    SILENT: false,
    STATE_CACHE_FILE: getStateCacheFilePath(),
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
