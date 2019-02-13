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

// Symbols
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

// Pair
const PAIR = 'EUR';

// Exchange
const EXCHANGE = 'kraken';

// Logging
const log = logging.getLogger();

/*--------------------;
 ; Server Application ;
 ;--------------------*/

!config.get('SILENT') && console.log(`\nTest Error Handling v0.0.1.[1]`);

// @public async fetchExchangeRequest(id, pair, symbols) {{{1
//
//  ARGS:
//      id: The exchange id.
//      pair: A fiat pair code.
//      symbols: An array of asset ticker symbols.
//  INFO:
//      This is a promise wrapper for the exchange request.
//
async function fetchExchangeData(id, pair, symbols) {
    const CONTEXT = 'fetchExchangeData';
    // Promisify the request.
    try {
        return new Promise((resolve, reject) => {
            try {
                // Send the request.
                utils.sendExchangeRequest(id, pair, symbols, ((err, output) => {
                    try{
                        if(err){
                            // Failure
                            // In case of failures, the output still needs to be passed
                            // through.
                            try {
                                log.error({
                                    context: CONTEXT,
                                    message: 'Exchange request was rejected due to error(s).'
                                });
                                let reason = '__FAILED__';
                                // throw new Error('error inside the promise');
                                reject( { error: reason, data: output } );
                            } catch(error) {
                                reject(error);
                            }
                        }else{
                            // Success
                            log.info({
                                context: CONTEXT,
                                verbosity: 4,
                                message: 'Exchange request was successful.'
                            });
                            resolve({error: 'None', data: output});
                        }
                    } catch(error) {
                        throw error;
                    }
                }));
            } catch(error) {
                // console.log('---\n', error, '\n---');
                throw error;
            }
        });
    } catch(error) {
        // This is where we capture severe errors and bubble them up the
        // stack. This section is only for run-time failures, and NOT for data
        // related problems. Data related issues are handled through
        // a different channel. The idea is that data or connectivity related
        // issues in general are candidates for a retry procedure, whereas
        // run-time issues should just terminate as program exceptions.

        // Bubble up the error.
        console.log('+++\n', error, '\n+++');
        throw error;
    }
}
// }}}1

