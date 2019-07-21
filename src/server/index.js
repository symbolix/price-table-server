/*!
 * Price Table Server
 * Copyright(c) 2018 Milen Bilyanov
 * Copyright(c) 2017-2019 tradekit.io
 *
 * MIT Licensed
 */

'use strict';

// Project Imports
const { cyan, white, red, green, yellow, blue } = require ('ansicolor');
const { table } = require('table');
var WebSocketServer = require('ws').Server;
const express = require('express');
const bodyParser = require('body-parser');

// Local Imports
const logging = require('./lib/logging');
const utils = require('./lib/utils');
const data = require('./lib/data-container');
const globals = require('./lib/globals');
const config = require('./lib/config');
const tables = require('./lib/tables');
const schema = require('./lib/data-schema.js');
const timers = require('./lib/timers.js');
const assetRoutes = require('./lib/api/routes/assetRoutes');
const sockets = require('./lib/socket/socketObject');
const telemetry = require('./lib/telemetry');

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

// Exchange
const EXCHANGE = config.get('EXCHANGE');

// Assets
const ASSETS = config.get('ASSETS').map(asset => asset.toUpperCase());

// Globals
const APP_NAME = globals.get('APP_NAME');
const APP_VERSION = globals.get('APP_VERSION');
const STATE_CACHE_FILE = config.get('STATE_CACHE_FILE');

// Intro
!config.get('SILENT') && console.log(`\n${APP_NAME} ${APP_VERSION}`);

// Logging
const log = logging.getLogger();

// Interval
let requestInterval = new timers.Interval('request');

// Socket Layer
let SocketObject = new sockets.Layer(schema.webSocketTemplate, APP_NAME, APP_VERSION);

// Telemetry Layer
let TelemetryObject = new telemetry.Layer(schema.diagnosticsTemplate);

/*--------------------;
 ; Server Application ;
 ;--------------------*/

/** @public generatePairAssetContainer(pairs, assets) {{{1
 *
 *  This is an async fetch call wrapping the cached date request.
 *
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

/** @public async fetchCachedData(filepath) {{{1
 *
 *  This is an async fetch call wrapping the cached date request.
 *
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

/** @public async fetchExchangeData(id, pair, symbols, passThrough) {{{1
 *
 * This is an async fetch call wrapping the exchange request. The _id_ is the exchange id
 * as a string. The _pair_ argument is the fiat pair identifier. The _symbols_
 * argument is an array of asset symbols. The _passThrough_ parameter is
 * a boolean that controls if we are strict or not strict about returning valid
 * data.
 *
 * @param {String} id
 * @param {String} pair
 * @param {Array} symbols
 * @param {Boolean} passThrough
 *
 */

