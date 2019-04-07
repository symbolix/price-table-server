'use strict';

// Project Imports
const { cyan, white, red, green, yellow, darkGray, blue } = require ('ansicolor');
const { table } = require('table');

// A simple server-side script that serves a JSON object.
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 9000 });

// Local Imports
const utils = require('./lib/utils');
const data = require('./lib/data-container');
const globals = require('./lib/globals');
const config = require('./lib/configs');
const logging = require('./lib/logging');
const tables = require('./lib/tables');
const schema = require('./lib/data-schema.js');

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

// Pair
const PAIR = 'EUR';

// Exchange
const EXCHANGE = 'kraken';

// Logging
const log = logging.getLogger();

// Globals
const APP_VERSION = globals.get('APP_VERSION');
var CLOCK_CYCLE_ACTIVE = false;

/*--------------------;
 ; Server Application ;
 ;--------------------*/

!config.get('SILENT') && console.log(`\nPrice Table Server ${APP_VERSION}`);

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

// @public async getStateCache(filepath, allowPartial) {{{1
//
//  ARGS:
//      filepath: File location for the state cache file.
//      allowPartial: Boolean, will allow partial responses and will not
//          enforce a retry operation.
//  INFO:
//      This is a wrapped async call with a fetch.
//
// (https://dev.to/ycmjason/javascript-fetch-retry-upon-failure-3p6g)
//
const getStateCache = async (filepath, { retryLimit = 1 }) => {

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

// @public async getExchangeData(id, pair, symbols, retryLimit, allowPartial) {{{1
//
//  ARGS:
//      id: The exchange id
//      pair: A fiat pair code
//      symbols: An array of asset ticker symbols
//      retryLimit: Number of the possible retry attempts
//      allowPartial: Boolean, will allow partial responses and will not
//          enforce a retry operation.
//  INFO:
//      This is a wrapped async call with a fetch.
//
// (https://dev.to/ycmjason/javascript-fetch-retry-upon-failure-3p6g)
//
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

            // Request
            response = await fetchExchangeData(id, pair, symbols, { passThrough: allowPartial });

            if(response){
                // ... display the table.
                let tableData = tables.exchangeRequestAsTable(response.assets);
                let output = table(tableData);
                let tableColour = response.signature.success ? cyan : yellow;
                // console.log(tableColour(output));
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
function validateCache(cache) {

    // Initialise
    const CONTEXT = 'validateCache';

    let result = {
        current: false,
        previous: false,
        upToDate: false
    };

    try {
        if (cache.data.current.signature.success) {
            log.info({
                context: CONTEXT,
                verbosity: 1,
                message: 'STATE_CACHE:CURRENT field checks fine.'
            });
            result.current = true;
        } else {
            log.warning({
                context: CONTEXT,
                verbosity: 1,
                message: 'STATE_CACHE:CURRENT field is missing or incomplete.'
            });
            result.current = false;
        }

        if (cache.data.previous.signature.success) {
            log.info({
                context: CONTEXT,
                verbosity: 1,
                message: 'STATE_CACHE:PREVIOUS field checks fine.'
            });
            result.previous = true;
        } else {
            log.warning({
                context: CONTEXT,
                verbosity: 1,
                message: 'STATE_CACHE:PREVIOUS field is missing or incomplete.'
            });
            result.previous = false;
        }

        // Check the incoming state for the required properties.
        if (cache.data.current.signature.hasOwnProperty('timestamp') && result.current) {

            let stateCacheTime = new Date(cache.data.current.signature.timestamp);
            let currentTime = new Date();

            // DEBUG: Test dates.
            // let stateCacheTime = new Date('Jan 6, 2019 19:15:28');
            // let currentTime = new Date('Jan 6, 2019 19:30:27');

            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'CURRENT_TIME: ' + currentTime + ' STATE_CACHE_TIME: ' + stateCacheTime,
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

            // Validate state-cache age.
            // --- OVERRIDE ---
            result.upToDate = true;

            /* --- REENABLE THIS! ---
            if(currentAgeObj.isOld(limit)){
                log.warning({
                    context: CONTEXT,
                    verbosity: 1,
                    message: 'STATE_CACHE_DATA is out of date.'
                });
                result.upToDate = false;
            } else {
                log.info({
                    context: CONTEXT,
                    verbosity: 1,
                    message: 'STATE_CACHE_DATA is up to date.'
                });
                result.upToDate = true;
            }
            */
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

// DEV //

// mockUpdate {{{1
function mockUpdate(showSeconds) {
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var seconds = now.getSeconds();
    if (!showSeconds) {
        // round the minutes
        if (seconds > 30) {
            ++minutes;
            if (minutes >= 60) {
                minutes -= 60;
                ++hours;
                if (hours >= 24) {
                    hours = 0;
                }
            }
        }
    }

    /* Websocket Emission */
    // Prepare payload object based on the current and previous data.
    let payload = utils.generatePayload(globals.get('MOCK_DATA'));

    // This is the REAL emission, enable this!
    activeEmission(payload);
}
// }}}1

// Update {{{1
const update = async () => {
    CLOCK_CYCLE_ACTIVE = true;
    let CONTEXT = 'update';

    // Exchange Request Cycle
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
            { retryLimit: 1 },
            { allowPartial: true }
        );

        /*
        // Exchange Data Request succeeded.
        // ... display the table.
        let tableData = tables.exchangeRequestAsTable(exchangeData.assets);
        let output = table(tableData);
        let tableColour = exchangeData.signature.success ? cyan : yellow;
        // console.log(tableColour(output));
        log.info({
            context: CONTEXT,
            verbosity: 7,
            message: 'Exchange data query results:\n' + tableColour(output),
        });
        */

        // Update the data container. Propagate only the assets with a success flag.
        data.updateField('current', exchangeData, { forceGranularity: true });

        // Cache the updated data container.
        try {
            log.info({
                context: CONTEXT,
                message: ('Attempting to generate a fresh data state cache.')
            });

            let exchangeDataExportIsSuccess = await exportExchangeData(globals.get('STATE_CACHE_FILE'), data.exportState(),
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

        // Prepare the payload.
        let payload = utils.generatePayload(data.exportState());

        // Call the emission hook within the web-socket loop.
        activeEmission(payload);

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
    console.log('___AFTER___: update():');
    CLOCK_CYCLE_ACTIVE = false;
};
// }}}1

// runClock {{{1
const runClock = async () => {
    var now = new Date();
    var timeToNextTick = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    // TEST (start)
    var h = now.getHours();
    var m = now.getMinutes();
    var s = now.getSeconds();
    const timeSignature = h + ':' + m + ':' + s + ':';
    // TEST (end)

    /*
    const cycle = (ms) => new Promise(resolve => setTimeout(() => {
        resolve(ms);
    }, ms));
    */

    console.log('___START__: runClock()');

    setTimeout(function() {
        console.log(`<${timeSignature}> ___TEST___: Done waiting. Next cycle starts.`);
        if(CLOCK_CYCLE_ACTIVE){
            console.log('___TEST___: REQUEST_CYCLE already running. Skipping ...');
        }else{
            console.log('___TEST___: Previous REQUEST_CYCLE is complete. Running a new one ...');
            update();
        }
        // Recursion
        console.log('___NEXT___: runClock()');
        runClock();
    }, timeToNextTick);

    /*
    cycle(timeToNextTick).then(result => {
        console.log('___TEST___: Done waiting. Next cycle starts.');
        if(CLOCK_CYCLE_ACTIVE){
            console.log('___TEST___: REQUEST_CYCLE already running. Skipping ...');
        }else{
            console.log('___TEST___: Previous REQUEST_CYCLE is complete. Running next one ...');
            update();
        }
        // Recursion
        console.log('___NEXT___: runClock()');
        runClock();
    });
    */
};
// }}}1

// Define Active Emission Hook {{{1
var activeEmitter = function() {};
//
// }}}1

// Define a hook for the active emission point. {{{1
var activeEmission = function(input) {
    activeEmitter(input);
};
// }}}1

/*-----------------------;
 ; Initialize WebSockets ;
 ------------------------*/

// initWebSocket() {{{1
function initWebSocket() {
    // Default message.
    const CONTEXT = 'initWebSocket';

    log.info({
        context: CONTEXT,
        verbosity: 3,
        message: ('Starting websocket server.')
    });

    var dataSchema = schema.template;
    const message = {
        serverAppName: 'Price Table Server',
        serverVersion: APP_VERSION,
        schemaVersion: schema.version
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
        activeEmitter = function(input) {
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

    // Initialise the main pair.
    data.updateConfig('pair', 'EUR');

    // Importing
    let exchangeDataImportRetryLimit = config.get('EXCHANGE_DATA_IMPORT_RETRY_LIMIT');
    let stateCacheImportRetryLimit = config.get('STATE_CACHE_IMPORT_RETRY_LIMIT');
    let exchangeDataImportIsSuccess, doExportStateCache;
    let stateCache, isStateCacheValid;

    // Exporting
    let exchangeDataExportRetryLimit = config.get('EXCHANGE_DATA_EXPORT_RETRY_LIMIT');
    let exchangeDataExportIsSuccess;

    /*---------------------------;
    ; Exchange Data Cache Import ;
    ;---------------------------*/
    try {
        stateCache = await getStateCache(globals.get('STATE_CACHE_FILE'),
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
            isStateCacheValid = validateCache(stateCache);
        }

        log.debug({
            context: CONTEXT,
            verbosity: 5,
            message: 'Incoming STATE_CACHE_FLAGS:\nCURRENT:{0}, PREVIOUS:{1}, UP_TO_DATE:{2}'
                .stringFormatter(
                    isStateCacheValid.current.toString(),
                    isStateCacheValid.previous.toString(),
                    isStateCacheValid.upToDate.toString()
                )
        });
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
        try {
            // Make a data request, so that we can reconstruct any missing bits
            // of the incoming state cache.
            exchangeData = await getExchangeData(EXCHANGE, PAIR, SYMBOLS,
                { retryLimit: exchangeDataImportRetryLimit },
                { allowPartial: false }
            );

            // Exchange Data Request Failed, throw an exception.
            if(!exchangeData){
                exchangeDataImportIsSuccess, doExportStateCache = false;
                throw new Error('Unable to import ticker data from: ' + EXCHANGE.toUpperCase());
            }

            // Exchange Data Request succeeded.
            // ... update the main flag.
            exchangeDataImportIsSuccess, doExportStateCache = true;

            /*
            // ... display the table.
            let tableData = tables.exchangeRequestAsTable(exchangeData.assets);
            let output = table(tableData);
            let tableColour = exchangeData.signature.success ? cyan : yellow;
            console.log(tableColour(output));
            */

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
                        message: 'STATE_CACHE[CURRENT] field:{0}\nSTATE_CACHE[PREVIOUS] field:{1}'
                            .stringFormatter(isStateCacheValid.current, isStateCacheValid.previous)
                    });

                    // CACHE:CURRENT -> DATA:PREVIOUS (as the cache will always
                    // be older than the exchange request).
                    data.updateField('previous', stateCache.data.current, { forceGranularity: false });

                    // EXCHANGE_DATA -> DATA:CURRENT (as the latest exchange
                    // request should hold the fresh ticker data).
                    // We assume that both the "cacheState" and the
                    // "exchangeRequest" hold complete ticker information.
                    data.updateField('current', exchangeData, { forceGranularity: false });
                }

                if (!isStateCacheValid.current && isStateCacheValid.previous) {
                    // The 'current' field is non-existent, but the 'previous'
                    // field exists. We should pipe the fresh data straight into
                    // the 'current' field.

                    log.debug({
                        context: CONTEXT,
                        verbosity: 7,
                        message: 'STATE_CACHE[CURRENT] field:{0}\nSTATE_CACHE[PREVIOUS] field:{1}'
                            .stringFormatter(isStateCacheValid.current, isStateCacheValid.previous)
                    });

                    // CACHE:PREVIOUS -> DATA:PREVIOUS (as the cache will always
                    // be older than the exchange request).
                    data.updateField('previous', stateCache.data.previous, { forceGranularity: false });

                    // EXCHANGE:DATA -> DATA:CURRENT (as the latest exchange
                    // request should hold the fresh ticker data).
                    // We assume that both the "cacheState" and the
                    // "exchangeRequest" hold complete ticker information.
                    data.updateField('current', exchangeData, { forceGranularity: false });
                }
            } else {
                // Cache data is too old, just set the 'current' field. We will
                // not be able to calculate a difference until we have a proper
                // previous/current relation, which should be established once
                // the cycle runs on the next step.
                data.updateField('current', exchangeData, { forceGranularity: false });
            }

        } catch(error) {
            // Hard Error, terminate.
            exchangeDataImportIsSuccess, doExportStateCache = false;
            log.severe({
                context: CONTEXT,
                message: ('Exchange data IMPORT has failed.\n' + error.stack)
            });
            process.exit(1);
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
            data.updateField('previous', stateCache.data.previous, { forceGranularity: false });
            data.updateField('current', stateCache.data.current, { forceGranularity: false });
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

            exchangeDataExportIsSuccess = await exportExchangeData(globals.get('STATE_CACHE_FILE'), data.exportState(),
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
        // Services
        runClock();
        initWebSocket();
    } catch(err) {
        log.severe({
            context: CONTEXT,
            message: ('Main service has failed!\n' + err)
        });
        process.exit(1);
    }
})();
// }}}1

// vim: fdm=marker ts=4
