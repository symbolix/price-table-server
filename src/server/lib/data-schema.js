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

var template = {
    'message': null,
    'records': {
        'clientInput': {},
        'serverUpdate': false,
        'feedActive': false,
    },
    'flags': {
        'isFirstTransmission': false,
        'hasClientInput': false
    },
    'package': {}
};
// }}}1

module.exports = {
    /**
     * Provides utilities and templates for the WebSockets data schema.
     */
    template: template,
    version: 'v0.0.1.[1]'
};

// vim: fdm=marker ts=4
