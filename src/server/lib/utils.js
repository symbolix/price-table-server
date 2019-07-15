/* Price Table Server | tradekit.io
 *
 * @mudule: utils
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 */

'use strict';

// Project Imports
const ccxt = require ('ccxt');
const fs = require('fs');
const { ExchangeNotAvailable, ExchangeError, DDoSProtection, RequestTimeout } = require ('ccxt/js/base/errors');
const { red, green } = require ('ansicolor');

// Local Imports
const logging = require('./logging');
const mockdata = require('./mock-data');
const config = require('./config');
const globals = require('./globals');
const { MockExchangeError, FileStreamError } = require('./errors');

var MODULE = 'utils';
var USE_MOCK_DATA_FEED = config.get('USE_MOCK_DATA_FEED');

// The configuration for fractions formatting.
// For example:
//      XRP should be displayed with 4 fractional digits, 0.1234
//      However, 2 fractional digits are sufficient for ETH, 123.12
const FORMAT = config.get('FORMAT');

// Logging
const log = logging.getLogger();

// These are specific ERROR types defined by the ccxt API. Most of these have
// been tested and added to this list of soft-errors that should be retried.
const retryExceptions = [
    ExchangeNotAvailable,
    ExchangeError,
    DDoSProtection,
    RequestTimeout,
    MockExchangeError
];

/* Private Functions */

/** @private async _readState(filepath) {{{1
*
* A private function with a lower level 'readFile' directive.
* The _filepath_ parameter is the full or relative path to a state file.
*
* @param {String} filepath
* @return {Promise}
*/

async function _readState(filepath) {
    const CONTEXT = MODULE + '.' + '_readState';

    let reason;

    return new Promise(function(resolve, reject) {
        fs.readFile(filepath, 'utf8', function(err, data){
            if (err) {
                log.error({
                    context: CONTEXT,
                    message: 'File read request has failed for: {0}'.stringFormatter(filepath)
                });
                // Filter access errors so we can support retrying. Please note
                // that we are checking if the file exists before invoking this
                // section. The I/O errors caught here are only for rare
                // cases where we might loose access to the file during the
                // read stage.
                // TODO: Might need some more codes here.
                if (err.code === 'ENOENT') {
                    reason = new FileStreamError(err,'I/O Failure has occured');
                } else {
                    reason = err;
                }
                reject(reason);
            } else {
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'File read request was successful for: {0}'.stringFormatter(filepath)
                });
                resolve(data);
            }
        });
    });
}
// }}}1

/** @private async _writeState(filepath, data) {{{1
*
* A private function with a lower level 'writeFile' directive.
* The _filepath_ parameter is the full or relative path to a state file.
* The _data_ parameter is the data object to be cached.
*
* @param {String} filepath
* @param {Array} data
* @return {Promise}
*/

async function _writeState(filepath, data) {
    const CONTEXT = MODULE + '.' + '_writeState';

    let reason;

    return new Promise(function(resolve, reject) {
        fs.writeFile(filepath, JSON.stringify(data), ((err) => {
            if (err) {
                log.error({
                    context: CONTEXT,
                    message: 'File write request has failed for: {0}'.stringFormatter(filepath)
                });
                // Filter access errors so we can support retrying.
                // TODO: Might need some more codes here.
                if (err.code === 'EACCES') {
                    reason = new FileStreamError(err,'I/O Failure has occured');
                } else {
                    reason = err;
                }
                reject(reason);
            } else {
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'File write request was successful for: {0}'.stringFormatter(filepath)
                });
                resolve(true);
            }
        })
        );
    });
}
// }}}1

/** @private isReservedException(reservedExceptions, exception) {{{1
*
* A private function to test if an exception, provided through the _exception_ parameter, is part of
* the reserved exceptions specified in the _reservedExceptions_ parameter.
*
* @param {Array} reservedExceptions
* @param {String} exception
*/

