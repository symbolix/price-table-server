/* Price Table Server | tradekit.io
 *
 * @mudule: globals
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 *
 */

'use strict';

// Local Imports
var logging = require('./logging');

// Logging
const log = logging.getLogger();

var MODULE = 'globals';

var resources = {
    APP_NAME: 'Price Table Server',
    APP_VERSION: 'v0.0.2.[1]',
    DATA_FEED_IS_ACTIVE: false
};

function moduleTest(){
    let CONTEXT = MODULE + '.' + 'moduleTest';
    log.debug({
        context: CONTEXT,
        verbosity: 5,
        message: ('__GLOBALS__ module accessed.'),
    });
}

function getResource(resource){
    return resources[resource];
}

function setResource(resource, value){
    resources[resource] = value;
}

module.exports = {
    moduleTest: moduleTest,
    set: setResource,
    get: getResource
};

// vim: fdm=marker ts=4
