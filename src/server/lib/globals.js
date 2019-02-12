// lib/globals.js

var resources = {
    APP_VERSION: '0.0.0.[1]',
    DATA_FEED_IS_ACTIVE: false,
    CURRENCY_PAIR: 'EUR',
    STATE_CACHE_FILE: './data/statecache.json',
    MOCK_DATA: {
        data: {
            current: {
                symbols: {
                    btc: {
                        symbol: 'BTC/EUR',
                        timestamp: 1546814529435,
                        last: 3538.6,
                        success: true
                    },
                    eth: {
                        symbol: 'ETH/EUR',
                        timestamp: 1546814532329,
                        last: 90.00,
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
                        last: 3518.2,
                        success: true
                    },
                    eth: {
                        symbol: 'ETH/EUR',
                        timestamp: 1546814477965,
                        last: 80.0,
                        success: true
                    },
                    zec: {
                        symbol: 'ZEC/EUR',
                        timestamp: 1546814481472,
                        last: 49.15,
                        success: true
                    },
                    ltc: {
                        symbol: 'LTC/EUR',
                        timestamp: 1546814483557,
                        last: 33.27,
                        success: true
                    },
                    xmr: {
                        symbol: 'XMR/EUR',
                        timestamp: 1546814487417,
                        last: 45.02,
                        success: true
                    },
                    dash: {
                        symbol: 'DASH/EUR',
                        timestamp: 1546814490341,
                        last: 75.248,
                        success: true
                    },
                    eos: {
                        symbol: 'EOS/EUR',
                        timestamp: 1546814492554,
                        last: 2.9216,
                        success: true
                    },
                    etc: {
                        symbol: 'ETC/EUR',
                        timestamp: 1546814495574,
                        last: 4.516,
                        success: true
                    },
                    xlm: {
                        symbol: 'XLM/EUR',
                        timestamp: 1546814499426,
                        last: 0.101402,
                        success: true
                    },
                    xrp: {
                        symbol: 'XRP/EUR',
                        timestamp: 1546814501577,
                        last: 0.29,
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
    }
};

function moduleTest(){
    console.log('__GLOBALS__ module accessed.');
}

function getResource(resource){
    return resources[resource];
}

function setResource(resource, value){
    resources[resource] = value;
}

module.exports = {
    moduleTest: moduleTest,
    set: setResource,
    get: getResource
};