function isReservedException(reservedExceptions, exception) {
    let arrayLength = reservedExceptions.length;
    let state = false;
    for (var i=0; i < arrayLength; i++){
        if(exception instanceof reservedExceptions[i]){
            state  = true;
        }
    }
    return state;
}
// }}}1

/** @private formatNumbers(raw, fractionalDecimals) {{{1
 *
 * A function to format the fractional digits of a float provided through the _raw_
 * argument. The formatting operation is based on the decimals count provided
 * through the _fractionalDecimals_ argument.
 *
 * @param {Float} raw
 * @param {Int} fractionalDecimals
 * @returns {String}
 */

function formatNumbers(raw, fractionalDecimals) {
    // This is the fractional modifier. For example: 10s, 100s etc.
    // This modifier is used when rounding the incoming fraction.
    // Getting an error with a value 5.9976
    let fractionalModifier = Math.pow(10, fractionalDecimals);

    let i = raw;

    // In case of no fractional section.
    // For example: 7.0 or 1.0 etc.
    if(i.toString().split('.').length<2){
        return i.toFixed(fractionalDecimals);
    }else{
        if(i.toString().split('.')[1].length<=fractionalDecimals){
            return i.toFixed(fractionalDecimals);
        }
    }

    // Guard against NaNs
    if(isNaN(i)){
        i = 0;
        return i.toFixed(fractionalDecimals);
    }

    // Handle the minus sign.
    let minus = '';
    if(i < 0) { minus = '-'; }

    // Process
    i = Math.abs(i);

    let fractionalLevels = (i.toString().split('.')[1]).length;
    let fractionalDepth = Math.pow(10, fractionalLevels);
    let fractionalLimit = 0.5 / Math.pow(10, fractionalDecimals);
    let leftover = parseFloat((i.toString().split('.')[1].slice(fractionalDecimals)/fractionalDepth));
    i = (leftover > fractionalLimit ? (Math.ceil(i*fractionalModifier)/fractionalModifier) : (Math.floor(i*fractionalModifier)/fractionalModifier));

    // Fixing the no decimal bug for values such as 5.9976
    // Without the float conversion the above value would end up as 6, with no
    // fractional section, breaking the code that follows.
    i = i.toFixed(fractionalDecimals);

    // Let's be alert and rise an exception if this bug reoccurs.
    if(i.toString().split('.')[1]===undefined){
        throw new Error('Number conversion has failed for: [raw=' + raw + ', fractionalDecimals=' + fractionalDecimals + ']');
    }

    // Handle Post-Process short fractional digits.
    if(i.toString().split('.')[1].length<fractionalDecimals){
        i = i.toFixed(fractionalDecimals);
    }

    let s = (minus + i.toString());
    return s;
}
// }}}1

/* Public Functions */

/** @public moduleTest() {{{1
 *
 * A simple module test function.
 */
function moduleTest(){
    let CONTEXT = MODULE + '.' + 'moduleTest';

    log.debug({
        context: CONTEXT,
        verbosity: 5,
        message: ('__UTILS__ module accessed.'),
    });
}
//}}}1

/** @public async writeState(filepath, data) {{{1
 *
 * A wrapper function to write a JSON object provided with the _data_
 * parameter, to the cache file specified through the _filepath_ parameter.
 *
 * @param {String} filepath
 * @param {object} data
 * @returns {} response
 */

async function writeState(filepath, data) {
    const CONTEXT = MODULE + '.' + 'writeState';

    let response;

    try {
        // Send the request.
        response = await _writeState(filepath, data);

        // On SUCCESS
        log.info({
            context: CONTEXT,
            verbosity: 5,
            message: 'State cache data export was successful for: {0}'.stringFormatter(filepath)
        });

        // Return the state.
        return response;
    } catch (failure) {
        if(failure instanceof FileStreamError){
            // Soft Error, we can come back and retry.
            log.error({
                context: CONTEXT,
                message: 'Write request for [{0}] has failed with the following exception:\n{2}: {3}'
                    .stringFormatter(filepath, failure.name, failure.message)
            });

            // Flag the whole request as unsuccessful.
            response = false;

            // Drop exception and move on.
            return response;
        }

        // Hard Error, meaning we need to terminate, no point in retrying.
        log.error({
            context: CONTEXT,
            message: ('Unable to complete data send request\n' + failure)
        });

        // Terminate, nothing will be returned.
        throw failure;
    }
}
// }}}1

