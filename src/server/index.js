/*!
 * Price Table Server
 * Copyright(c) 2018 Milen Bilyanov
 * Copyright(c) 2017-2019 tradekit.io
 *
 * MIT Licensed
 *
 */

'use strict';

// Project Imports
const { red, blue, cyan, yellow } = require ('ansicolor');
const { table } = require('table');

// Local Imports
const logging = require('./lib/logging');
const utils = require('./lib/utils');
const data = require('./lib/data-container');
const globals = require('./lib/globals');
const config = require('./lib/config');
const schema = require('./lib/data-schema.js');
const timers = require('./lib/timers.js');
const telemetry = require('./lib/telemetry');
const wrap = require('./lib/wrappers');

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
const REST_PORT = config.get('REST_SERVER_PORT');
const SOCKET_PORT = config.get('SOCKET_SERVER_PORT');
const DATA_CONTAINER_WAIT_INTERVAL = config.get('DATA_CONTAINER_WAIT_INTERVAL');
const DATA_REQUEST_INTERVAL = config.get('DATA_REQUEST_INTERVAL');

// Intro
!config.get('SILENT') && console.log(`\n${APP_NAME} ${APP_VERSION}`);

// Logging
const log = logging.getLogger();

// Interval
let requestInterval = new timers.Interval('request');

// Telemetry Layer
let TelemetryObject = new telemetry.Layer(schema.diagnosticsTemplate);

/*--------------------;
 ; Server Application ;
 ;--------------------*/
/** @public async update(pairs, exchange, symbols, stateCacheFile) {{{1
 *
 * A request wrapper that is designed to run at each interval.
 */

