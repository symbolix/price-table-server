'use strict';

// Project Imports
const { cyan, white, red, green, yellow } = require ('ansicolor');
const { table } = require('table');

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

!config.get('SILENT') && console.log(`\nTest Error Handling v0.0.1.[2]`);

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
        response = await utils.readState(filepath);

        if(!response){
            // Failure.
            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'FETCH_CACHE_REQUEST_STATUS: {0}'.stringFormatter('FALSE')
            });
        }else{
            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'FETCH_CACHE_REQUEST_STATUS: {0}'.stringFormatter('COMPLETE')
            });
        }
    } catch (failure) {
        // On Failure
        log.error({
            context: CONTEXT,
            message: ('Failed to complete FETCH_CACHE_REQUEST.')
        });

        // Bubble up the error and terminate.
        // Let the outer try/catch handle the message and the stack.
        throw failure;
    }

    // Return the response.
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
            if(response){
                // Status Flag
                success = true;

                // Complete Success
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'CACHE_REQUEST_STATUS: {0}'.stringFormatter('SUCCESS')
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
                    message: 'CACHE_REQUEST_STATUS: {0}'.stringFormatter('FAILED')
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
                if(isLastAttempt){
                    // Abort the current retry step in case we reached the retry limit.
                    log.severe({
                        context: CONTEXT,
                        message: 'Retry limit reached with NO success. Giving up.'
                    });

                    // Rise an exception
                    throw new Error('State cache data is required to proceed.');
                }
            }else{
                // Return
                return response;
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

/*------;
 ; MAIN ;
 ------*/
(async () => {
    const CONTEXT = 'main';
    let exchangeData = {};

    // Flags
    let doExchangeDataCaching = false;

    // Importing
    let exchangeDataImportRetryLimit = config.get('EXCHANGE_DATA_IMPORT_RETRY_LIMIT');
    let stateCacheImportRetryLimit = config.get('STATE_CACHE_IMPORT_RETRY_LIMIT');
    let exchangeDataImportIsSuccess;
    let stateCacheImportIsSuccess;

    // Exporting
    let exchangeDataExportRetryLimit = config.get('EXCHANGE_DATA_EXPORT_RETRY_LIMIT');
    let exchangeDataExportIsSuccess;

    /*---------------------------;
    ; Exchange Data Cache Import ;
    ;---------------------------*/
    try {
        stateCacheImportIsSuccess = await getStateCache(globals.get('STATE_CACHE_FILE'),
            { retryLimit: stateCacheImportRetryLimit }
        );
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

    //TODO: Continue with the new ExchangeDataRequest if only the 'current' field
    //is available in the state cache. If that is the case, store the 'current' data
    //as 'previous' data and save the new exchange request to the 'current' field.

    /*----------------------;
    ; Exchange Data Request ;
    ;----------------------*/

    try {

        // Make the data request, so that we can create a state cache.
        exchangeData = await getExchangeData(EXCHANGE, PAIR, SYMBOLS,
            { retryLimit: exchangeDataImportRetryLimit },
            { allowPartial: false }
        );

        // Exchange Data Request Failure

        if(!exchangeData){
            exchangeDataImportIsSuccess = false;
            throw new Error('Unable to import ticker data from: ' + EXCHANGE.toUpperCase());
        }

        // Exchange Data Request Success

        // Store the exchange data inside the data container.
        data.updateField('current', exchangeData);
        exchangeDataImportIsSuccess = true;

    } catch(error) {
        // Hard Error, terminate.
        log.severe({
            context: CONTEXT,
            message: ('Exchange data IMPORT has failed.\n' + error.stack)
        });
    }

    /*---------------------;
    ; Exchange Data Export ;
    ;---------------------*/

    try {
        // Display the results as a table.
        let tableData = tables.exchangeRequestAsTable(exchangeData.assets);
        let output = table(tableData);
        let tableColour = exchangeData.signature.success ? cyan : yellow;
        console.log(tableColour(output));

        exchangeDataExportIsSuccess = await exportExchangeData(globals.get('STATE_CACHE_FILE'), data.exportState(),
            { retryLimit: exchangeDataExportRetryLimit },
        );
    } catch(error){
        // Hard Error, terminate.
        log.severe({
            context: CONTEXT,
            message: ('Exchange data EXPORT has failed.\n' + error.stack)
        });
    }

})();

// vim: fdm=marker ts=4
