'use strict';
// lib/utils.js

// Project Imports
const ccxt = require ('ccxt');
const fs = require('fs');
const { ExchangeNotAvailable, ExchangeError, DDoSProtection, RequestTimeout } = require ('ccxt/js/base/errors');

// Local Imports
var logging = require('./logging');
var mockdata = require('./mock-data');
const { MockExchangeError, FileStreamError } = require('./errors');

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

// @private async _readState(filepath) {{{1
//
//  ARGS:
//      filepath: full or relative path to a state file.
//  INFO:
//      A private function with a lower level 'readFile' directive.
//
async function _readState(filepath) {
    const CONTEXT = '_readState';
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

// @private async _writeState(filepath, data) {{{1
//
//  ARGS:
//      filepath: full or relative path to a state file.
//      data    : data object to be cached.
//  INFO:
//      A private function with a lower level 'writeFile' directive.
//
async function _writeState(filepath, data) {
    const CONTEXT = '_writeState';
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

// @private isReservedException(array, exception) {{{1
//
//  ARGS:
//      array    : an array of reserved exception objects
//      exception: an exception object.
//  INFO:
//      A private function to test if an exception is part of reserved
//      exceptions.
//
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

// @private formatNumbers(raw)
// {{{1
function _formatNumbers(raw) {
    var i = parseFloat(raw);
    if(isNaN(i)) { i = 0.00; }
    var minus = '';
    if(i < 0) { minus = '-'; }
    i = Math.abs(i);
    i = parseInt((i + .005) * 100);
    i = i / 100;
    let s = new String(i);
    if(s.indexOf('.') < 0) { s += '.00'; }
    if(s.indexOf('.') == (s.length - 2)) { s += '0'; }
    s = minus + s;
    return parseFloat(s);
}
// }}}1

/* Public Functions */

// @public moduleTest() {{{1
//  ARGS:
//      No arguments.
//  INFO:
//      A simple module test function.
//
function moduleTest(){
    console.log('__UTILS__ module accessed.');
}
//}}}1

// @public async writeState(filepath, data) {{{1
//  ARGS:
//      filepath: full or relative path to a state file.
//      data    : A data container object.
//  NOTE:
//      A function to write a JSON cache file.
//
async function writeState(filepath, data) {
    const CONTEXT = 'writeState';
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

// @public async readState(filepath) {{{1
//
//  ARGS:
//      filepath: full or relative path to a state file.
//      callback: a function to be executed on promise delivery.
//  INFO:
//      A promise wrapper for the JSON cache file request.
//  RETURNS:
//      object { payload: obj, retry: boolean, state: boolean }
//
async function readState(filepath){
    let response = {
        payload: null,
        retry: true,
        state: false
    };
    const CONTEXT = 'readState';

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
            // On SUCCESS, inform us.
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

// @public timeDiff(date1, date2)
//      date1: first date object.
//      date2: second date object.
//      (https://www.tutorialspoint.com/How-to-get-time-difference-between-two-timestamps-in-seconds)
// {{{1
function timeDiff(date1, date2){
    var res = Math.abs(date1 - date2) / 1000;

    // get total days between two dates
    var days = Math.floor(res / 86400);

    // get hours
    var hours = Math.floor(res/ 3600) % 24;

    // get minutes
    var minutes = Math.floor(res / 60) % 60;

    // get seconds
    var seconds = res % 60;

    return {
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        isOld: function(ageObj1, ageObj2) {
            console.log('days_limit', ageObj1.days, '?', 'days_age', ageObj2.days);
            // old: days
            if(ageObj1.days < ageObj2.days){
                console.log('old (days)');
                return true;
            }else{
                if(ageObj1.days == ageObj2.days){
                    console.log('\tnext: hours');
                    console.log('\thours_limit', ageObj1.hours, '?', 'hours_age', ageObj2.hours);
                    if(ageObj1.hours < ageObj2.hours){
                        console.log('\told (hours)');
                        return true;
                    }else{
                        if(ageObj1.hours == ageObj2.hours){
                            console.log('\t\tnext (minutes)');
                            console.log('\t\tminutes_limit', ageObj1.minutes, '?', 'minutes_age', ageObj2.minutes);
                            if(ageObj1.minutes < ageObj2.minutes){
                                // old: minutes
                                console.log('\t\told (minutes)');
                                return true;
                            }else{
                                // equal: minutes
                                if(ageObj1.minutes == ageObj2.minutes){
                                    console.log('\t\t\tnext (seconds)');
                                    console.log('\t\t\tseconds_limit', ageObj1.seconds, '?', 'seconds_age', ageObj2.seconds);
                                    if(ageObj1.seconds < ageObj2.seconds){
                                        console.log('\t\t\told (seconds)');
                                        return true;
                                    }else{
                                        console.log('\t\t\tNOT old (seconds)');
                                        return false;
                                    }
                                // not old: minutes
                                }else{
                                    console.log('\t\tNOT old (minutes)');
                                    return false;
                                }
                            }
                        }else{
                            console.log('\tNOT old (hours)');
                            return false;
                        }
                    }
                }else{
                    console.log('NOT old (days)');
                    return false;
                }
            }
        }
    };
}
// }}}1

/** getAge (startDate, endDate) {{{1
 * Generates an age object based on the provided start and end dates.
 * (https://stackoverflow.com/questions/54811010/how-should-i-deal-with-nested-conditional-statements)
 * (https://www.tutorialspoint.com/How-to-get-time-difference-between-two-timestamps-in-seconds)
 * @parm {object} startDate : The date object for the start date.
 * @parm {object} endDate   : The date object for the end date.
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

    // Public Getter
    this.getDiff = function(){
        return this.diff;
    };
}
// }}}1

/** getAge.isOld (ageLimitObj) {{{1
 * This is a public method attached to the getAge() function.
 * Relies on internal data of a getAge() instance.
 * (https://stackoverflow.com/questions/54811010/how-should-i-deal-with-nested-conditional-statements)
 * @parm {object} ageLimitObj : An age limit object structured in the following
 * way: { days: 0, hours: 0, minutes: 5, seconds: 59 }
 */
// Attach the following public utility method to getAge()
getAge.prototype.isOld = function(ageLimitObj) {
    const CONTEXT = this.constructor.name + '.isOld';

    // ageObj1: is the inherited internal AGE object (this.diff).
    // ageObj2: is the AGE_LIMIT object.
    let ageObj1 = this.diff;
    let ageObj2 = ageLimitObj;

    // Keys template.
    const UNITS = ['days', 'hours', 'minutes', 'seconds'];

    // We create a flag, and an index to iterate over our UNITS array.
    let unitsIndex = 0;

    // We'll loop over the UNITS array. The key is that, if the current unit
    // exceeds the limit unit, we use an early return to break.
    while (unitsIndex < UNITS.length) {
        log.debug({
            context: CONTEXT,
            verbosity: 7,
            message: 'Cycle (' + unitsIndex + '), Item [' + UNITS[unitsIndex] + '], limit [' + ageObj2[UNITS[unitsIndex]] + '], current value: [' + ageObj1[UNITS[unitsIndex]] + '].',
        });
        // Here we check: is our limit unit less than our current?
        if (ageObj1[UNITS[unitsIndex]] > ageObj2[UNITS[unitsIndex]]) {
            log.warning({
                context: CONTEXT,
                verbosity: 1,
                message: 'STATE_CACHE is too old!'
            });
            return true;
        }

        // Increment our UNITS array pointer.
        unitsIndex++;
    }
    // If we get here, then all the D, H, M, S have passed and we can return false (is-not-old).
    log.info({
        context: CONTEXT,
        verbosity: 1,
        message: 'STATE_CACHE is NOT old.'
    });
    return false;
};
// }}}1

// @public generatePayload(dataObject)
// {{{1
function generatePayload(dataObj){
    // Payload Template
    let payload = {
        pair: dataObj.config.pair,
        coins: {}
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

    for(var asset in dataObj.data.current.assets){
        // asset
        // console.log(asset);
        // Build Values
        let _currentPrice = _formatNumbers(dataObj.data.current.assets[asset].last);
        let _previousPrice = _formatNumbers(dataObj.data.previous.assets[asset].last);
        let _changePrice = _formatNumbers(_currentPrice - _previousPrice);
        let _changePercent = _formatNumbers(getPercentChange(_currentPrice,  _previousPrice));

        // Construct Payload Object
        payload.coins[asset] = {
            name:  asset,
            formatted: {
                current_price: _currentPrice,
                previous_price: _formatNumbers(dataObj.data.previous.assets[asset].last),
                change_price: _changePrice,
                change_percent: _changePercent,
            },
            original: {
                current_price: dataObj.data.current.assets[asset].last,
                previous_price: dataObj.data.previous.assets[asset].last,
                change_price: getPriceChange(dataObj.data.current.assets[asset].last, dataObj.data.previous.assets[asset].last),
                change_percent: getPercentChange(dataObj.data.current.assets[asset].last, dataObj.data.previous.assets[asset].last),
            },
            trend: getTrend(dataObj.data.current.assets[asset].last, dataObj.data.previous.assets[asset].last)
        };
    }

    // Return
    return payload;
}
// }}}1

// @public sendExchangeRequest(id, pair, symbols) {{{1
//
//  ARGS:
//      id: exchange id.
//      pair: fiat pair.
//      symbols: array of symbols
//
//  INFO:
//      A wrapper for the exchange request.
//
async function sendExchangeRequest(id, pair, symbols){
    const CONTEXT = 'exchangeRequest';
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
            // Actual Request
            // const ticker = await exchange.fetchTicker(symbol);

            // Mock Request
            const ticker = await mockdata.fetchTicker(symbol);

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

/* EXPORTS */
module.exports = {
    moduleTest: moduleTest,
    writeState: writeState,
    readState: readState,
    timeDiff: timeDiff,
    getAge: getAge,
    generatePayload: generatePayload,
    sendExchangeRequest: sendExchangeRequest
};

// vim: fdm=marker ts=4