// @public async getExchangeData(id, pair, symbols) {{{1
//
//  ARGS:
//      id: The exchange id.
//      pair: A fiat pair code.
//      symbols: An array of asset ticker symbols.
//  INFO:
//      This is a wrapped async call with a fetch.
//
async function getExchangeData(id, pair, symbols) {
    const CONTEXT = 'getExchangeData';
    try {
        // Make an async promise call. The await is needed here otherwise the
        // process will not be set to wait until the cache file is imported.
        return await fetchExchangeData(id, pair, symbols);

        // Success
        //log.debug({
        //    context: CONTEXT,
        //    message: 'EXCHANGE_REQUEST_STATUS: {0}'.stringFormatter('__SUCCESS__')
        //});
    } catch (failure) {
        // Hard Failure
        if (failure instanceof Error) {
            throw failure;
        }
        // Soft Failure
        log.debug({
            context: CONTEXT,
            message: 'EXCHANGE_REQUEST_STATUS: {0}'.stringFormatter(failure.error)
        });
    }

    //} catch(error) {
    //    log.error({
    //        context: CONTEXT,
    //        message: 'Failed to complete exchange request with the following exception:\n{0}: {1}'
    //            .stringFormatter(error.name, error.message)
    //    });
    //
    //    // This is where we capture severe errors and bubble them up the
    //    // stack. This section is only for run-time failures, and NOT for data
    //    // related problems. Data related issues are handled through
    //    // a different channel. The idea is that data or connectivity related
    //    // issues in general are candidates for a retry procedure, whereas
    //    // run-time issues should just terminate as program exceptions.
    //
    //    // Bubble up the error.
    //    throw error;
    //}
    //return response;
}
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
    let doRetryExchangeDataImport = config.get('CACHE_IMPORT_RETRY_ENABLED');
    let isExchangeDataImportSuccess = false;
    // Exporting
    let doRetryExchangeDataExport = config.get('CACHE_EXPORT_RETRY_ENABLED');
    let isExchangeDataExportSuccess = false;

    //{{{1
    async function importExchangeData(exchange, pair, symbols){
        // Structured Payload
        let exchangeData = {
            error: true,
            data: 'none'
        };

        console.log('[0] START');
        try {
            console.log('[1] CALL EXCHANGE');
            exchangeData = await getExchangeData(exchange, pair, symbols);
        } catch(e) {
            log.severe({
                context: CONTEXT,
                message: ('Exchange data import has failed due to an internal error:\n' + e.stack)
            });
        }

        console.log('[2] RETURN RESULTS');
        return exchangeData;
    }
    //}}}1

    // Mock Request
    // try {
    //     const ticker = await mockdata.fetchTicker('XLM_EUR');
    //     console.log('---(RESULT)---\n', ticker, '\n--------------');
    // } catch(error) {
    //     log.severe({
    //         context: CONTEXT,
    //         message: ('Exchange data import has failed due to an internal error:\n'+error)
    //     });
    // }

    // Change 'USD' to 'EUR' to avoid errors.
    exchangeData = await importExchangeData(EXCHANGE, 'USD', ['XLM', 'XMR']);
    console.log('RESULT:', exchangeData);

    /* {{{3 (DISABLED)
    try {
        let exchangeData = await getExchangeData(EXCHANGE, PAIR, SYMBOLS);
        // {{{4 Exchange import is incomplete.
        if(exchangeData.error){
            isExchangeDataImportSuccess = false;
            log.label({
                verbosity: 1,
                colour: red.inverse,
                message: 'exchange_data_import ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
            });
            log.warning({
                context: CONTEXT,
                verbosity: 2,
                message: 'Exchange data request was incomplete and needs to be repeated.'
            });
            // Handle Retry
            // {{{5 Run the retry cycle if needed.
            if(doRetryExchangeDataImport){
                importRetryCountLimit = config.get('EXCHANGE_DATA_IMPORT_RETRY_LIMIT');
                importRetryCounter = 0;
                // Retry Loop {{{6
                do {
                    log.label({
                        verbosity: 1,
                        colour: cyan.inverse,
                        message: 'exchange_data_import [RETRY {0} of {1}] ({2})'.stringFormatter((importRetryCounter+1), importRetryCountLimit, 'START')
                    });
                    // Initial Request
                    let exchangeData = await getExchangeData(EXCHANGE, PAIR, SYMBOLS);
                    if(exchangeData.error){
                        // Response is incomplete.
                        isExchangeDataImportSuccess = false;
                        log.label({
                            verbosity: 1,
                            colour: red.inverse,
                            message: 'exchange_data_caching [RETRY {0} of {1}] ({2})'.stringFormatter((importRetryCounter+1), importRetryCountLimit, 'END') + ''.padEnd(2, '_')
                        });
                        // Last cycle?
                        if(importRetryCounter == (importRetryCountLimit - 1)){
                            log.severe({
                                context: CONTEXT,
                                message: 'Exchange data request retry limit reached with NO success.\nGiving up.'
                            });
                        } else {
                            log.warning({
                                context: CONTEXT,
                                verbosity: 2,
                                message: 'Exchange data request was incomplete and needs to be repeated.'
                            });
                        }
                    }else{
                        // Response is complete.
                        isExchangeDataImportSuccess = true;
                        log.label({
                            verbosity: 1,
                            colour: cyan.inverse,
                            message: 'exchange_data_import [RETRY {0} of {1}]'.stringFormatter((importRetryCounter+1), importRetryCountLimit, 'END') + ''.padEnd(2, '_')
                        });
                        // Terminate retry sequence.
                        break;
                    }
                    // Increment
                    ++importRetryCounter;
                } while (importRetryCounter < importRetryCountLimit);
                //}}}6
            }
            //}}}5
            //}}}4
        }else{
            //{{{4 Exchange import is complete.
            isExchangeDataImportSuccess = true;
            log.label({
                verbosity: 1,
                colour: cyan.inverse,
                message: 'exchange_data_import ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
            });
            //}}}4
        }
        // Display the results as a table (regardless of the data being
        // complete or incomplete).
        let tableData = tables.exchangeRequestAsTable(exchangeData.data.assets);
        let output = table(tableData);
        let tableColour = isExchangeDataImportSuccess ? cyan : yellow;
        console.log(tableColour(output));
    }catch(e){
        // {{{4 Response failed.
        isExchangeDataImportSuccess = false;
        log.severe({
            context: CONTEXT,
            message: 'Exchange data import has failed due to an internal error:\n{0}'.stringFormatter(e.stack)
        });
        // }}}4
    }
    */
    //}}}3
})();

// vim: fdm=marker ts=4
