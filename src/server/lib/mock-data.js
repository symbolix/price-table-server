/* Price Table Server | tradekit.io
 *
 * @mudule: mockdata
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 */

'use strict';

// Local Imports
const { MockExchangeError } = require('./errors');
var logging = require('./logging');

var MODULE = 'mockdata';

// Logging
const log = logging.getLogger();

// Mock Ticker Object {{{1
const mockTickers = {
    get BTC_EUR() {
        let symbol = 'BTC/EUR';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(2891.47, 3037.63);
        return { symbol, timestamp, last };
    },
    get ETH_EUR() {
        let symbol = 'ETH/EUR';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(87.74, 97.44);
        return { symbol, timestamp, last };
    },
    get ZEC_EUR() {
        let symbol = 'ZEC/EUR';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(35.59, 43.71);
        return { symbol, timestamp, last };
    },
    get LTC_EUR() {
        let symbol = 'LTC/EUR';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(27.47, 28.93);
        return { symbol, timestamp, last };
    },
    get XMR_EUR() {
        let symbol = 'XMR/EUR';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(36.82, 39.18);
        return { symbol, timestamp, last };
    },
    get DASH_EUR() {
        let symbol = 'DASH/EUR';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(51.74, 58.23);
        return { symbol, timestamp, last };
    },
    get EOS_EUR() {
        let symbol = 'EOS/EUR';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(1.67, 2.19);
        return { symbol, timestamp, last };
    },
    get ETC_EUR() {
        let symbol = 'ETC/EUR';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(2.97, 3.42);
        return { symbol, timestamp, last };
    },
    get XLM_EUR() {
        let symbol = 'XLM/EUR';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(0.06472, 0.07126);
        return { symbol, timestamp, last };
    },
    get XRP_EUR() {
        let symbol = 'XRP/EUR';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(0.2597, 0.2669);
        return { symbol, timestamp, last };
    },
    get BTC_USD() {
        let symbol = 'BTC/USD';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(3891.47, 4037.63);
        return { symbol, timestamp, last };
    },
    get ETH_USD() {
        let symbol = 'ETH/USD';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(97.74, 117.44);
        return { symbol, timestamp, last };
    },
    get ZEC_USD() {
        let symbol = 'ZEC/USD';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(45.59, 53.71);
        return { symbol, timestamp, last };
    },
    get LTC_USD() {
        let symbol = 'LTC/USD';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(37.47, 48.93);
        return { symbol, timestamp, last };
    },
    get XMR_USD() {
        let symbol = 'XMR/USD';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(46.82, 59.18);
        return { symbol, timestamp, last };
    },
    get DASH_USD() {
        let symbol = 'DASH/USD';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(61.74, 78.23);
        return { symbol, timestamp, last };
    },
    get EOS_USD() {
        let symbol = 'EOS/USD';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(2.67, 3.19);
        return { symbol, timestamp, last };
    },
    get ETC_USD() {
        let symbol = 'ETC/USD';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(3.97, 4.42);
        return { symbol, timestamp, last };
    },
    get XLM_USD() {
        let symbol = 'XLM/USD';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(0.08472, 0.09126);
        return { symbol, timestamp, last };
    },
    get XRP_USD() {
        let symbol = 'XRP/USD';
        let timestamp = new Date().getTime();
        let last = randomLastPrice(0.2897, 0.2969);
        return { symbol, timestamp, last };
    }

};
//}}}1

/* Private Functions*/

/** @private queryMockTickers(symbol, callback) {{{1
 *
 * A low level API response emulator. The _symbol_ parameter is any of the ticker symbols.
 *
 * @param {String} symbol
 */

function queryMockTickers(symbol){
    // Promisify the request.
    return new Promise((resolve, reject) => {
        try {
            // Emulate an asynchronous fetch.
            setTimeout(() => {
                let result;
                try {
                    result = mockTickers[symbol];
                    if(result==undefined){
                        let message = `Ticker [${symbol}] is NOT found.`;
                        let error = new MockExchangeError(message, 'TickerNotFound');
                        reject(error);
                    }else{
                        resolve(result);
                    }
                } catch (error) {
                    reject(error);
                }
            }, 500);
        } catch(error) {
            reject(error);
        }
    });
}
//}}}1

/** @private randomLastPrice(min, max) {{{1
 *
 * A function to generate a random last price, within the provided range.
 * Expects a _min_ and _max_ parameter to define limits.
 *
 * @param {} min
 * @param {} max
 */

function randomLastPrice(min, max){
    return Math.random() * (max - min) + min;
}
//}}}1

/* Public Functions */

/** @public moduleTest() {{{1
 * A generic test function.
 */
function moduleTest(){
    let CONTEXT = MODULE + '.' + 'moduleTest';
    log.debug({
        context: CONTEXT,
        verbosity: 5,
        message: ('__MOCK-DATA__ module accessed.'),
    });
}
//}}}1

/** @public async fetchTicker(symbol) {{{1
 *
 * A wrapper for the mock API request. The _symbol_ argument can be any of the
 * ticker symbols.
 *
 * @param {String} symbol
 */

async function fetchTicker(symbol) {
    // We need to switch the separator here.
    try {
        let symbolSeparator = symbol.replace('/', '_');
        let data;
        // Make the async call.
        data = await queryMockTickers(symbolSeparator);
        return data;
    } catch(err) {
        // Propagate the exception up stream.
        throw err;
    }
}
// }}}1

/* EXPORTS */
module.exports = {
    moduleTest: moduleTest,
    fetchTicker: fetchTicker,
};

// vim: fdm=marker ts=4
