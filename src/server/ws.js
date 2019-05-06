'use strict';

// Project Imports
const { cyan, white, red, green, yellow, blue } = require ('ansicolor');
const { table } = require('table');

// A simple server-side script that serves a JSON object.
var WebSocketServer = require('ws').Server;
const express = require('express');
const bodyParser = require('body-parser');

// Local Imports
const utils = require('./lib/utils');
const data = require('./lib/data-container');
const globals = require('./lib/globals');
const config = require('./lib/config');
const logging = require('./lib/logging');
const tables = require('./lib/tables');
const schema = require('./lib/data-schema.js');
const timers = require('./lib/timers.js');
const assetRoutes = require('./lib/api/routes/assetRoutes');

// Symbols {{{1
const SYMBOLS = [
    'BTC',
    'ETH',
    'ZEC',
    'LTC',
    'XMR',
    'DASH',
    'EOS',
    'ETC',
    'XLM',
    'XRP'
];
//}}}1

// Pairs
const PAIRS = config.get('PAIRS').map(pair => pair.toUpperCase());

// Exchnges
const EXCHANGE = config.get('EXCHANGE');

// Assets
const ASSETS = config.get('ASSETS').map(asset => asset.toUpperCase());

// Globals
const APP_NAME = globals.get('APP_NAME');
const APP_VERSION = globals.get('APP_VERSION');
const WEBSOCKETS_IS_ACTIVE = false;

// Intro
!config.get('SILENT') && console.log(`\n${APP_NAME} ${APP_VERSION}`);

// Logging
const log = logging.getLogger();

// Interval
let requestInterval = new timers.Interval('request');

/*--------------------;
 ; Server Application ;
 ;--------------------*/

/** public generatePairAssetContainer(pairs, assets) {{{1
 *  This is an async fetch call wrapping the cached date request.
 *  @param {array} pairs - An array with the first set of keys.
 *  @param {array} assets - An array with the sub-set of keys.
 */
const serializeLists = (primary, secondary) => {
    let container = {};

    primary.map(pair => {
        let assetsStructure = {};
        secondary.map(asset => {
            assetsStructure[asset] = null;
        });
        container[pair] = assetsStructure;
    });

    return container;
};
// }}}1

/** public async fetchCachedData(filepath) {{{1
 *  This is an async fetch call wrapping the cached date request.
 *  @param {string} filepath - Path to the cache file.
 */
const fetchCachedData = async (filepath) => {
    const CONTEXT = 'fetchCachedData';
    let response;

    try {
        // Send the request.
        // Expects a response object with the following structure:
        //      { payload: obj, retry: boolean, state: boolean }
        response = await utils.readState(filepath);

        if(!response.state){
            // Failure.
            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'CACHE_FETCH_STATUS: {0}'.stringFormatter('FAIL')
            });
        }else{
            // Success
            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'CACHE_FETCH_STATUS: {0}'.stringFormatter('SUCCESS')
            });
        }
    } catch (failure) {
        // On Failure
        log.error({
            context: CONTEXT,
            message: ('Failed to complete CACHE_FETCH_REQUEST.')
        });

        // Bubble up the error and terminate.
        // Let the outer try/catch handle the message and the stack.
        throw failure;
    }

    // Return the response.
    // The returned object is {data: data, state: boolean}
    return response;
};
//}}}1

// @public async fetchExchangeData(id, pair, symbols, passThrough) {{{1
//
//  ARGS:
//      id: The exchange id
//      pair: A fiat pair code
//      symbols: An array of asset ticker symbols
//      passThrough: Boolean, allows partial data to be returned
//  INFO:
//      This is an async fetch call wrapping the exchange request.
//
const fetchExchangeData = async (id, pair, symbols, { passThrough=false }) => {
    const CONTEXT = 'fetchExchangeData';
    let response = false;

    try {
        // Make the async call and wait for the response.
        response = await utils.sendExchangeRequest(id, pair, symbols);

        if(!response){
            // In case the response is silent.
            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'FETCH_REQUEST_STATUS: {0}'.stringFormatter('FALSE')
            });
        }else{
            // There is a response, but might be partial.
            if(!response.signature.success){
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'FETCH_REQUEST_STATUS: {0}'.stringFormatter('PARTIAL')
                });
                // Tolerance check.
                if(!response.signature.success && !passThrough){
                    // In cases where it is crucial to get a complete response for
                    // all of the requests, we should not be leaking the partial
                    // results.

                    log.debug({
                        context: CONTEXT,
                        verbosity: 7,
                        message: 'PASS_THROUGH_FLAG is [{0}]: No partial results allowed.'.stringFormatter(passThrough.toString())
                    });

                    // Suppress partial responses.
                    response = false;
                }
            }else{
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'FETCH_REQUEST_STATUS: {0}'.stringFormatter('COMPLETE')
                });
            }
        }
    } catch (failure) {
        // On Failure
        log.error({
            context: CONTEXT,
            message: ('Failed to complete exchange FETCH request.')
        });

        // Bubble up the error and terminate.
        // Let the outer try/catch handle the message and the stack.
        throw failure;
    }

    // Return the response.
    return response;
};
//}}}1