const update = async (pairs, exchange, symbols, stateCacheFile) => {
    // Start request state.
    requestInterval.setState('isRequestActive', true);

    const CONTEXT = 'main.' + 'update';

    try {
        // Exchange Request Cycle Label
        log.label({
            verbosity: 1,
            colour: blue.inverse,
            message: 'exchange_request_cycle ({0})'.stringFormatter('START')
        });

        // Handle current/previous relation-ship here.
        let isTimestampValid, isSuccess = true;

        // DEBUG - TEST: Simulate missing timestamps and unsuccessful states.
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

        // Probe timestamps and success flags for the pair(s).
        for (const pair of pairs) {

            // Access Data Container
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

            // Access Data Container
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

        let storedDataState = {};

        // Evaluate timestamps and success results.
        if(isTimestampValid && isSuccess){
            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'CURRENT data is available and will be stored as a PREVIOUS state prior to the exchange call.'
            });

            // Take a snapshot of the 'current' data state.
            storedDataState = data.query({
                section: 'data',
                element: 'current'
            });

            // Deep-copy 'current' to 'previous'. As a result both fields would have the same values at this point.
            // (DEPRECATED) data.shuffleData('current', 'previous');
        }else{
            log.warning({
                context: CONTEXT,
                verbosity: 7,
                message: 'No CURRENT data is detected. No updates will be performed on the PREVIOUS data prior to the exchange call.'
            });
        }

        let validators = [];

        // Run the exchange request(s).
        for (const pair of pairs) {
            try {
                // Make a data request, so that we can reconstruct any missing bits
                // of the incoming state cache.
                let exchangeData = await wrap.getExchangeData(exchange, pair, symbols,
                    { retryLimit: 3 },
                    { allowPartial: true }
                );

                // Accumulate the validators here.
                // Basically create an array of states: [true, true, true, false, true ...]
                Object.keys(exchangeData['assets']).forEach((a) => validators.push(exchangeData['assets'][a]['success']));

                // Update the data container. Propagate only the assets with a success flag.
                // The updatePair() method operates on the 'current' state of
                // the data container.
                data.updatePair(
                    pair.toLowerCase(),
                    exchangeData, { forceGranularity: true }
                );

                // Inject the stored data state into the 'previous' state of
                // the data container.

                // First handle the assets.
                Object.keys(storedDataState[pair.toLowerCase()]['assets']).forEach((a) => {
                    data.update({
                        section: 'data',
                        field: 'previous',
                        pair: pair.toLowerCase(),
                        component: 'assets',
                        element: a,
                        value: storedDataState[pair.toLowerCase()]['assets'][a]
                    });
                });

                // Later process the signatures.
                Object.keys(storedDataState[pair.toLowerCase()]['signature']).forEach((s) => {
                    data.update({
                        section: 'data',
                        field: 'previous',
                        pair: pair.toLowerCase(),
                        component: 'signature',
                        element: s,
                        value: storedDataState[pair.toLowerCase()]['signature'][s]
                    });
                });

                // DEBUG - TEST: Access and update an asset.
                // data.update({
                //     section: 'data',
                //     field: 'current',
                //     pair: 'eur',
                //     component: 'assets',
                //     element: 'xrp',
                //     value: {
                //         symbol: 'FOO/BAR',
                //         timestamp: '0123456789',
                //         last: '1111.22',
                //         success: true
                //     }
                // });
                // DEBUG - TEST
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

        // The data container should be intact at this stage.
        if(!TelemetryObject.query('isDataContainerReady')){
            TelemetryObject.isDataContainerReady = true;
        }

        // Cache the updated data container.
        try {
            log.info({
                context: CONTEXT,
                message: ('Attempting to generate a fresh data state cache.')
            });

            // Cache out the latest data-container state.
            await wrap.exportExchangeData(stateCacheFile, data.exportState(),
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

        // Call the emission hook within the web-socket loop, only if the
        // services are running.
        if(TelemetryObject.query('areServicesRunning')){
            wrap.activeWebSocketEmission( {signal: true, dataFeed:  TelemetryObject.query('dataFeedState')} );
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
            value: wrap.populateData(config.get('PAIRS'), config.get('ASSETS')),
        })
    ));

    // Importing related variables.
    let exchangeDataImportRetryLimit = config.get('EXCHANGE_DATA_IMPORT_RETRY_LIMIT');
    let stateCacheImportRetryLimit = config.get('STATE_CACHE_IMPORT_RETRY_LIMIT');
    let exchangeDataImportIsSuccess, doExportStateCache;
    let stateCache, isStateCacheValid, stateCacheValidationTable, tableColour;

    // Exporting related variables.
    let exchangeDataExportRetryLimit = config.get('EXCHANGE_DATA_EXPORT_RETRY_LIMIT');

    /*---------------------------------;
    ; Exchange Data State Cache Import ;
    ;----------------------------------*/
    try {
        stateCache = await wrap.getStateCache(STATE_CACHE_FILE,
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
        // Soft Error, move on.
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
        /*--------------------------------;
        ; Exchange Data Request is Needed ;
        ;---------------------------------*/
        let validators = [];

        for (const pair of PAIRS) {
            try {
                // Make a data request, so that we can reconstruct any missing bits
                // of the incoming state cache.
                exchangeData = await wrap.getExchangeData(EXCHANGE, pair, ASSETS,
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
                        data.update({
                            section: 'data',
                            field: 'current',
                            element: pair.toLowerCase(),
                            value: exchangeData,
                        });

                        // This should result in a complete data container.
                        TelemetryObject.isDataContainerReady = true;
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
                        data.update({
                            section: 'data',
                            field: 'current',
                            element: pair.toLowerCase(),
                            value: exchangeData,
                        });

                        // This should result in a complete data container.
                        TelemetryObject.isDataContainerReady = true;
                    }
                } else {
                    // Cache data is too old, just set the 'current' field. We will
                    // not be able to calculate a difference until we have a proper
                    // previous/current relation, which should be established once
                    // the cycle runs on the next step.
                    data.update({
                        section: 'data',
                        field: 'current',
                        element: pair.toLowerCase(),
                        value: exchangeData,
                    });

                    // The data container should be flagged as incomplete.
                    TelemetryObject.isDataContainerReady = false;
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
                TelemetryObject.isDataContainerReady = false;

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
        /*--------------------------------;
        ; No Exchange Data Request Needed ;
        ;---------------------------------*/
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

            TelemetryObject.isDataContainerReady = true;
        } catch(failure) {
            // Hard Error, terminate.
            log.severe({
                context: CONTEXT,
                message: ('Internal data failure has occured.\n' + failure.stack)
            });
            TelemetryObject.isDataContainerReady = false;
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

            await wrap.exportExchangeData(STATE_CACHE_FILE, data.exportState(),
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
        // Data Feed Test
        if(TelemetryObject.query('dataFeedState')===null){
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
        }

        // Services

        // Example interval API: runInterval(skip, interval, callback)
        // skip       : Skip that many minutes.
        // internval  : Wait for that many seconds (0-59 seconds).
        // callback   : What to do once the interval is complete.
        requestInterval.runInterval(
            DATA_REQUEST_INTERVAL.skip,
            DATA_REQUEST_INTERVAL.delay,
            function() {
                update(PAIRS, EXCHANGE, SYMBOLS, STATE_CACHE_FILE);
            }
        );

        // Main Services.
        if(TelemetryObject.query('isDataContainerReady')){
            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'DATA_CONTAINER_STATUS: {0}'.stringFormatter('READY')
            });

            // Start the services.
            wrap.startWebSocket(SOCKET_PORT);
            wrap.startRestApi(REST_PORT);

            // Update the services state.
            TelemetryObject.areServicesRunning = true;
        }else{
            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: 'DATA_CONTAINER_STATUS: {0}'.stringFormatter('NOT READY')
            });

            // Start the check cycle. We will have to wait until the
            // data-container is entirely populated.
            let serviceCheckInterval = setInterval(()=> {
                if(TelemetryObject.query('isDataContainerReady')){
                    log.info({
                        context: CONTEXT,
                        message: ('Data-container is now available.')
                    });

                    // Start services.
                    wrap.startWebSocket(SOCKET_PORT);
                    wrap.startRestApi(REST_PORT);

                    // Update the services state.
                    TelemetryObject.areServicesRunning = true;

                    // Stop the interval.
                    clearInterval(serviceCheckInterval);
                }else{
                    log.warning({
                        context: CONTEXT,
                        verbosity: 1,
                        message: ('Waiting for the data-container to become available.')
                    });
                }
            }, DATA_CONTAINER_WAIT_INTERVAL);
        }
    } catch(err) {
        log.severe({
            context: CONTEXT,
            message: ('Main service has failed!\n' + err.stack)
        });

        // Terminate
        process.exit(1);
    }
})();
// }}}1

// vim: fdm=marker ts=4