/** @public async readState(filepath) {{{1
 *
 * A promise wrapper for the JSON cache file read request. The _filepath_ parameter is the full or
 * relative path to a state file. The function returns a response that is structured in the
 * following way: { payload: obj, retry: boolean, state: boolean }
 *
 * @param {String} filepath
 * @returns {Object}
 */

async function readState(filepath){
    const CONTEXT = MODULE + '.' + 'readState';

    let response = {
        payload: null,
        retry: true,
        state: false
    };

    try {
        // Send the 'read state' request only if the file exists.
        if (fs.existsSync(filepath)) {
            // File exists, let's attempt to import the data.
            response.payload = JSON.parse(await _readState(filepath));
            response.state = true;
        }else{
            // File does NOT exist, let's move on.
            response.payload = null;
            response.state, response.retry = false;
        }

        if (!response.state) {
            // On missing file, move on.
            log.warning({
                context: CONTEXT,
                verbosity: 1,
                message: 'Following state cache file was NOT found: {0}'.stringFormatter(filepath)
            });
        } else {
            // On SUCCESS, let us know everything is fine.
            log.info({
                context: CONTEXT,
                verbosity: 5,
                message: 'State cache file request was successful for: {0}'.stringFormatter(filepath)
            });
        }

        // False or complete, return the state.
        return response;
    } catch (failure) {
        if(failure instanceof FileStreamError){
            // Soft Error, probably the read stage was interrupted. We should be able to retry.
            log.error({
                context: CONTEXT,
                message: 'Read request for [{0}] has failed with the following exception:\n{2}: {3}'
                    .stringFormatter(filepath, failure.name, failure.stack)
            });

            // Flag the whole request as unsuccessful.
            response.state = false;

            // Drop exception and move on.
            return response;
        }

        // Hard Error, meaning we need to terminate, no point in retrying.
        // This is for run-time errors and execution failures. Situations
        // related to file permissions or accessibility should be treated as
        // soft-errors and retried.
        log.error({
            context: CONTEXT,
            message: ('Unable to complete READ_STATE request\n' + failure)
        });

        // Bubble-up and force terminate, nothing will be returned.
        throw failure;
    }
}
// }}}1

/** @public getAge (startDate, endDate) {{{1
 *
 * Generates an age object based on the provided _startDate_ and _endDate_ parameters.
 * (https://stackoverflow.com/questions/54811010/how-should-i-deal-with-nested-conditional-statements)
 * (https://www.tutorialspoint.com/How-to-get-time-difference-between-two-timestamps-in-seconds)
 * Returns the difference in days, hours, minutes, seconds.
 *
 * @param {Object} startDate
 * @param {Object} endDate
 * @returns {Object}
 */

function getAge(startDate, endDate) {
    var res = Math.abs(startDate - endDate) / 1000;

    // get total days between two dates
    var days = Math.floor(res / 86400);

    // get hours
    var hours = Math.floor(res/ 3600) % 24;

    // get minutes
    var minutes = Math.floor(res / 60) % 60;

    // get seconds
    var seconds = res % 60;

    // Public Storage
    this.diff = {
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds
    };

    // A public getter.
    this.getDiff = function(){
        return this.diff;
    };
}
// }}}1

/** @public getAge.isUpToDate(ageLimitObj) {{{1
 *
 * This is a public method attached to the getAge() function.
 * Relies on the internal data of a getAge() instance.
 * (https://stackoverflow.com/questions/54811010/how-should-i-deal-with-nested-conditional-statements)
 *
 * The _ageLimitObj_ parameter is an object structured in the following way:
 *      { days: 0, hours: 0, minutes: 5, seconds: 59 }
 * The function returns a TRUE state for up-to-date results and a FALSE state for old states.
 *
 * @param {Object}
 * @returns {Boolean}
 */

