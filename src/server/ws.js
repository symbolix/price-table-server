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
const mockdata = require('./lib/mock-data');

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

/*--------------------;
 ; Server Application ;
 ;--------------------*/

!config.get('SILENT') && console.log('\nTest Error Handling v0.0.1.[2]');

// @public async fetchCachedData(filepath) {{{1
//
//  ARGS:
//      filepath   : Path to the cache file
//      passThrough: Boolean, allows partial data to be returned
//  INFO:
//      This is an async fetch call wrapping the cached date request.
//
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
                    console.log('MISSING_FILE or TRUNCATED_DATA, no need to retry.');
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
                message: ('Incomplete exchange DATA request.')
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
    let result = {
        current: false,
        previous: false,
        upToDate: false
    };

    try {
        if (cache.data.current.signature.success) {
            console.log('CURRENT.OK');
            result.current = true;
        } else {
            console.log('CURRENT.NOT_OK');
            result.current = false;
        }

        if (cache.data.previous.signature.success) {
            console.log('PREVIOUS.OK');
            result.previous = true;
        } else {
            console.log('PREVIOUS.NOT_OK');
            result.previous = false;
        }

        // Check the incoming state for the required properties.
        if (cache.data.current.signature.hasOwnProperty('timestamp') && result.current) {

            let stateCacheTime = new Date(cache.data.current.signature.timestamp);
            let currentTime = new Date();

            // DEBUG: Test dates.
            // let stateCacheTime = new Date('Jan 6, 2019 19:15:28');
            // let currentTime = new Date('Jan 6, 2019 19:30:27');

            // Debug
            console.log('CURRENT_TIME:', currentTime, 'STATE_CACHE_TIME', stateCacheTime);

            // Get timestamp difference.
            let diff = utils.timeDiff(currentTime, stateCacheTime);

            // Debug
            console.log('STATE_CACHE is',
                diff.days, 'days',
                diff.hours,'hours',
                diff.minutes, 'minutes and',
                diff.seconds, 'seconds old.');

            // Debug
            console.log('AGE_LIMIT for the STATE_CACHE is',
                config.get('STATE_CACHE_FILE_AGE_LIMIT').days, 'days',
                config.get('STATE_CACHE_FILE_AGE_LIMIT').hours,'hours',
                config.get('STATE_CACHE_FILE_AGE_LIMIT').minutes, 'minutes and',
                config.get('STATE_CACHE_FILE_AGE_LIMIT').seconds, 'seconds.');

            // Validate state-cache age.
            if(diff.isOld(config.get('STATE_CACHE_FILE_AGE_LIMIT'), diff)){
                console.log('STATE_CACHE_DATA is out of date.');
                result.upToDate = false;
            } else {
                console.log('STATE_CACHE_DATA is valid.');
                result.upToDate = true;
            }
        } else {
            throw new Error('Invalid STATE_CACHE_DATA.');
        }
    } catch (error) {
        console.log('FATAL:', error);
    }

    // Return
    return result;
}
// }}}1

// DEV //

// runClock {{{1
function runClock() {
    var now = new Date();
    var timeToNextTick = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(function() {
        // DEV: Re-enable the actual function here.
        update(false);
        // mockUpdate(false);
        runClock();
    }, timeToNextTick);
}
// }}}1

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
    var str = (hours) + ':' + twoDigits(minutes);
    if (showSeconds) {
        str += ':' + twoDigits(seconds);
    }
    /* Websocket Emission */
    // Prepare payload object based on the current and previous data.
    let payload = utils.generatePayload(globals.get('MOCK_DATA'));

    // This is the REAL emission, enable this!
    activeEmission(payload);
}
// }}}1

// twoDigits {{{1
function twoDigits(val) {
    val = val + '';
    if (val.length < 2) {
        val = '0' + val;
    }
    return val;
}
// }}}1

// Update {{{1
const update = async () => {
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

        // Exchange Data Request succeeded.
        // ... display the table.
        let tableData = tables.exchangeRequestAsTable(exchangeData.assets);
        let output = table(tableData);
        let tableColour = exchangeData.signature.success ? cyan : yellow;
        console.log(tableColour(output));

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
                message: ('Data state EXPORT has failed.\n' + error.stack)
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

        // TODO: Fix this verbose section.
        console.log('__FATAL__\n', error);
    }
};
// }}}1