const fetchExchangeData = async (id, pair, symbols, { passThrough=false }) => {
    const CONTEXT = 'fetchExchangeData';
    let response = false;

    try {
        // Make the async call and wait for the response.
        response = await utils.sendExchangeRequest(id, pair, symbols);

        if(!response){
            // In case the response is silent.
            TelemetryObject.dataFeedState = 'offline';

            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'FETCH_REQUEST_STATUS: {0}'.stringFormatter('FALSE')
            });
        }else{
            if(!response.signature.success){
                // There is a response, but might be partial.
                TelemetryObject.dataFeedState = 'degraded';

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
                // The response is good.
                TelemetryObject.dataFeedState = 'online';

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

/** @public async sendExchangeData(filepath, data) {{{1
 *
 * This is a promise wrapper for the send-cache request. Expects a _filepath_
 * argument for the name of the file that will be used to store the JSON cache
 * and a _data_ argument which is the JSON data object.
 *
 * @param {String} filepath
 * @param {Object} data
 */

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

/** @public async getStateCache(filepath, { retryLimit }) {{{1
 *
 * This is a wrapped async call with a fetch. The _filepath_ argument is the file location for
 * the state cache file. The _allowPartial_ parameter is a boolean used to allow partial responses
 * and will not enforce any retries.
 * (https://dev.to/ycmjason/javascript-fetch-retry-upon-failure-3p6g)
 *
 * @param {string} filepath
 * @param {boolean} allowPartial:
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

/** @public async getExchangeData(id, pair, symbols, retryLimit, allowPartial) {{{1
 *
 * This is a wrapped async call with a fetch. The _id_ is the exchange id string.
 * The _pair_ argument is a fiat pair code. The _symbols_ is an array of asset ticker symbols.
 * The _retryLimit_ is the number of the possible retry attempts. The _allowPartial_ boolean will
 * allow partial responses and will not enforce a retry operation if 'true'.
 * (https://dev.to/ycmjason/javascript-fetch-retry-upon-failure-3p6g)
 *
 * @param {String} id
 * @param {Array} pair
 * @param {Intiger} retryLimit
 * @param {Boolean} allowPartial
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
                    TelemetryObject.dataFeedState = 'online';

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

                    // Partial Succes / Soft Failure
                    TelemetryObject.dataFeedState = 'degraded';

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

                // No Success
                TelemetryObject.dataFeedState = 'offline';

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
            TelemetryObject.dataFeedState = 'offline';

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

/** @public async exportExchangeData(filepath, stateData, retryLimit) {{{1
 *
 * This is a wrapper for the 'sendExchangeData' async call. The _filepath_ parameter is the path
 * to the JSON cache file. The _stateData_ argument is the data object. The _retryLimit_ is the number
 * of the possible retry attempts.
 *
 * @param {String} filepath
 * @param {Object} stateData
 * @param {Intiger} retryLimit
 */

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

/** @public update() {{{1
 *
 * A request wrapper that is designed to run at each interval.
 */

const update = async () => {
    // Start request state.
    requestInterval.setState('isRequestActive', true);

    let CONTEXT = 'update';

    try {
        // Exchange Request Cycle Label
        log.label({
            verbosity: 1,
            colour: blue.inverse,
            message: 'exchange_request_cycle ({0})'.stringFormatter('START')
        });

        // Handle current/previous relation-ship here.
        let isTimestampValid, isSuccess = true;

        // DEBUG - TEST: Simulate missing timestamp and unsuccessful states.
        // data.update({
        //     section: 'data',
        //     field: 'current',
        //     pair: 'usd',
        //     element: 'signature',
        //     value: {
        //         timestamp: null,
        //         success: false
        //     }
        // });
        // DEBUG - TEST

        // Probe timestamp and success flags for the pair(s).
        for (const pair of PAIRS) {
            let getTimestamp = data.query({
                section: 'data',
                field: 'current',
                pair: pair.toLowerCase(),
                component: 'signature',
                element: 'timestamp'
            });

            if(!getTimestamp){
                isTimestampValid = false;
            }

            // Prevent reset if already 'false'.
            if(getTimestamp && isTimestampValid != false){
                isTimestampValid = true;
            }

            let getSuccess = data.query({
                section: 'data',
                field: 'current',
                pair: pair.toLowerCase(),
                component: 'signature',
                element: 'success'
            });

            if(!getSuccess){
                isSuccess = false;
            }

            // Prevent reset if already 'false'.
            if(getSuccess && isSuccess != false){
                isSuccess = true;
            }
        }

        // Evaluate timestamp and success results.
        if(isTimestampValid && isSuccess){
            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'CURRENT data is available and will be stored as PREVIOUS data prior to the exchange call.'
            });

            // Deep-copy 'current' to 'previous'. As a result both fields would have the same values at this point.
            data.shuffleData('current', 'previous');
        }else{
            log.warning({
                context: CONTEXT,
                verbosity: 7,
                message: 'No CURRENT data is detected. No updates will be performed on the PREVIOUS data prior to the exchange call.'
            });
        }

        let validators = [];

        // Run the exchange request(s).
        for (const pair of PAIRS) {
            try {
                // Make a data request, so that we can reconstruct any missing bits
                // of the incoming state cache.
                let exchangeData = await getExchangeData(EXCHANGE, pair, SYMBOLS,
                    { retryLimit: 3 },
                    { allowPartial: true }
                );

                // Accumulate the validators here.
                // Basically create an array of states: [true, true, true, false, true ...]
                Object.keys(exchangeData['assets']).forEach((a) => validators.push(exchangeData['assets'][a]['success']));

                // Update the data container. Propagate only the assets with a success flag.
                data.updatePair(
                    pair.toLowerCase(),
                    exchangeData, { forceGranularity: true }
                );
            }catch(error){
                // Soft Error
                log.severe({
                    context: CONTEXT,
                    message: ('Exchange data request has failed!\n' + error.stack)
                });

                // Update Telemetry
                TelemetryObject.dataFeedState = 'offline';
            }
        }

        // Evaluate the data feed integrity.
        let consolidatedValidators = validators
            .map((flag) => { return flag = flag ? 1 : 0; })
            .filter(e => e > 0)
            .reduce((acc, val) => { return acc + val; }, 0);

        if (consolidatedValidators == validators.length) {
            TelemetryObject.dataFeedState = 'online';
        } else {
            if (consolidatedValidators == 0) {
                TelemetryObject.dataFeedState = 'offline';
            } else {
                TelemetryObject.dataFeedState = 'degraded';
            }
        }

        // Cache the updated data container.
        try {
            log.info({
                context: CONTEXT,
                message: ('Attempting to generate a fresh data state cache.')
            });

            await exportExchangeData(STATE_CACHE_FILE, data.exportState(),
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
                message: ('Data state EXPORT has failed.\n' + error.stack)
            });
        }

        // Call the emission hook within the web-socket loop.
        activeWebSocketEmission( {signal: true, dataFeed:  TelemetryObject.query('dataFeedState')} );

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
        TelemetryObject.dataFeedState = 'offline';

        log.severe({
            context: CONTEXT,
            message: ('Failed to propagate exchange data.\n' + error.stack)
        });
    }

    // End the request state here.
    requestInterval.setState('isRequestActive', false);
};
// }}}1