// Attach the following public utility method to getAge()
getAge.prototype.isUpToDate = function(ageLimitObj) {
    const CONTEXT = this.constructor.name + '.isUpToDate';

    // currentAge: is the inherited internal AGE object (this.diff).
    // limitAge: is the AGE_LIMIT object.
    let currentAge = this.diff;
    let limitAge = ageLimitObj;

    // Keys template.
    const UNITS = ['days', 'hours', 'minutes', 'seconds'];

    // We create a flag, and an index to iterate over our UNITS array.
    let unitsIndex = 0;

    // We'll loop over the UNITS array. The key is that, if the current unit
    // exceeds the limit unit, we use an early return to break.
    while (unitsIndex <= (UNITS.length - 1)) {
        log.debug({
            context: CONTEXT,
            verbosity: 7,
            message: '\t\tCycle (' + unitsIndex + '), Item [' + UNITS[unitsIndex] + '], limit [' + limitAge[UNITS[unitsIndex]] + '], current value: [' + currentAge[UNITS[unitsIndex]] + '].',
        });

        // Here we check: is our limit unit less than our current?
        if (limitAge[UNITS[unitsIndex]] < currentAge[UNITS[unitsIndex]]) {
            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: '\t\tIS_UP_TO_DATE:false'
            });
            return false;
        }

        // Increment our UNITS array pointer.
        unitsIndex++;
    }
    // If we get here, then all the D, H, M, S have passed and we can return false (is-not-old).
    log.debug({
        context: CONTEXT,
        verbosity: 7,
        message: '\t\tIS_UP_TO_DATE:true'
    });
    return true;
};
// }}}1

/** @public generatePayload(dataObject) {{{1
 *
 * Creates the payload object based on the expects a data object passed through
 * the _dataObject_ parameter.
 *
 * Calculations:
 *      Increase = New Number - Original Number
 *      % increase = Increase ÷ Original Number × 100
 *      Decrease = Original Number - New Number
 *      % decrease = Decrease ÷ Original Number × 100
 *      (Note how the % calculations are identical,-/+ determine the increase or decrease)
 *
 *  @param {Object} data
 */

function generatePayload(dataObj, pair){
    const CONTEXT = MODULE + '.' + 'generatePayload';

    // Payload Template
    let payload = {
        pair: pair,
        assets: {}
    };

    function getPriceChange(currentPrice, previousPrice){
        let result = (currentPrice - previousPrice);
        return result;
    }

    function getPercentChange(currentPrice, previousPrice){
        // % change = Decrease ÷ Original Number × 100
        let priceChange = (currentPrice - previousPrice);
        return (priceChange / previousPrice) * 100;
    }

    function getTrend(currentPrice, previousPrice){
        let trend;
        if(currentPrice > previousPrice){
            trend = 'up';
        }else{
            if(currentPrice < previousPrice){
                trend = 'down';
            }else{
                trend = 'flat';
            }
        }
        return trend;
    }

    log.debug({
        context: CONTEXT,
        verbosity: 9,
        message: ('Payload request for pair: ' + pair.toUpperCase() + ' received.')
    });

    if(!dataObj.data.current.hasOwnProperty(pair)){
        throw new Error('Invalid request for pair [' + pair.toUpperCase() + '] received!');
    }else{
        for(var asset in dataObj.data.current[pair].assets){
            // Build Values
            try {
                let currentPrice = formatNumbers(dataObj.data.current[pair].assets[asset].last, FORMAT[asset]);
                let previousPrice = formatNumbers(dataObj.data.previous[pair].assets[asset].last, FORMAT[asset]);
                let changePrice = formatNumbers((parseFloat(currentPrice) - parseFloat(previousPrice)), FORMAT[asset]);
                let changePercent = formatNumbers((getPercentChange(parseFloat(currentPrice),  parseFloat(previousPrice))), 2);

                // Construct Payload Object
                payload.assets[asset] = {
                    name:  asset,
                    formatted: {
                        current_price: currentPrice,
                        previous_price: previousPrice,
                        change_price: changePrice,
                        change_percent: changePercent,
                    },
                    original: {
                        current_price: dataObj.data.current[pair].assets[asset].last,
                        previous_price: dataObj.data.previous[pair].assets[asset].last,
                        change_price: getPriceChange(dataObj.data.current[pair].assets[asset].last, dataObj.data.previous[pair].assets[asset].last),
                        change_percent: getPercentChange(dataObj.data.current[pair].assets[asset].last, dataObj.data.previous[pair].assets[asset].last),
                    },
                    trend: getTrend(dataObj.data.current[pair].assets[asset].last, dataObj.data.previous[pair].assets[asset].last)
                };
            }catch(err){
                console.log(err);
            }
        }
    }

    // Return
    return payload;
}
// }}}1

