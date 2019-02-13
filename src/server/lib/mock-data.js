'use strict';
// lib/mock-data.js

// Local Imports
const { MockExchangeError } = require('./errors');

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
    }
};
//}}}1

// Mock Data Object {{{1
let mockData = {
    data: {
        current: {
            symbols: {
                btc: {
                    symbol: 'BTC/EUR',
                    timestamp: 1546814529435,
                    last: 2988.40,
                    success: true
                },
                eth: {
                    symbol: 'ETH/EUR',
                    timestamp: 1546814532329,
                    last: 135.85,
                    success: true
                },
                zec: {
                    symbol: 'ZEC/EUR',
                    timestamp: 1546814536334,
                    last: 53.47,
                    success: true
                },
                ltc: {
                    symbol: 'LTC/EUR',
                    timestamp: 1546814539434,
                    last: 34.08,
                    success: true
                },
                xmr: {
                    symbol: 'XMR/EUR',
                    timestamp: 1546814546214,
                    last: 48.11,
                    success: true
                },
                dash: {
                    symbol: 'DASH/EUR',
                    timestamp: 1546814547370,
                    last: 73.968,
                    success: true
                },
                eos: {
                    symbol: 'EOS/EUR',
                    timestamp: 1546814550195,
                    last: 2.5072,
                    success: true
                },
                etc: {
                    symbol: 'ETC/EUR',
                    timestamp: 1546814552288,
                    last: 4.712,
                    success: true
                },
                xlm: {
                    symbol: 'XLM/EUR',
                    timestamp: 1546814555452,
                    last: 0.105513,
                    success: true
                },
                xrp: {
                    symbol: 'XRP/EUR',
                    timestamp: 1546814558315,
                    last: 0.32003,
                    success: true
                }
            },
            info: {
                timestamp: 1546814558316,
                success: true
            }
        },
        previous: {
            symbols: {
                btc: {
                    symbol: 'BTC/EUR',
                    timestamp: 1546814475535,
                    last: 3538.2,
                    success: true
                },
                eth: {
                    symbol: 'ETH/EUR',
                    timestamp: 1546814477965,
                    last: 135.9,
                    success: true
                },
                zec: {
                    symbol: 'ZEC/EUR',
                    timestamp: 1546814481472,
                    last: 53.47,
                    success: true
                },
                ltc: {
                    symbol: 'LTC/EUR',
                    timestamp: 1546814483557,
                    last: 34.08,
                    success: true
                },
                xmr: {
                    symbol: 'XMR/EUR',
                    timestamp: 1546814487417,
                    last: 48.02,
                    success: true
                },
                dash: {
                    symbol: 'DASH/EUR',
                    timestamp: 1546814490341,
                    last: 73.968,
                    success: true
                },
                eos: {
                    symbol: 'EOS/EUR',
                    timestamp: 1546814492554,
                    last: 2.5133,
                    success: true
                },
                etc: {
                    symbol: 'ETC/EUR',
                    timestamp: 1546814495574,
                    last: 4.717,
                    success: true
                },
                xlm: {
                    symbol: 'XLM/EUR',
                    timestamp: 1546814499426,
                    last: 0.105402,
                    success: true
                },
                xrp: {
                    symbol: 'XRP/EUR',
                    timestamp: 1546814501577,
                    last: 0.32,
                    success: true
                }
            },
            info: {
                timestamp: 1546814501578,
                success: true
            }
        }
    },
    config: {
        pair: 'EUR'
    }
};
// }}}1

/* Private Functions*/

// @private queryMockTickers(symbol, callback) {{{1
//
//  ARGS:
//      symbol: any of the ticker symbols
//  NOTES:
//      A low level API response emulator.
//
function queryMockTickers(symbol){
    // Promisify the request.
    return new Promise((resolve, reject) => {
        let result;

        // Emulate an asynchronous fetch.
        setTimeout(() => {
            result = mockTickers[symbol];
            try {
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
    });
}
//}}}1

// @private randomLastPrice(min, max) {{{1
//
//  ARGS:
//      min: Minimum value.
//      max: Maximum value.
//  INFO:
//      A function to generate a random last price, within the provided range.
//
function randomLastPrice(min, max){
    // console.log('min:', min, 'max', max);
    return Math.random() * (max - min) + min;
}
//}}}1

/* Public Functions */

// @public moduleTest() {{{1
//  ARGS:
//      No arguments.
//  INFO:
//      A simple module test function.
//
function moduleTest(){
    console.log('__MOCK-DATA__ module accessed.');
}
//}}}1

// @public async fetchTicker(symbol) {{{1
//
//  ARGS:
//      symbol: any of the ticker symbols
//  INFO:
//      A wrapper for the mock API request.
//
async function fetchTicker(symbol) {
    // We need to switch the separator here.
    let symbolSeparator = symbol.replace('/', '_');
    let data;
    try {
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
