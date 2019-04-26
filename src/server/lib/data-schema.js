/*
 * Data Schemas
 * @module schema
 *
 * Copyright (c) 2019 Milen Bilyanov, "cryptoeraser"
 * Licensed under the MIT license.
 */

'use strict';

// Project Imports
// None

/** Schema Templates {{{1
 * Template for the protocol and data strage containers.
 */

// TODO: Diagnostics template!


/** Package Template {{{2
 * Template for the response data container.
 * pairs    : Market pairs.
 * utility  : A field for extra data.
 *      exportId    : An unique identifier that is updated each time the
 *                    package the data export is generated.
 */
let packageTemplate = {
    package: {
        pairs: {
            EUR: {
                assets: {
                    btc: {
                        symbol: 'BTC/EUR',
                        formatted: {
                            current_price: null,
                            previous_price: null,
                            change_price: null,
                            change_percent: null
                        },
                        original: {
                            current_price: null,
                            previous_price: null,
                            change_price: null,
                            change_percent: null
                        },
                        trend: null
                    }
                }
            },
            USD: {
                assets: {
                    btc: {
                        symbol: 'BTC/USD',
                        formatted: {
                            current_price: null,
                            previous_price: null,
                            change_price: null,
                            change_percent: null
                        },
                        original: {
                            current_price: null,
                            previous_price: null,
                            change_price: null,
                            change_percent: null
                        },
                        trend: null
                    }
                }
            }
        },
        utility: {
            exportId: null
        }
    }
};
// }}}2

/** Data Template {{{2
 * Template for the persistent data container.
 */
let dataTemplate = {
    data: {
        current: {
            pairs: {
                EUR: {
                    assets: {
                        btc: {
                            symbol: 'BTC/EUR',
                            timestamp: null,
                            last: null,
                            success: null
                        }
                    },
                    signature: {
                        timestamp: null,
                        success: null
                    }
                },
                USD: {
                    assets: {
                        btc: {
                            symbol: 'BTC/USD',
                            timestamp: null,
                            last: null,
                            success: null
                        },
                    },
                    signature: {
                        timestamp: null,
                        success: null
                    }
                }
            }
        },
        previous: {
            pairs: {
                EUR: {
                    assets: {
                        btc: {
                            symbol: 'BTC/EUR',
                            timestamp: null,
                            last: null,
                            success: null
                        }
                    },
                    signature: {
                        timestamp: null,
                        success: null
                    }
                },
                USD: {
                    assets: {
                        btc: {
                            symbol: 'BTC/USD',
                            timestamp: null,
                            last: null,
                            success: null
                        },
                    },
                    signature: {
                        timestamp: null,
                        success: null
                    }
                }
            }
        },
    }
};
//}}}2

/** restApiTemplate {{{2
 * Template for the REST API carrier.
 * static   : Static data is the data that will NOT change.
 * feedback : This is reserved for internal states.
 *      records     : Section reserved for any server side messages, validation and stamping.
 *          message     : Any messages.
 *          stateId     : Every unique send should have an id.
 *          timestamp   : Time signature for when the response was created.
 *      diagnostics : Reserved for server-to-client configuration feedback.
 *                    This should be controlled by a secondary container as it
 *                    will storing information about the state of the server.
 * package  : The payload.
 */
var restApiTemplate = {
    static: {
        version: {
            schema: 'rest-v0.0.1.[3]',
            api: 'rest-V1.01'
        }
    },
    feedback: {
        records: {
            message: null,
            stateId: null,
            timestamp: []
        },
        diagnostics: {
            flags: {}
        }
    },
    package: {}
};
// }}}2

/** webSocketTemplate {{{2
 * Template for the WEBSOCKETS carrier.
 * package  : The payload.
 */
var webSocketTemplate = {
    'message': null,
    'timestamp': [],
    'records': {},
    'flags': {
        'isFeedActive': false
    },
    'version': {
        'schema': 'rest-v0.0.1.[2]',
        'api': 'rest-V1.01'
    },
    'package': {}
};
//}}}2

module.exports = {
    webSocketTemplate: webSocketTemplate,
    restApiTemplate: restApiTemplate,
    dataTemplate: dataTemplate,
    packageTemplate: packageTemplate
};

// vim: fdm=marker ts=4