// @public async sendExchangeData(filepath, data) {{{1
//
//  ARGS:
//      filepath: Path to the JSON cache file.
//  INFO:
//      This is a promise wrapper for the send cache request.
//
async function sendExchangeData(filepath, data) {
    const CONTEXT = 'sendExchangeData';
    let response;

    try {
        // Send the request.
        response = await utils.writeState(filepath, data);
        if(!response){
            // Failure
            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'SEND_DATA_STATUS: {0}'.stringFormatter('FALSE')
            });
        }else{
            // Success
            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'SEND_DATA_STATUS: {0}'.stringFormatter('COMPLETE')
            });
        }
    } catch (failure) {
        // On Failure
        log.error({
            context: CONTEXT,
            message: ('Failed to complete data SEND request.')
        });

        // Bubble up the error and terminate.
        // Let the outer try/catch handle the message and the stack.
        throw failure;
    }

    // Return the response.
    return response;
}
// }}}1

/** public async getStateCache(filepath, { retryLimit }) {{{1
 * This is a wrapped async call with a fetch.
 * (https://dev.to/ycmjason/javascript-fetch-retry-upon-failure-3p6g)
 * @param {string} filepath     : File location for the state cache file.
 * @param {boolean} allowPartial: Boolean, will allow partial responses and will not enforce a retry operation.
 */
const getStateCache = async (filepath, { retryLimit = true }) => {

    // Initialise
    let response, success;
    const CONTEXT = 'getStateCache';

    // Cycle
    for (let i = 0; i < retryLimit; i++) {
        try {
            // Start Label
            log.label({
                verbosity: 1,
                colour: green.inverse,
                message: 'cached_state_import [ATTEMPT {0} of {1}] ({2})'.stringFormatter((i+1), retryLimit, 'START')
            });

            // Request
            response = await fetchCachedData(filepath);

            // Evaluate
            if(response.state){
                // Status Flag
                success = true;

                // Complete Success
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'CACHE_GET_STATUS: {0}'.stringFormatter('SUCCESS')
                });

                // Success Label
                log.label({
                    verbosity: 1,
                    colour: green.inverse,
                    message: 'cached_state_import [SUCCESS] ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
                });
            }else{
                // Status Flag
                success = false;

                // Complete Success
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'CACHE_GET_STATUS: {0}'.stringFormatter('FAIL')
                });

                // Error Label
                log.label({
                    verbosity: 1,
                    colour: red.inverse,
                    message: 'cached_state_import [FAILED] ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
                });
            }

            // Evaluate
            if(!success){
                const isLastAttempt = i + 1 === retryLimit;
                if(!response.retry){
                    log.warning({
                        context: CONTEXT,
                        message: ('MISSING_FILE or TRUNCATED_DATA, no need to retry.')
                    });
                    break;
                }
                if(isLastAttempt){
                    // Abort the current retry step in case we reached the retry limit.
                    log.error({
                        context: CONTEXT,
                        message: 'Retry limit reached with NO success. Giving up.'
                    });

                    // Rise an exception
                    // Throw an exception? No, we should move on and re-cache
                    // the state cache file.
                    // throw new Error('State cache data is required to proceed.');
                }
            }else{
                // Return
                return response.payload;
            }
        } catch (failure) {
            // On Failure:
            log.error({
                context: CONTEXT,
                message: ('Incomplete state cache request.')
            });

            // Bubble up the error and terminate.
            // Let the outer try/catch handle the message and the stack.
            throw failure;
        }
    }
};
//}}}1


