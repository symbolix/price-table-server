/**
 * Data Schema
 * @module schema
 */

/** Schema Template {{{1
 * Template for the protocol container.
 * package  : The payload.
 * message  : Section reserved for any server side messages.
 * records  : Reserved for configuration data.
 * flags    : State flags.
 */

var webSocketTemplate = {
    'message': null,
    'timestamp': [new Date(),new Date().getTime() ],
    'records': {
        'clientInput': {},
        'serverUpdate': false,
        'feedActive': false,
    },
    'flags': {
        'isFirstTransmission': false,
        'hasClientInput': false
    },
    'version': {
        'schema': 'wss-v0.0.1.[2]',
        'api': 'wss-V1.01'
    },
    'package': {}
};
// }}}1

var restApiTemplate = {
    'message': null,
    'timestamp': [new Date(), new Date().getTime()],
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
// }}}1

module.exports = {
    /**
     * Provides utilities and templates for the WebSockets data schema.
     */
    webSocketTemplate: webSocketTemplate,
    restApiTemplate: restApiTemplate,
};

// vim: fdm=marker ts=4