/** @public activeWebSocketEmitter() {{{1
 * Defines an active WebSocket emission hook.
 */

var activeWebSocketEmitter = function() {};
// }}}1

/** @public activeWebSocketEmission() {{{1
 *
 * Define an entry point for the active websocket emission hook.
 */

var activeWebSocketEmission = function(input) {
    activeWebSocketEmitter(input);
};
// }}}1

/*------------------------------;
 ; Initialize Server Components ;
 ------------------------------*/

/** @public initExpress() {{{1
 *
 * Initialize the Express.js setup.
 */

const initExpress = (() => {
    // To test in terminal: curl -v http://localhost:9001/assets/eur | jq
    const CONTEXT = 'initExpress';

    const app = express();
    const PORT = 9001;

    log.info({
        context: CONTEXT,
        verbosity: 3,
        message: (`Starting REST API server on port: ${PORT}`)
    });

    // Custom exception handler.
    // https://stackoverflow.com/questions/47163872/customized-error-handling-in-express-js
    function stderrHandler(err, req, res, next){
        if(!err){
            return next();
        }else{
            log.error({
                context: 'stderrHandler',
                message: ('Request has failed with the following exception:\n' + err.stack)
            });
            res.status(500).send({
                status:500,
                details: 'REQUEST_ERROR',
                type:'internal',
                message: err.message
            });
        }
    }

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    // Init app.
    const routes = assetRoutes.getRoutes;
    routes(app);

    // Has to be after the app initialization stage.
    app.use(stderrHandler);

    app.get('/', (req, res) =>
        res.send(`REST API server is running on port ${PORT}`)
    );

    app.listen(PORT, () =>
        log.info({
            context: CONTEXT,
            verbosity: 3,
            message: (`REST API server is running on port ${PORT}`)
        })
    );
});
//}}}1

/** @public initWebSocket() {{{1
 *
 * Initialize the WS setup.
 */