/**
 * public async getExchangeData(id, pair, symbols, retryLimit, allowPartial) {{{1
 * This is a wrapped async call with a fetch.
 * (https://dev.to/ycmjason/javascript-fetch-retry-upon-failure-3p6g)@param {} id: The exchange id
 * @param {string} pair A fiat pair code.
 * @param {array} symbols An array of asset ticker symbols.
 * @param {intiger} retryLimit Number of the possible retry attempts.
 * @param {boolean} allowPartial Boolean, will allow partial responses and will not
 *      enforce a retry operation.
 */
const getExchangeData = async (id, pair, symbols, { retryLimit = 1 }, { allowPartial = false }) => {

    // Initialise
    let response, success;
    const CONTEXT = 'getExchangeData';

    // Cycle
    for (let i = 0; i < retryLimit; i++) {
        try {
            // Start Label
            log.label({
                verbosity: 1,
                colour: cyan.inverse,
                message: 'exchange_data_import [ATTEMPT {0} of {1}] ({2})'.stringFormatter((i+1), retryLimit, 'START')
            });

            // Request a response.
            response = await fetchExchangeData(
                id,
                pair,
                symbols,
                { passThrough: allowPartial }
            );

            if(response){
                // ... display the table.
                let tableData = tables.exchangeRequestAsTable(response.assets);
                let output = table(tableData);
                let tableColour = response.signature.success ? cyan : yellow;

                log.info({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'Exchange data query results:\n' + tableColour(output),
                });
            }

            // Evaluate
            if(response){
                if(response.signature.success){
                    // Status Flag
                    success = true;

                    // Complete Success
                    log.debug({
                        context: CONTEXT,
                        verbosity: 7,
                        message: 'EXCHANGE_REQUEST_STATUS: {0}'.stringFormatter('SUCCESS')
                    });

                    // Success Label
                    log.label({
                        verbosity: 1,
                        colour: cyan.inverse,
                        message: 'exchange_data_import [SUCCESS] ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
                    });

                }else{
                    // Status Flag
                    success = allowPartial ? true : false;

                    // Partial Success, Soft Failure
                    log.debug({
                        context: CONTEXT,
                        message: 'EXCHANGE_REQUEST_STATUS: {0}'.stringFormatter('INCOMPLETE')
                    });

                    // Error Label
                    log.label({
                        verbosity: 1,
                        colour: red.inverse,
                        message: 'exchange_data_import [INCOMPLETE] ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
                    });
                }
            }else{
                // Status Flag
                success = false;

                // Error Label
                log.label({
                    verbosity: 1,
                    colour: red.inverse,
                    message: 'exchange_data_import [FAILED] ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
                });
            }

            // Evaluate
            if(!success){
                const isLastAttempt = i + 1 === retryLimit;
                if(isLastAttempt){
                    // Abort the current retry step in case we reached the retry limit.
                    log.severe({
                        context: CONTEXT,
                        message: 'Retry limit reached with NO success. Giving up.'
                    });

                    // Rise an exception
                    throw new Error('Partial exchange data is NOT allowed.');
                }
            }else{
                // Return
                return response;
            }
        } catch (failure) {
            // On Failure:

            log.error({
                context: CONTEXT,
                message: ('Incomplete exchange DATA request.\n' + failure)
            });

            // Bubble up the error and terminate.
            // Let the outer try/catch handle the message and the stack.
            throw failure;
        }
    }
};
//}}}1

