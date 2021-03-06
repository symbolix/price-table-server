/* Price Table Server | tradekit.io
 *
 * @mudule: dataschema
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 *
 */

'use strict';

// Project Imports
// None

/** Schema Templates {{{1
 * Template for the protocol and data storage containers.
 */

/* Persistent Data Templates */

/** Data Template {{{2
 * Template for the persistent data container.
 * Structure:
 *      SECTION         : 'data' or 'utility' (static).
 *      FIELD           : 'current' or 'previous' (static).
 *      PAIR            : 'EUR', 'USD', etc (dynamic).
 *      COMPONENT       : 'assets' or 'signature' (static).
 *      ELEMENT         : An element of the component.
 * Notes:
 *       - The ELEMENT of the COMPONENT is expected to be an {} for 'asset' type components.
 *       - The 'signature' section is for storing generic data for each PAIR.
 *       - The 'assets' section is for storing individual assets for each PAIR.
 *       - Only end-points get the 'null' value.
 *       - At least one child (FIELD) is expected under each SECTION.
 */
let dataTemplate = {
    data: {
        current: {},
        previous: {}
    },
    utility: {
        attributes: {}
    }
};
//}}}2

/* Client Response Templates */

/** restApiTemplate {{{2
 * Template for the REST API carrier.
 * info: Generic protocol information that will NOT change.
 * feedback: This is reserved for internal states.
 *      records: Section reserved for any server side messages, validation and stamping.
 *          requestId: Every unique send should have an id.
 *          requestTimestamp: Time signature for the response.
 *      diagnostics: Reserved for server-to-client configuration feedback.
 *                   This should be controlled by a secondary container as it
 *                   will be storing information about the state of the server.
 * payload: The payload.
 */
var restApiTemplate = {
    info: {
        api: {
            schema: 'rest-v0.0.1.[3]',
            version: 'rest-V1.01'
        },
        server: {
            name: null,
            version: null
        }
    },
    feedback: {
        records: {
            clientInput: null,
            requestId: null,
            requestTimestamp: []
        },
        diagnostics: {
            flags: {
                hasClientInput: null,
                isFirstTransmission: null,
                isDataFeedActive: null
            },
            states: {
                dataFeed: null
            }
        }
    },
    payload: {}
};
// }}}2

/** webSocketTemplate {{{2
 * Template for the WEBSOCKETS carrier.
 * *
 * payload: The payload.
 */
var webSocketTemplate = {
    info: {
        api: {
            schema: 'websocket-v0.0.1.[2]',
            version: 'socket-V1.01'
        },
        server: {
            name: null,
            version: null
        }
    },
    message: {
        event: null,
        contents: null
    },
    feedback: {
        records: {
            clientInput: null,
            requestId: null,
            requestTimestamp: []
        },
        diagnostics: {
            flags: {
                hasClientInput: null,
                isFirstTransmission: null,
                isDataFeedActive: null
            },
            states: {
                dataFeed: null
            }
        }
    },
    payload: {}
};
//}}}2

/** diagnosticsTemplate {{{2
 * Template for the DIAGNOSTICS layer.
 * {Boolean}    isDataFeedActive true/false
 * {String}     dataFeedState "online" | "degraded" | "offline"
 */
var diagnosticsTemplate = {
    isDataFeedActive: null,
    dataFeedState: null,
    isDataContainerReady: false,
    areServicesRunning: false
};

module.exports = {
    webSocketTemplate: webSocketTemplate,
    restApiTemplate: restApiTemplate,
    dataTemplate: dataTemplate,
    diagnosticsTemplate: diagnosticsTemplate
};

// vim: fdm=marker ts=4