/** @public async dataFeedTest(id) {{{1
 *
 * A test function that gets the server time in order to check the connectivity.
 * The _id_ parameter is the exchange id.
 *
 * @params {String} id
 */

async function dataFeedTest(id){
    // Exchange
    const exchange = new ccxt[id]();

    let response;

    // Actual Request
    try {
        response = await exchange.fetchTicker('BTC/USD');
    }catch(err){
        response = false;
        console.log(err);
    }
    return response;
}
//}}}1

/** @public async sendExchangeRequest(id, pair, symbols) {{{1
 *
 * A wrapper for the exchange request. The _id_ parameter is the exchange id.
 * The _pair_ parameter is a fiat pair (any of the USD, EUR etc. pairs).
 * The _symbols_ parameter is a way to pass in an array of symbols (any of the XBT, XRP, ETH etc. symbols).
 * At the end, a data container populated with ticker data is returned.
 *
 * @params {String} id
 * @params {String} pair
 * @params {Array} symbols
 * @returns {Object}
 */

async function sendExchangeRequest(id, pair, symbols){
    const CONTEXT = MODULE + '.' + 'exchangeRequest';

    let processData = {
        assets: {},
        signature: {}
    };

    let processSymbols = symbols.map(s => s + '/' + pair);

    // Exchange
    const exchange = new ccxt[id] ({ enableRateLimit: true });

    // Flags
    let processSuccess;

    // Fetch Data
    for (let symbol of processSymbols) {
        // Init success for the process as a success only if it has NOT been
        // already flagged for failures.
        processSuccess = (processSuccess != false) ? true : processSuccess;

        // add error/exception handling as required by the Manual:
        // https://github.com/ccxt/ccxt/wiki/Manual#error-handling

        // Generate an entry key.
        let entryKey = symbol.split('/')[0].toLowerCase();

        log.debug({
            context: CONTEXT,
            verbosity: 7,
            message: 'Data for [{0}] on [{1}] has been requested.'.stringFormatter(symbol, id)
        });

        // Try fetching the ticker for the symbol existing on the exchange.
        try {
            // (TEST): start
            // const delay = (ms) => new Promise(resolve => setTimeout(() => {
            //     log.debug({
            //            context: CONTEXT,
            //            verbosity: 5,
            //            message: (`___TEST___: Deliberate slow-down activated. Waiting for ${ms} millisecond(s) ...`),
            //        });
            //     resolve('ok');
            // }, ms));
            //
            // await delay(9000);
            // (TEST): end

            // Switch between an actual or a mock data request.
            const ticker = USE_MOCK_DATA_FEED ? await mockdata.fetchTicker(symbol) : await exchange.fetchTicker(symbol);

            log.info({
                context: CONTEXT,
                verbosity: 2,
                message: 'Data received: [{0}], [{1}], [{2}]'.stringFormatter(
                    ticker['symbol'], ticker['timestamp'], ticker['last'])
            });

            // Populate the data container.
            processData.assets[entryKey] = {
                symbol: ticker['symbol'],
                timestamp: ticker['timestamp'],
                last: ticker['last'],
                success: true
            };
        } catch (error) { // catch the error (if any) and handle it or ignore it
            if(isReservedException(retryExceptions, error)){
                // Soft Error, we can come back and retry.
                log.error({
                    context: CONTEXT,
                    message: 'Data request for [{0}] on [{1}] has failed with the following exception:\n{2}: {3}'
                        .stringFormatter(symbol, exchange.id, error.name, error.message)
                });

                // We still need to maintain a consistent carriage container.
                // For that reason place holder data is created
                processData.assets[entryKey] = {
                    symbol: symbol,
                    timestamp: Date.now(),
                    last: null,
                    success: false
                };
                // Flag the whole request as unsuccessful.
                processSuccess = false;

                // Drop exception and move on.
                continue;
            }

            // Hard Error, meaning we need to terminate, no point in retrying.
            log.error({
                context: CONTEXT,
                message: 'Request for [{0}] on [{1}] has failed with the following exception:\n{2}: {3}'
                    .stringFormatter(symbol, exchange.id, error.name, error.message)
            });

            // Terminate, nothing will be returned.
            throw error;
        }
    }

    // Validate the data object.
    processData.signature['timestamp'] = Date.now();
    processData.signature['success'] = processSuccess;

    // Output, return partial or complete data.
    return processData;
}
// }}}1