// @public async exportExchangeData(filepath, stateData, retryLimit) {{{1
//
//  ARGS:
//      filepath    : Path to the JSON cache file
//      stateData   : Data object
//      retryLimit  : Number of the possible retry attempts
//  INFO:
//      This is a wrapped async call with a send.
//
const exportExchangeData = async (filepath, stateData, { retryLimit = 1 }) => {

    // Initialise
    let send, success;
    const CONTEXT = 'exportExchangeData';

    // Cycle
    for (let i = 0; i < retryLimit; i++) {
        try {
            // Start Label
            log.label({
                verbosity: 1,
                colour: white.inverse,
                message: 'exchange_data_export [ATTEMPT {0} of {1}] ({2})'.stringFormatter((i+1), retryLimit, 'START')
            });

            // Send
            send = await sendExchangeData(filepath, stateData);

            if(send){
                // On SUCCESS, update status flag.
                success = true;

                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'CACHE_EXPORT_STATUS: {0}'.stringFormatter('SUCCESS')
                });

                // Success Label
                log.label({
                    verbosity: 1,
                    colour: white.inverse,
                    message: 'exchange_data_export [SUCCESS] ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
                });

                // Return
                return true;
            }else{
                // On FAILURE, update status flag.
                success = false;

                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'CACHE_EXPORT_STATUS: {0}'.stringFormatter('FAILURE')
                });
            }

            // Error Label
            log.label({
                verbosity: 1,
                colour: red.inverse,
                message: 'exchange_data_export [FAILED] ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
            });

            // Evaluate
            if(!success){
                const isLastAttempt = i + 1 === retryLimit;
                if(isLastAttempt){
                    // Abort the current retry step in case we reached the retry limit.
                    log.severe({
                        context: CONTEXT,
                        message: 'Retry limit reached with NO success. Giving up.'
                    });

                    // Rise an exception
                    throw new Error('Unable to export exchange data.');
                }
            }else{
                // Return
                return success;
            }
        }catch(failure){
            log.error({
                context: CONTEXT,
                message: 'Exchange DATA export stage has failed.'
            });

            // Bubble up the error and terminate.
            // Let the outer try/catch handle the message and the stack.
            throw failure;
        }
    }
};
//}}}1

// validateCache(id) {{{1
function validateCache(cache, pair) {

    // Initialise
    const CONTEXT = 'validateCache';

    let result = {
        current: false,
        previous: false,
        upToDate: false
    };

    try {
        if (cache.data.current.hasOwnProperty(pair) &&
            cache.data.current[pair].hasOwnProperty('signature') &&
            cache.data.current[pair].signature.success) {
            log.info({
                context: CONTEXT,
                verbosity: 1,
                message: ('STATE_CACHE:' + pair.toUpperCase() + ':CURRENT field checks fine.')
            });
            result.current = true;
        } else {
            log.warning({
                context: CONTEXT,
                verbosity: 1,
                message: ('STATE_CACHE:' + pair.toUpperCase() + ':CURRENT field is missing or incomplete.')
            });
            result.current = false;
        }

        if (cache.data.previous.hasOwnProperty(pair) &&
            cache.data.previous[pair].hasOwnProperty('signature') &&
            cache.data.previous[pair].signature.success) {
            log.info({
                context: CONTEXT,
                verbosity: 1,
                message: ('STATE_CACHE:' + pair.toUpperCase() + ':PREVIOUS field checks fine.')
            });
            result.previous = true;
        } else {
            log.warning({
                context: CONTEXT,
                verbosity: 1,
                message: ('STATE_CACHE:' + pair.toUpperCase() + ':PREVIOUS field is missing or incomplete.')
            });
            result.previous = false;
        }

        // Check the incoming state for the required properties.
        if (cache.data.current.hasOwnProperty(pair) &&
            cache.data.current[pair].hasOwnProperty('signature') &&
            cache.data.current[pair].signature.hasOwnProperty('timestamp') &&
            result.current) {

            let stateCacheTime = new Date(cache.data.current[pair].signature.timestamp);
            let currentTime = new Date();

            // DEBUG: Test dates.
            // let stateCacheTime = new Date('Jan 6, 2019 19:15:28');
            // let currentTime = new Date('Jan 6, 2019 19:30:27');

            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: '<CURRENT_TIME> ' + currentTime + ' <STATE_CACHE:' + pair.toUpperCase() + ':TIME> ' + stateCacheTime,
            });

            // Get timestamp difference and limits.
            let currentAgeObj = new utils.getAge(currentTime, stateCacheTime);
            let diff = currentAgeObj.getDiff();

            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'STATE_CACHE is (' + diff.days + ') days, (' + diff.hours + ') hours, (' + diff.minutes + ') minutes and (' + diff.seconds + ') seconds old.'
            });

            let limit = config.get('STATE_CACHE_FILE_AGE_LIMIT');

            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'AGE_LIMIT for the STATE_CACHE is (' + limit.days + ') days, (' + limit.hours + ') hours, (' + limit.minutes + ') minutes and (' + limit.seconds + ') seconds.'
            });

            if(!currentAgeObj.isUpToDate(limit)){
                log.warning({
                    context: CONTEXT,
                    verbosity: 1,
                    message: ('STATE_CACHE:' + pair.toUpperCase() + ':DATA is out of date.')
                });
                result.upToDate = false;
            } else {
                log.info({
                    context: CONTEXT,
                    verbosity: 1,
                    message: ('STATE_CACHE:' + pair.toUpperCase() + ':DATA is up to date.')
                });
                result.upToDate = true;
            }
        } else {
            throw new Error('Invalid STATE_CACHE_DATA.');
        }
    } catch (error) {
        log.severe({
            context: CONTEXT,
            message: ('STATE_CACHE validation has failed.\n' + error)
        });
    }

    // Return
    return result;
}
// }}}1