function initWebSocket() {
    // Default message.
    const CONTEXT = 'initWebSocket';

    const PORT = 9000;
    var wss = new WebSocketServer({ port: PORT });

    log.info({
        context: CONTEXT,
        verbosity: 3,
        message: (`Starting WEBSOCKETS server on port: ${PORT}`)
    });

    // Message Defaults
    SocketObject.message = {
        event: null,
        contents: null
    };

    // ON MESSAGE {{{2
    // THIS NEEDS TO BE WRAPPED SO THAT WE GET A REPLY FOR INDIVIDUAL CLIENTS.
    // RIGHT NOW, ANY MESSAGES THAT HAS THE AIM TO INFLUENCE THE SERVER WILL
    // CHANGE THE SERVER STATE FOR ALL USERS?
    wss.on('message', (message) => {
        let incomingTransmission = JSON.parse(message);
        console.log('[server:onConnection:onMessage] ***[BEGIN]***');

        // Handle the requests from the client.
        SocketObject.message = {
            event: 'onMessage',
            contents: 'RECEIVED_REQUEST_FROM_CLIENT'
        };

        SocketObject.clientInput = incomingTransmission;
        SocketObject.isDataFeedActive = TelemetryObject.query('isDataFeedActive');

        // Insert the payload.
        SocketObject.payload = { signal: true };
        SocketObject.dataFeed = { dataFeed: TelemetryObject.query('dataFeedState') };

        // Sending the payload to all clients.
        wss.clients.forEach((client) => {
            // Prepare for transmission.
            let transmission = JSON.stringify(SocketObject.query());

            // Debug
            console.log('[server:onConnection:onMessage] \t__SEND__(_start)__');

            // Send the transmission.
            client.send(transmission);

            // Debug
            console.log('[server:onConnection:onMessage] \t__SEND__(finish)__');
            console.log('[server:onConnection:onMessage] ***[END__]***');
        });
    });
    //}}}2

    // Plug the ACTIVE emission hook. {{{2
    activeWebSocketEmitter = (input) => {
        // Debug the input data stream.
        console.log('INPUT_STREAM:', input);

        // Data schema updates.
        SocketObject.message = {
            event: 'onUpdate',
            contents: 'DATA_FEED_SIGNAL_BROADCASTED'
        };

        // Insert the payload.
        SocketObject.payload = input.signal;

        // Then update the carrier.
        SocketObject.clientInput = null;
        SocketObject.dataFeed = input.dataFeed;
        SocketObject.isDataFeedActive = TelemetryObject.query('isDataFeedActive');

        // Sending the payload to all clients.
        // Once we have an updated data set, let's signal to all the clients so
        // that they poll the fresh data.
        wss.clients.forEach((client) => {
            // Prepare for transmission.
            let transmission = JSON.stringify(SocketObject.query());

            // Debug
            console.log('[server:onConnection:onUpdate]');

            // Send the transmission.
            client.send(transmission);
        });
    };
    //}}}2

    // ON CONNECTION {{{2
    wss.on('connection', (ws) => {
        /*-------------------------------------------------;
        ; This section runs only once at first connection. ;
        ;-------------------------------------------------*/
        console.log('[server:onConnection:init]');

        // Data schema updates.
        SocketObject.message = {
            event: 'onConnection',
            contents: 'STREAM_INITIALIZED'
        };

        // Insert the payload.
        SocketObject.payload = { signal: true };
        SocketObject.dataFeed = TelemetryObject.query('dataFeedState');
        SocketObject.isDataFeedActive = TelemetryObject.query('isDataFeedActive');

        // Bundle the transmission.
        let transmission = JSON.stringify(SocketObject.query());

        // Sending the payload to all clients.
        ws.send(transmission);
    });
    //}}}2
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
    let stateCache, isStateCacheValid, stateCacheValidationTable, tableColour;

    // Exporting
    let exchangeDataExportRetryLimit = config.get('EXCHANGE_DATA_EXPORT_RETRY_LIMIT');

    /*---------------------------;
    ; Exchange Data Cache Import ;
    ;---------------------------*/
    try {
        stateCache = await getStateCache(STATE_CACHE_FILE,
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
            let accumulateStateCacheValidators = utils.generateStateCacheValidators(stateCache, config.get('PAIRS'));
            let consolidatedStateCacheValidators = utils.consolidateStateCacheValidators(accumulateStateCacheValidators);

            isStateCacheValid = consolidatedStateCacheValidators[0];
            stateCacheValidationTable = consolidatedStateCacheValidators[1];

            // Display validation table.
            let output = table(stateCacheValidationTable);

            if (!isStateCacheValid.current || !isStateCacheValid.previous || !isStateCacheValid.upToDate) {
                tableColour = yellow;
            }else{
                tableColour = cyan;
            }

            log.info({
                context: CONTEXT,
                verbosity: 7,
                message: 'Cache validation results:\n' + tableColour(output),
            });

            log.debug({
                context: CONTEXT,
                verbosity: 5,
                message: 'Incoming STATE_CACHE_FLAGS: CURRENT ({0}), PREVIOUS ({1}), UP_TO_DATE ({2})'
                    .stringFormatter(
                        isStateCacheValid.current.toString(),
                        isStateCacheValid.previous.toString(),
                        isStateCacheValid.upToDate.toString()
                    )
            });
        }
    }catch(error){
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
        let validators = [];

        for (const pair of PAIRS) {
            try {
                // Make a data request, so that we can reconstruct any missing bits
                // of the incoming state cache.
                exchangeData = await getExchangeData(EXCHANGE, pair, ASSETS,
                    { retryLimit: exchangeDataImportRetryLimit },
                    { allowPartial: false }
                );

                // Accumulate the validators here.
                Object.keys(exchangeData['assets']).forEach((a) => validators.push(exchangeData['assets'][a]['success']));

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
            }catch(error){
                // Hard Error, terminate.
                exchangeDataImportIsSuccess, doExportStateCache = false;
                log.severe({
                    context: CONTEXT,
                    message: ('Exchange data IMPORT has failed.\n' + error.stack)
                });

                // Update Telemetry
                TelemetryObject.dataFeedState = 'offline';

                // Terminate
                process.exit(1);
            }
        }

        // Evaluate the data feed integrity.
        let consolidatedValidators = validators
            .map((flag) => { return flag = flag ? 1 : 0; })
            .filter(e => e > 0)
            .reduce((acc, val) => { return acc + val; }, 0);

        if (consolidatedValidators == validators.length) {
            TelemetryObject.dataFeedState = 'online';
        } else {
            if (consolidatedValidators == 0) {
                TelemetryObject.dataFeedState = 'degraded';
            } else {
                TelemetryObject.dataFeedState = 'offline';
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
            data.update({
                section: 'data',
                element: 'previous',
                value: stateCache.data.previous
            });

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

            await exportExchangeData(STATE_CACHE_FILE, data.exportState(),
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
        /* Data Feed Test */
        // TODO: Do a null check on the telemetry.
        let response;
        try {
            // Send the request.
            response = await utils.dataFeedTest(EXCHANGE);
            if(!response){
                // Failure
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'DATA_FEED_TEST_STATUS: {0}'.stringFormatter('FALSE')
                });

                // Let telemetry know we have data feed issues.
                TelemetryObject.dataFeedState = 'offline';
            }else{
                // Success
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'DATA_FEED_TEST_STATUS: {0}'.stringFormatter('TRUE')
                });
                // Let telemetry know we are good to go.
                TelemetryObject.dataFeedState = 'online';
            }
        } catch (failure) {
            // On Failure
            log.error({
                context: CONTEXT,
                message: ('Failed to complete dataFeed TEST request.')
            });

            // Do NOT throw any errors here. No need to kill the server.
        }

        /* Services */

        // Example interval API: runInterval(skip, interval, callback)
        // skip       : Skip that many minutes.
        // internval  : Wait for that many seconds (0-59 seconds).
        // callback   : What to do once the interval is complete.
        requestInterval.runInterval(1, 0, function() {
            update();
        });
        initWebSocket();
        initExpress();
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
