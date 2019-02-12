'use strict';
// lib/utils.js

// Project Imports
const ccxt = require ('ccxt');
const fs = require('fs');

// Local Imports
var logging = require('./logging');
var mockdata = require('./mock-data');

// Logging
const log = logging.getLogger();

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
    return new Promise(function(resolve, reject) {
        fs.readFile(filepath, 'utf8', function(err, data){
            if (err) {
                log.error({
                    context: CONTEXT,
                    message: 'File read request has failed for: {0}'.stringFormatter(filepath)
                });
                // setTimeout(function() { reject(err); }, 3000);
                reject(err);
            } else {
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'File read request was successful for: {0}'.stringFormatter(filepath)
                });
                // setTimeout(function() { resolve(data); }, 3000);
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
    return new Promise(function(resolve, reject) {
        reject(false);
        /*
        fs.writeFile(filepath, JSON.stringify(data), ((err) => {
            if (err) {
                log.error({
                    context: CONTEXT,
                    message: 'File write request has failed for: {0}'.stringFormatter(filepath)
                });
                setTimeout(function() { reject(false); }, 3000);
                // reject(false);
            } else {
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'File write request was successful for: {0}'.stringFormatter(filepath)
                });
                setTimeout(function() { resolve(true); }, 3000);
                // resolve(true);
            }
        })
        );
        */
    });
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

// @public async writeState(filepath, data, callback) {{{1
//  ARGS:
//      filepath: full or relative path to a state file.
//      data    : A data container object.
//  NOTE:
//      A function to write a JSON cache file.
//
async function writeState(filepath, data, callback) {
    const CONTEXT = 'writeState';
    let response;
    // Make an async promise call. The await is needed here otherwise the
    // process will not be set to wait until the cache file is imported.
    await _writeState(filepath, data)
        .then((result) => {
            // On SUCCESS, return true.
            log.info({
                context: CONTEXT,
                verbosity: 5,
                message: 'State cache data export was successful for: {0}'.stringFormatter(filepath)
            });
            response = result;
        })
        .catch((failure) => {
            // On FAILURE, return an error object.
            log.error({
                context: CONTEXT,
                message: 'State cache data export has failed for: {0}'.stringFormatter(filepath)
            });
            response = failure;
        });

    // Callback
    callback(response);
}
// }}}1

// @public async readState(filepath, callback) {{{1
//
//  ARGS:
//      filepath: full or relative path to a state file.
//      callback: a function to be executed on promise delivery.
//  INFO:
//      A promise wrapper for the JSON cache file request.
//
async function readState(filepath, callback){
    let response = {};
    const CONTEXT = 'readState';

    // Make an async promise call. The await is needed here otherwise the
    // process will not be set to wait until the cache file is imported.
    await _readState(filepath)
        .then((result) => {
            // On SUCCESS, return the JSON object.
            log.info({
                context: CONTEXT,
                verbosity: 5,
                message: 'State cache file request was successful for: {0}'.stringFormatter(filepath)
            });
            response.data = JSON.parse(result);
            response.error = 'None';
        })
        .catch((failure) => {
            // On FAILURE, return an error object.
            log.error({
                context: CONTEXT,
                message: 'State cache data request has failed with the following exception:\n{0}'.stringFormatter(failure.stack)
            });
            response.data = 'None';
            response.error = failure;
        });

    // Callback
    callback(response);
}
// }}}1

// @public timeDiff(date1, date2)
//      date1: first date object.
//      date2: second date object.
//      https://www.tutorialspoint.com/How-to-get-time-difference-between-two-timestamps-in-seconds
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

    // console.log(dataObj.data);

    for(var symbol in dataObj.data.current.symbols){
        // symbol
        console.log(symbol);
        // Build Values
        let _currentPrice = _formatNumbers(dataObj.data.current.symbols[symbol].last);
        let _previousPrice = _formatNumbers(dataObj.data.previous.symbols[symbol].last);
        let _changePrice = _formatNumbers(_currentPrice - _previousPrice);
        let _changePercent = _formatNumbers(getPercentChange(_currentPrice,  _previousPrice));

        // Construct Payload Object
        payload.coins[symbol] = {
            name:  symbol,
            formatted: {
                current_price: _currentPrice,
                previous_price: _formatNumbers(dataObj.data.previous.symbols[symbol].last),
                change_price: _changePrice,
                change_percent: _changePercent,
            },
            original: {
                current_price: dataObj.data.current.symbols[symbol].last,
                previous_price: dataObj.data.previous.symbols[symbol].last,
                change_price: getPriceChange(dataObj.data.current.symbols[symbol].last, dataObj.data.previous.symbols[symbol].last),
                change_percent: getPercentChange(dataObj.data.current.symbols[symbol].last, dataObj.data.previous.symbols[symbol].last),
            },
            trend: getTrend(dataObj.data.current.symbols[symbol].last, dataObj.data.previous.symbols[symbol].last)
        };
    }

    // Return
    return payload;
}
// }}}1

// @public sendExchangeRequest(id, pair, symbols, callback) {{{1
//
//  ARGS:
//      id: exchange id.
//      pair: fiat pair.
//      symbols: array of symbols
//      callback: callback function.
//
//  INFO:
//      A wrapper for the exchange request.
//
async function sendExchangeRequest(id, pair, symbols, callback){
    let processData = {
        assets: {},
        signature: {}
    };

    let processSymbols = symbols.map(s => s + '/' + pair);

    // Exchange
    const exchange = new ccxt[id] ({ enableRateLimit: true });

    // Flags
    let processSuccess;

    // Init
    let errorState = false;

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
            context: 'request',
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
                context: 'request',
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

        } catch (e) { // catch the error (if any) and handle it or ignore it
            // The structure of the exception is: e.constructor.name, e.message
            log.error({
                context: 'request',
                message: 'Data request for [{0}] on [{1}] has failed with the following exception:\n{2}'.stringFormatter(symbol, exchange.id, e.constructor.name)
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
            errorState = true;
        }
    }

    // Validate the data object.
    processData.signature['timestamp'] = Date.now();
    processData.signature['success'] = processSuccess;

    // Output
    let err = errorState;
    callback(err, processData);
}
// }}}1

/* EXPORTS */
module.exports = {
    moduleTest: moduleTest,
    writeState: writeState,
    readState: readState,
    timeDiff: timeDiff,
    generatePayload: generatePayload,
    sendExchangeRequest: sendExchangeRequest
};

// vim: fdm=marker ts=4