// Update {{{1
const update = async () => {
    // Start request state.
    requestInterval.setState('isRequestActive', true);

    let CONTEXT = 'update';

    // Exchange Request Cycle Label
    log.label({
        verbosity: 1,
        colour: blue.inverse,
        message: 'exchange_request_cycle ({0})'.stringFormatter('START')
    });

    // Handle current/previous relation-ship here.
    if(data.getInfo('current', 'timestamp') != null && data.getInfo('current', 'success')){
        log.debug({
            context: CONTEXT,
            verbosity: 7,
            message: 'CURRENT data is available and will be stored as PREVIOUS data prior to the exchange call.'
        });

        // Deep-copy 'current' to 'previous'. As a result both fields would have the same values at this point.
        data.shuffleData('current', 'previous');
    }

    // Run the exchange request.
    try {
        // Make a data request, so that we can reconstruct any missing bits
        // of the incoming state cache.
        let exchangeData = await getExchangeData(EXCHANGE, PAIR, SYMBOLS,
            { retryLimit: 3 },
            { allowPartial: true }
        );

        // Update the data container. Propagate only the assets with a success flag.
        data.updateField('current', exchangeData, { forceGranularity: true });

        // Cache the updated data container.
        try {
            log.info({
                context: CONTEXT,
                message: ('Attempting to generate a fresh data state cache.')
            });

            await exportExchangeData(globals.get('STATE_CACHE_FILE'), data.exportState(),
                { retryLimit: config.get('EXCHANGE_DATA_EXPORT_RETRY_LIMIT') },
            );

            log.info({
                context: CONTEXT,
                message: ('Data state cached successfully.')
            });
        } catch(error) {
            // Soft Error
            log.severe({
                context: CONTEXT,
                message: ('Data state EXPORT has failed.\n' + error)
            });
        }

        if(WEBSOCKETS_IS_ACTIVE){
            // Prepare the payload.
            let payload = utils.generatePayload(data.exportState());

            // Call the emission hook within the web-socket loop.
            activeWebSocketEmission(payload);
        }

        // Success Label
        log.label({
            verbosity: 1,
            colour: blue.inverse,
            message: 'exchange_request_cycle [SUCCESS] ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
        });
    } catch(error) {
        // Error Label
        log.label({
            verbosity: 1,
            colour: red.inverse,
            message: 'exchange_request_cycle [FAILED] ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
        });

        // Let the service know about the data feed failure.
        globals.set('DATA_FEED_IS_ACTIVE', false);

        log.severe({
            context: CONTEXT,
            message: ('Failed to propagate exchange data.\n' + error)
        });
    }

    // End the request state here.
    requestInterval.setState('isRequestActive', false);
};
// }}}1

// Define Active WebSocket Emission Hook {{{1
var activeWebSocketEmitter = function() {};
//
// }}}1

// Define a hook for the active websocket emission point. {{{1
var activeWebSocketEmission = function(input) {
    activeWebSocketEmitter(input);
};
// }}}1

/*------------------------------;
 ; Initialize Server Components ;
 ------------------------------*/
// initExpress() {{{1
const initExpress = (() => {
    const CONTEXT = 'initExpress';

    const app = express();
    const PORT = 9001;

    log.info({
        context: CONTEXT,
        verbosity: 3,
        message: ('Starting REST API server.')
    });

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    const routes = assetRoutes.getRoutes;
    routes(app);

    app.get('/', (req, res) =>
        res.send(`REST API server is running on port ${PORT}`)
    );

    app.listen(PORT, () =>
        // console.log(`REST API server is running on port ${PORT}`)
        log.info({
            context: CONTEXT,
            verbosity: 3,
            message: (`REST API server is running on port ${PORT}`)
        })
    );
});
// }}}1

