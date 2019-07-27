/* Price Table Server | tradekit.io
 *
 * @mudule: tables
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 *
 */

'use strict';

// Project Imports
const { red, green } = require ('ansicolor');

var MODULE = 'tables';

// Local Imports
var logging = require('./logging');

// Logging
const log = logging.getLogger();

/* Public Functions */

/** @public moduleTest() {{{1
 * A generic test function.
 */

function moduleTest(){
    let CONTEXT = MODULE + '.' + 'moduleTest';
    log.debug({
        context: CONTEXT,
        verbosity: 5,
        message: ('__TABLES__ module accessed.'),
    });
}
//}}}1

/** @public exchangeRequestAsTable(dataObject) {{{1
 *
 * Expects a formatted exchange request data object.
 *
 * @param {Object} dataObject
 *
 */

function exchangeRequestAsTable(dataObject){
    // The header is an array with the top row labels.
    // ['symbol', 'timestamp', 'last', 'success'];
    let header = ['symbol', 'timestamp', 'last', 'success'];

    // Initialize
    let contentData;
    let data = [];

    // Insert the header.
    data.push(header);

    // Iterate and distribute.
    Object.values(dataObject).forEach( (value) => {
        contentData = [];
        Object.entries(value).forEach( (entry) => {
            let item = entry[1];
            if(typeof item === 'boolean'){
                // For boolean items.
                item = item ? green(item) : red(item);
            }
            contentData.push(item);
        });
        // Store the current row.
        data.push(contentData);
    });
    // Return the result.
    return data;
}
//}}}1

/* EXPORTS */
module.exports = {
    moduleTest: moduleTest,
    exchangeRequestAsTable: exchangeRequestAsTable
};

// vim: fdm=marker ts=4