/** @public checkForEqualArrays(a, b) {{{1
 *
 * Compares two arrays and returns 'true' if the arrays are identical.
 * (https://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript)
 *
 * @params {Array} a
 * @params {Array} b
 * @returns {Boolean}
 */

function checkForEqualArrays(a, b) {
    // if the other array is a false value, return
    if (!a || !b)
        return false;

    // compare lengths - can save a lot of time
    if (a.length != b.length)
        return false;

    for (var i = 0, l = a.length; i < l; i++) {
        // Check if we have nested arrays
        if (a[i] instanceof Array && b[i] instanceof Array) {
            // recurs into the nested arrays
            if (!a[i].equals(b[i]))
                return false;
        }
        else if (a[i] != b[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}
// }}}1

/** @pubic validateCache(cache, entry) {{{1
 *
 * Expects a state cache and evaluates that incoming cache based on a specific entry.
 * The _cache_ is a state-cache array. The _entry_ argument is a specific 'entry' within the state-cache.
 * The result is an object bundle containing boolean flags.
 *
 * @params {Array} cache
 * @params {String} entry
 * @returns {boolean}
 */

function validateCache(cache, entry) {
    const CONTEXT = MODULE + '.' + 'validateCache';

    let result = {
        current: false,
        previous: false,
        upToDate: false
    };

    try {
        // Check the CURRENT field.
        if (cache.data.current.hasOwnProperty(entry) &&
            cache.data.current[entry].hasOwnProperty('signature') &&
            cache.data.current[entry].signature.success) {
            log.info({
                context: CONTEXT,
                verbosity: 1,
                message: ('\tSTATE_CACHE:' + entry.toUpperCase() + ':CURRENT field checks fine.')
            });
            result.current = true;
        } else {
            log.warning({
                context: CONTEXT,
                verbosity: 1,
                message: ('\tSTATE_CACHE:' + entry.toUpperCase() + ':CURRENT field is missing or incomplete.')
            });
            result.current = false;
        }

        // Check the PREVIOUS field.
        if (cache.data.previous.hasOwnProperty(entry) &&
            cache.data.previous[entry].hasOwnProperty('signature') &&
            cache.data.previous[entry].signature.success) {
            log.info({
                context: CONTEXT,
                verbosity: 1,
                message: ('\tSTATE_CACHE:' + entry.toUpperCase() + ':PREVIOUS field checks fine.')
            });
            result.previous = true;
        } else {
            log.warning({
                context: CONTEXT,
                verbosity: 1,
                message: ('\tSTATE_CACHE:' + entry.toUpperCase() + ':PREVIOUS field is missing or incomplete.')
            });
            result.previous = false;
        }

        // Check the incoming state for the required properties.
        // Check the AGE of the stored data.
        if (cache.data.current.hasOwnProperty(entry) &&
            cache.data.current[entry].hasOwnProperty('signature') &&
            cache.data.current[entry].signature.hasOwnProperty('timestamp') &&
            result.current) {

            let stateCacheTime = new Date(cache.data.current[entry].signature.timestamp);
            let currentTime = new Date();

            // DEBUG: Test dates.
            // let stateCacheTime = new Date('Jan 6, 2019 19:15:28');
            // let currentTime = new Date('Jan 6, 2019 19:30:27');

            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: '\t<CURRENT_TIME> ' + currentTime + ' <STATE_CACHE:' + entry.toUpperCase() + ':TIME> ' + stateCacheTime,
            });

            // Get timestamp difference and the age limits.
            let currentAgeObj = new getAge(currentTime, stateCacheTime);
            let diff = currentAgeObj.getDiff();

            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: '\tSTATE_CACHE is (' + diff.days + ') days, (' + diff.hours + ') hours, (' + diff.minutes + ') minutes and (' + diff.seconds + ') seconds old.'
            });

            let limit = config.get('STATE_CACHE_FILE_AGE_LIMIT');

            log.debug({
                context: CONTEXT,
                verbosity: 7,
                message: '\tAGE_LIMIT for the STATE_CACHE is (' + limit.days + ') days, (' + limit.hours + ') hours, (' + limit.minutes + ') minutes and (' + limit.seconds + ') seconds.'
            });

            if(!currentAgeObj.isUpToDate(limit)){
                log.warning({
                    context: CONTEXT,
                    verbosity: 1,
                    message: ('\tSTATE_CACHE:' + entry.toUpperCase() + ':DATA is out of date.')
                });
                result.upToDate = false;
            } else {
                log.info({
                    context: CONTEXT,
                    verbosity: 1,
                    message: ('\tSTATE_CACHE:' + entry.toUpperCase() + ':DATA is up to date.')
                });
                result.upToDate = true;
            }
        } else {
            throw new Error('Invalid STATE_CACHE_DATA.');
        }
    } catch (error) {
        log.severe({
            context: CONTEXT,
            message: ('\tSTATE_CACHE validation has failed.\n' + error)
        });
    }

    return result;
}
// }}}1