// initWebSocket() {{{1
function initWebSocket() {
    // Default message.
    const CONTEXT = 'initWebSocket';

    var wss = new WebSocketServer({ port: 9000 });

    log.info({
        context: CONTEXT,
        verbosity: 3,
        message: ('Starting websocket server.')
    });

    var dataSchema = schema.webSocketTemplate;
    const message = {
        serverAppName: 'Price Table Server',
        serverVersion: APP_VERSION,
    };

    dataSchema['message'] = message;

    // This needs to be in the message section (onMessage) is still an option as we
    // might need to send an input from the client.
    wss.on('connection', function(ws) {
        /*------------------------------------------------------------------;
         ; This section runs only on a 'message receive from client' event. ;
         ------------------------------------------------------------------*/
        // on.message {{{2
        ws.on('message', (message) => {
            let incomingTransmission = JSON.parse(message);
            console.log('[server:onConnection:onMessage]');

            // Handle the requests from the client.
            dataSchema.records.clientInput = incomingTransmission;

            // Update the communication record to indicate that the client has sent
            // the server some information.
            dataSchema.flags.hasClientInput = true;
            dataSchema.flags.isFirstTransmission = false;

            // Insert the payload.
            dataSchema.package = utils.generatePayload(data.exportState());

            // Sending the payload to all clients.
            wss.clients.forEach((client) => {
                // Prepare for transmission.
                let transmission = JSON.stringify(dataSchema);

                // Debug
                console.log('[server:onConnection:onMessage]');

                // Send the transmission.
                client.send(transmission);
            });
        });
        //}}}2
        // Plug the ACTIVE emission hook. {{{2
        activeWebSocketEmitter = function(input) {
            // Debug the input data stream.
            // console.log('INPUT_STREAM:', input);

            // Insert the payload.
            dataSchema.package = input;

            // Then update the carrier.
            dataSchema.records.serverUpdate = true;
            dataSchema.records.clientInput = null;
            dataSchema.records.feedActive = globals.get('DATA_FEED_IS_ACTIVE');
            dataSchema.flags.isFirstTransmission = false;
            dataSchema.flags.hasClientInput = false;

            // Sending the payload to all clients.
            wss.clients.forEach((client) => {
                // Prepare for transmission.
                let transmission = JSON.stringify(dataSchema);

                // Debug
                // console.log('[server:onConnection:onUpdate] Sending:\n', transmission);
                console.log('[server:onConnection:onUpdate]');

                // Send the transmission.
                client.send(transmission);

                // Reser flag.
                dataSchema.records.server_update = false;
            });
        };
        //}}}2
        /*-------------------------------------------------;
        ; This section runs only once at first connection. ;
        ;-------------------------------------------------*/
        // Data schema updates.
        dataSchema.flags.isFirstTransmission = true;

        // Sending the payload to all clients.
        wss.clients.forEach((client) => {
            // Prepare for transmission.
            let transmission = JSON.stringify(dataSchema);

            // Debug
            // console.log('[server:onConnection:init] Sending:\n', transmission);
            console.log('[server:onConnection:init]');

            // Send the transmission.
            client.send(transmission);
        });
    });
}
//}}}1

/** MAIN (async) {{{1
 *  This is the main async block.
 */

/*------;
 ; MAIN ;
 ------*/
