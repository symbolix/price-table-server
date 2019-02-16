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
    'ETF',
    'ZEC',
    'LTX',
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

// @public async getExchangeData(id, pair, symbols) {{{1
//
//  ARGS:
//      id: The exchange id.
//      pair: A fiat pair code.
//      symbols: An array of asset ticker symbols.
//  INFO:
//      This is a wrapped async call with a fetch.
//
async function getExchangeData(id, pair, symbols, {doRetry=false, retryLimit=-1}, {retryState=false, retryCounter=-1}) {
    const CONTEXT = 'getExchangeData';
    let response;
    let isSuccess = false;

    // Are we in a retrying state?
    if(retryState){
        // We are inside a retry cycle.
        if(retryCounter > retryLimit){
            // Abort the current retry step in case we reached the retry limit.
            log.severe({
                context: CONTEXT,
                message: 'Exchange data request retry limit reached with NO success.\nGiving up.'
            });

            // Return
            return false;
        }else{
            // Broadcast our intentions to repeat the request.
            log.warning({
                context: CONTEXT,
                verbosity: 2,
                message: 'Exchange data request was incomplete and needs to be repeated.'
            });

            // Continue with this step as a retry step.
            log.label({
                verbosity: 1,
                colour: cyan.inverse,
                message: 'exchange_data_import [RETRY {0} of {1}] ({2})'.stringFormatter(retryCounter, retryLimit, 'START')
            });
        }
    }else{
        // Not a retry cycle, just the first run.
        retryCounter = 0;

        // Non-retry label.
        log.label({
            verbosity: 1,
            colour: cyan.inverse,
            message: 'exchange_data_import ({0})'.stringFormatter('START')
        });
    }

    // Make the call.
    try {
        // Make an async promise call. The await is needed here otherwise the
        // process will not be set to wait until the cache file is imported.
        response = await utils.sendExchangeRequest(id, pair, symbols);

        // On Success:
        //      All data requests are fulfilled or partially fulfilled with
        //      soft errors.

        // Examine the exchange data object.
        if(response.signature.success){
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
                message: 'exchange_data_import ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
            });

            // Update the state flag.
            isSuccess = true;
        }else{
            // Partial Success, Soft Failure
            log.debug({
                context: CONTEXT,
                message: 'EXCHANGE_REQUEST_STATUS: {0}'.stringFormatter('FAILURE')
            });

            // Error Label
            log.label({
                verbosity: 1,
                colour: red.inverse,
                message: 'exchange_data_import ({0})'.stringFormatter('END') + ''.padEnd(2, '_')
            });

            // Update the state flag.
            isSuccess = false;
            if(doRetry){
                // In cases where it is crucial to get a compplete response for
                // all of the requests, we should not be leaking the partial
                // results.
                response = false;
            }
        }

        // Handle Retries
        if(!isSuccess && doRetry){
            // Update counter.
            retryCounter ++;

            // Recursive Retry Loop
            await getExchangeData(EXCHANGE, PAIR, SYMBOLS,
                {
                    doRetry: true,
                    retryLimit: retryLimit
                },
                {
                    retryState: true,
                    retryCounter: retryCounter
                }
            );
        }
    } catch (failure) {
        // On Failure:
        //      This is where we capture severe errors and bubble them up the
        //      stack. This section is only for run-time failures, and NOT for data
        //      related problems. Data related issues are handled through
        //      a different channel. The idea is that data or connectivity related
        //      issues in general are candidates for a retry procedure, whereas
        //      run-time issues should just terminate as program exceptions.

        log.error({
            context: CONTEXT,
            message: ('Failed to complete exchange request.')
        });

        // Bubble up the error and terminate.
        // Let the outer try/catch handle the message and the stack.
        throw failure;
    }

    // Return the response.
    return response;
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
    let doRetryExchangeDataImport = config.get('EXCHANGE_DATA_IMPORT_RETRY_ENABLED');
    let exchangeDataImportRetryLimit = config.get('EXCHANGE_DATA_IMPORT_RETRY_LIMIT');

    // Exporting
    let doRetryExchangeDataExport = config.get('EXCHANGE_DATA_EXPORT_RETRY_ENABLED');

    console.log('[0] START');

    try {
        console.log('[1] CALL EXCHANGE');

        // Make the data request, so that we can create a state cache.
        exchangeData = await getExchangeData(EXCHANGE, PAIR, SYMBOLS, {
            doRetry: doRetryExchangeDataImport,
            retryLimit: exchangeDataImportRetryLimit
        }, {});

        // We need a complete exchange data response here.
        if(!exchangeData){
            throw new Error('Unable to import ticker data from: ' + EXCHANGE.toUpperCase());
        }

        console.log('[2] DISPLAY RESULT');
        console.log('RESULT:', exchangeData);
    } catch(error) {
        // Hard Error, terminate.
        log.severe({
            context: CONTEXT,
            message: ('Exchange data request has failed.\n', error.stack)
        });
    }
})();

// vim: fdm=marker ts=4