/** @public generateStateCacheValidators(cache, entries) {{{1
 *
 * A wrapper function for the validateCache() function. Designed to batch
 * process the state-cache validations process.
 *
 * @params {Array} cache A state-cache object.
 * @params {Array} entries A list of state-cache keys.
 * @returns {Array} Returns an object bundle of validation results.
 */
function generateStateCacheValidators(cache, entries) {
    const CONTEXT = MODULE + '.' + 'validators';

    let stateCacheValidators = {};

    // Iterate over entries: 'eur' and 'usd'
    for (const entry of entries) {
        log.debug({
            context: CONTEXT,
            verbosity: 7,
            message: ''.concat('[', entry, '] Starting validator batching.')
        });

        // Run the validation batching here.
        let validator = validateCache(cache, entry);

        // Example for the batched validators data structure:
        // {
        //  'eur': {
        //      current: boolean,
        //      previous: boolean,
        //      upToDate: boolean
        //  },
        //  'use': {
        //      current: boolean,
        //      previous: boolean,
        //      upToDate: boolean
        //  }
        // }
        stateCacheValidators[entry] = validator;

        log.debug({
            context: CONTEXT,
            verbosity: 7,
            message: ''.concat('[', entry, '] current:', validator.current, ', previous:', validator.previous, ', upToDate:', validator.upToDate)
        });

        if (!validator.current || !validator.previous || !validator.upToDate) {
            log.warning({
                context: CONTEXT,
                verbosity: 1,
                message: 'Validation has failed for one or more component.'
            });
        }
    }

    // Return the batched validators.
    return stateCacheValidators;
}
// }}}1