// --- EMISSION ---

// Template for the protocol container. {{{1
// 'package' property needs to be defined here as we might be receiving a raw
// contaner in cases where the data back-end is offline.
// MESSAGE  : Section reserved for any server side messages.
// RECORS   : Configuration data.
// FLAGS    : State flags.
// PACKAGE  : The actual data container.
var data_container = {
    'message': null,
    'records': {
        'clientInput': {},
        'serverUpdate': false,
        'feedActive': false,
    },
    'flags': {
        'isFirstTransmission': false,
        'hasClientInput': false
    },
    'package': {}
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

/*----------------------;
 ; Initialize WebSocket ;
 -----------------------*/

// initWebSocket() {{{1
function initWebSocket() {
    // Default message.
    console.log('Starting websocket stream ...');
    data_container['message'] = 'Greetings from the server.';

    // Init the signature variable.
    // These are dummy variables to hold the dummy data coming from the client.
    let user_input = null;
    let signature = null;

    // This needs to be in the message section (onMessage) is still am option as we
    // might need to send an input from the client.
    wss.on('connection', function(ws) {
        /*------------------------------------------------------------------;
         ; This section runs only on a 'message receive from client' event. ;
         ------------------------------------------------------------------*/
        // on.message {{{2
        ws.on('message', function(message) {
            let incoming_transmission = JSON.parse(message);
            console.log('[server:onConnection:onMessage] received request:', incoming_transmission);

            // Handle the requests from the client.
            // TODO: Any data coming from the client gets evaluated here.
            // signature = incoming_transmission['signature'];
            // user_input = incoming_transmission['user_input'];
            data_container.records['clientInput'] = incoming_transmission;

            // Update the communication record to indicate that the client has sent
            // the server some information.
            data_container.flags['hasClientInput'] = true;
            data_container.flags['isFirstTransmission'] = false;

            // Insert the payload.
            data_container.package = utils.generatePayload(data.exportState());

            // Sending the payload to all clients.
            wss.clients.forEach(function(client) {
                // Prepare for transmission.
                let transmission = JSON.stringify(data_container);

                // Debug
                // console.log('[server:onConnection:onMessage] Sending:\n', transmission);

                // Send the transmission.
                client.send(transmission);
            });
        });
        //}}}2
        // Plug the ACTIVE emission hook. {{{2
        activeEmitter = function(input) {
            // Debug the input data stream.
            // let cachedDataStream = data_container.package;
            // console.log('INPUT_STREAM:', input);

            data_container['package'] = input;
            // First update the JSON object by adding the signature component.
            // Guard against undefined signatures.
            // if(signature === undefined){
            //     signature = 'None';
            // }
            // The 'input' argument is the pure object that has been imported
            // through the data stream. We are adding the extra 'signature' field
            // here.

            // Then update carrier.
            // Handle utility fields.
            data_container.records['serverUpdate'] = true;
            data_container.records['clientInput'] = {};
            data_container.records['feedActive'] = globals.get('DATA_FEED_IS_ACTIVE');
            data_container.flags['isFirstTransmission'] = false;
            data_container.flags['hasClientInput'] = false;

            // Sending the payload to all clients.
            wss.clients.forEach(function(client) {
                // Prepare for transmission.
                let transmission = JSON.stringify(data_container);

                // Debug
                // console.log('[server:onConnection:onUpdate] Sending:\n', transmission);

                // Send the transmission.
                client.send(transmission);

                // Reser flag.
                data_container.records['server_update'] = false;
            });
        };
        //}}}2
        /*-------------------------------------------------;
        ; This section runs only once at first connection. ;
        ;-------------------------------------------------*/
        // Complete the connection by sending the payload to all clients.
        wss.clients.forEach(function(client) {
            // Prepare for transmission.
            let transmission = JSON.stringify(data_container);

            // Debug
            // console.log('[server:onConnection:init] Sending:\n', transmission);

            // Send the transmission.
            client.send(transmission);
        });
    });
}
//}}}1

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

            // ... display the table.
            let tableData = tables.exchangeRequestAsTable(exchangeData.assets);
            let output = table(tableData);
            let tableColour = exchangeData.signature.success ? cyan : yellow;
            console.log(tableColour(output));

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
        console.log('FAILURE: CRITICAL', err);
        process.exit(1);
    }
})();

// vim: fdm=marker ts=4