(async () => {
    const CONTEXT = 'main';
    let exchangeData = {};

    // Initialise Data Structure
    data.init(schema.dataTemplate);

    // Populate the DATA section.
    // We need the key/val pairs to be lower-case, for that reason we are
    // pulling the 'pairs' and 'assets' lists from their original configuration
    // entries.
    ['current','previous'].map(element => (
        data.update({
            section: 'data',
            element: element,
            value: serializeLists(config.get('PAIRS'), config.get('ASSETS')),
        })
    ));

    // Importing
    let exchangeDataImportRetryLimit = config.get('EXCHANGE_DATA_IMPORT_RETRY_LIMIT');
    let stateCacheImportRetryLimit = config.get('STATE_CACHE_IMPORT_RETRY_LIMIT');
    let exchangeDataImportIsSuccess, doExportStateCache;
    let stateCache, isStateCacheValid;

    // Exporting
    let exchangeDataExportRetryLimit = config.get('EXCHANGE_DATA_EXPORT_RETRY_LIMIT');

    /*---------------------------;
    ; Exchange Data Cache Import ;
    ;---------------------------*/
    try {
        stateCache = await getStateCache(config.get('STATE_CACHE_FILE'),
            { retryLimit: stateCacheImportRetryLimit }
        );

        // Validate
        if(!stateCache){
            isStateCacheValid = {
                current: false,
                previous: false,
                upToDate: false
            };
        }else{
            // TODO: Implement some kind of a while loop.
            // properties are getting overwritten here!!!
            for (const pair of PAIRS) {
                isStateCacheValid = validateCache(stateCache, pair.toLowerCase());

                log.debug({
                    context: CONTEXT,
                    verbosity: 5,
                    message: 'Incoming STATE_CACHE_FLAGS:\n\tCURRENT:{0}, PREVIOUS:{1}, UP_TO_DATE:{2}'
                        .stringFormatter(
                            isStateCacheValid.current.toString(),
                            isStateCacheValid.previous.toString(),
                            isStateCacheValid.upToDate.toString()
                        )
                });
            }
        }

    } catch(error) {
        // Hard Error, terminate.
        log.error({
            context: CONTEXT,
            message: ('Cached state data import has failed.\n' + error.stack)
        });

        log.warning({
            context: CONTEXT,
            verbosity: 1,
            message: ('Attempting to generation a new exchange state cache.')
        });
    }

    // Continue with a new exchange data request only if one of the fields is available in the state
    // cache or the cache data is out of date. If the existing field is the 'current' field, then
    // shift the data from the 'current' field to the 'previous' field and store any fresh data from
    // the latest exchange request as the new 'current' data. For cases where the existing field is
    // the previous field, simply pipe the fresh data into the 'current' field.

    if (!isStateCacheValid.current || !isStateCacheValid.previous || !isStateCacheValid.upToDate) {
        /*------------------------------;
        ; NEEDED: Exchange Data Request ;
        ;------------------------------*/
        for (const pair of PAIRS) {
            try {
                // Make a data request, so that we can reconstruct any missing bits
                // of the incoming state cache.
                exchangeData = await getExchangeData(EXCHANGE, pair, ASSETS,
                    { retryLimit: exchangeDataImportRetryLimit },
                    { allowPartial: false }
                );

                // Exchange Data Request Failed, throw an exception.
                if(!exchangeData){
                    exchangeDataImportIsSuccess, doExportStateCache = false;
                    throw new Error('Unable to import ticker data bundle for: ' + pair.toUpperCase() + ', from: ' + EXCHANGE.toUpperCase());
                }

                // Exchange Data Request succeeded.
                // ... update the main flag.
                exchangeDataImportIsSuccess, doExportStateCache = true;

                // ... update the data container
                if (isStateCacheValid.upToDate) {
                    if (isStateCacheValid.current && !isStateCacheValid.previous) {
                        // The 'current' field exists inside the incoming cache data, however the
                        // 'previous' field is non-existent. When reconstructing the data container, we
                        // should be shifting the 'current' field into the 'previous' field and piping
                        // the fresh data into the 'current' field.

                        log.debug({
                            context: CONTEXT,
                            verbosity: 7,
                            message: ('STATE_CACHE[CURRENT] field:' + isStateCacheValid.current + '\nSTATE_CACHE[PREVIOUS] field:' + isStateCacheValid.previous)
                        });

                        // CACHE:CURRENT -> DATA:PREVIOUS (as the cache will always
                        // be older than the exchange request).
                        // (OLD WAY) data.updateField('previous', stateCache.data.current, { forceGranularity: false });
                        console.log(stateCache.data.current[pair]);
                        data.update({
                            section: 'data',
                            field: 'previous',
                            element: pair.toLowerCase(),
                            value: stateCache.data.current[pair.toLowerCase()],
                        });

                        // EXCHANGE_DATA -> DATA:CURRENT (as the latest exchange
                        // request should hold the fresh ticker data).
                        // We assume that both the "cacheState" and the
                        // "exchangeRequest" hold complete ticker information.
                        // (OLD WAY) data.updateField('current', exchangeData, { forceGranularity: false });
                        data.update({
                            section: 'data',
                            field: 'current',
                            element: pair.toLowerCase(),
                            value: exchangeData,
                        });
                    }

                    if (!isStateCacheValid.current && isStateCacheValid.previous) {
                        // The 'current' field is non-existent, but the 'previous'
                        // field exists. We should pipe the fresh data straight into
                        // the 'current' field.

                        log.debug({
                            context: CONTEXT,
                            verbosity: 7,
                            message: ('STATE_CACHE[CURRENT] field:' + isStateCacheValid.current + '\nSTATE_CACHE[PREVIOUS] field:' + isStateCacheValid.previous)
                        });

                        // CACHE:PREVIOUS -> DATA:PREVIOUS (as the cache will always
                        // be older than the exchange request).
                        // (OLD WAY) data.updateField('previous', stateCache.data.previous, { forceGranularity: false });
                        data.update({
                            section: 'data',
                            field: 'previous',
                            element: pair.toLowerCase(),
                            value: stateCache.data.previous[pair.toLowerCase()],
                        });

                        // EXCHANGE:DATA -> DATA:CURRENT (as the latest exchange
                        // request should hold the fresh ticker data).
                        // We assume that both the "cacheState" and the
                        // "exchangeRequest" hold complete ticker information.
                        // (OLD WAY) data.updateField('current', exchangeData, { forceGranularity: false });
                        data.update({
                            section: 'data',
                            field: 'current',
                            element: pair.toLowerCase(),
                            value: exchangeData,
                        });
                    }
                } else {
                    // Cache data is too old, just set the 'current' field. We will
                    // not be able to calculate a difference until we have a proper
                    // previous/current relation, which should be established once
                    // the cycle runs on the next step.
                    // (OLD WAY) data.updateField('current', exchangeData, { forceGranularity: false });
                    data.update({
                        section: 'data',
                        field: 'current',
                        element: pair.toLowerCase(),
                        value: exchangeData,
                    });
                }

            } catch(error) {
                // Hard Error, terminate.
                exchangeDataImportIsSuccess, doExportStateCache = false;
                log.severe({
                    context: CONTEXT,
                    message: ('Exchange data IMPORT has failed.\n' + error.stack)
                });

                // Terminate
                process.exit(1);
            }
        }
    } else {
        /*----------------------------------;
        ; NOT NEEDED: Exchange Data Request ;
        ;----------------------------------*/
        // No need to re-cache the state cache.
        doExportStateCache = false;

        try {
            log.info({
                context: CONTEXT,
                message: ('Imported state cached is complete. No need for an exchange data request.')
            });

            // Populate the data container with the cache data.
            // (OLD WAY) data.updateField('previous', stateCache.data.previous, { forceGranularity: false });
            data.update({
                section: 'data',
                element: 'previous',
                value: stateCache.data.previous
            });

            // (OLD WAY) data.updateField('current', stateCache.data.current, { forceGranularity: false });
            data.update({
                section: 'data',
                element: 'current',
                value: stateCache.data.current
            });
        } catch(failure) {
            // Hard Error, terminate.
            log.severe({
                context: CONTEXT,
                message: ('Internal data failure has occured.\n' + failure.stack)
            });
        }
    }

    /*------------------;
    ; Data State Export ;
    ;-------------------*/
    // Needed only in cases where the incoming state cache has been improved.
    if(doExportStateCache){
        try {
            log.info({
                context: CONTEXT,
                message: ('Attempting to generate a fresh data state cache.')
            });

            await exportExchangeData(config.get('STATE_CACHE_FILE'), data.exportState(),
                { retryLimit: exchangeDataExportRetryLimit },
            );

            log.info({
                context: CONTEXT,
                message: ('Data state cached successfully.')
            });
        } catch(error) {
            // Hard Error, terminate.
            log.severe({
                context: CONTEXT,
                message: ('Data state EXPORT has failed.\n' + error.stack)
            });
        }
    }

    /*---------------;
    ; Start Services ;
    ;---------------*/
    try {
        console.log('*** ALL SERVICES DISABLED! ***');
        // Services
        // --> requestInterval.runInterval(1, 0, function() {
        // -->    update();
        // --> });
        //initWebSocket();
        // --> initExpress();
    } catch(err) {
        log.severe({
            context: CONTEXT,
            message: ('Main service has failed!\n' + err.stack)
        });
        process.exit(1);
    }
})();
// }}}1

// vim: fdm=marker ts=4