/** @public consolidateStateCacheValidators(validators) {{{1
 *
 * Consolidates multiple validators and evaluates the result. Also generates
 * a validation table. Expects a bundle of state-cache validation results
 * passed through the _validators_ parameter. Returns an object with the flattened validators.
 *
 * @params {Array} validators
 * @returns {Array}
 */

function consolidateStateCacheValidators(validators) {
    let rows = Object.keys(validators);
    let columns = [];
    let consolidatedValidator = {};
    let tableData = [];
    let index = ['pair'];

    // ROW(s): [ 'eur', 'usd' ]
    // COLUMNS: [ 'current', 'previous', 'upToDate' ]
    rows.forEach((row) => {
        let items = Object.keys(validators[row]);

        // We are done.
        if (columns.length == 0) {
            columns = items;
        }

        // But continue checking for malformed columns/rows cases.
        if (!checkForEqualArrays(columns, items)) {
            throw new Error('Malformed validator strcture! Columns NOT matching!');
        }
    });

    // Run the consolidator.
    // Generates the 'consolidatedValidator' component.
    // +----------+
    // | current  |
    // +----------+
    // | true?    |
    // | false?   |
    // +----------+

    // +----------+
    // | previous |
    // +----------+
    // | true?    |
    // | false?   |
    // +----------+

    // +----------+
    // | upToDate |
    // +----------+
    // | true?    |
    // | false?   |
    // +----------+

    // Iterates over each column header and populates each rows.
    columns.forEach((column) => {
        let state = true;
        // Run on the current column.
        rows.forEach((row) => {
            let item = validators[row][column];
            // If item is 'false' and the state has been set to before true, set to false.
            if(!item && state){
                state = false;
            }
        });
        consolidatedValidator[column] = state;
    });

    // Run the table generation.
    // Generates the 'transformedTable' component

    // First initialize the table.
    // +---------------------------------------+
    // | pairs | current | previous | upToDate |
    // |-------|---------|----------|----------|
    // | eur   |    x    |    x     |    x     |
    // |-------|---------|----------|----------|
    // | usd   |    x    |    x     |    x     |
    // +---------------------------------------+
    //
    // ['pairs', 'eur', 'usd']
    index = [...index, ...rows];

    // First column.
    tableData.push(index);

    // Run the consolidation.
    columns.forEach((column) => {
        let rowContents = [];
        // Run on the current column.
        rowContents.push(column);
        rows.forEach((row) => {
            let item = validators[row][column];
            // Accumulate the row.
            rowContents.push(item);
        });
        tableData.push(rowContents);
    });

    let transformedTable = [];

    // Rebuild the table data by converting
    // a list of columns into a list of rows.
    let i;
    for(i = 0; i < tableData[0].length; i++){
        let rowData = [];
        tableData.forEach( (item) => {
            let member = item[i];
            if(typeof member === 'boolean'){
                // For boolean items.
                member = member ? green(member) : red(member);
            }
            rowData.push(member);
        });
        transformedTable.push(rowData);
    }

    // Return the results.
    return [consolidatedValidator, transformedTable];
}
// }}}1

/* EXPORTS */
module.exports = {
    moduleTest: moduleTest,
    dataFeedTest: dataFeedTest,
    writeState: writeState,
    readState: readState,
    getAge: getAge,
    generatePayload: generatePayload,
    sendExchangeRequest: sendExchangeRequest,
    checkForEqualArrays: checkForEqualArrays,
    validateCache: validateCache,
    generateStateCacheValidators: generateStateCacheValidators,
    consolidateStateCacheValidators: consolidateStateCacheValidators
};

// vim: fdm=marker ts=4
