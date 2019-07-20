/* Price Table Server | tradekit.io
 *
 * WEBSOCKET Object
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 */

'use strict';

// Project Imports
// None

var MODULE = 'socketObject';

/** @public SocketLayer() {{{1
 *
 * This is the core socket object that handles the signal flow from the server
 * to the client through the WebSocket connection.
 */

function SocketLayer(data, name, version) {
    // Internal Storage
    let storage = data;
    storage.info.server.name = name;
    storage.info.server.version = version;

    let publicMethods = {
        set clientInput(value) {
            storage.feedback.records.clientInput = value;
            storage.feedback.diagnostics.flags.hasClientInput = true;
        },
        set isDataFeedActive(value){
            storage.feedback.diagnostics.flags.isDataFeedActive = value;
        },
        set dataFeed(value){
            storage.feedback.diagnostics.states.dataFeed = value;
        },
        set payload(value){
            storage.payload = value;
        },
        set message(value){
            storage.message = value;
        },
        query: () => {
            // Handle the 'isFirstTransmission' flag.
            if(storage.message.event == 'onConnection'){
                storage.feedback.diagnostics.flags.isFirstTransmission = true;
            }else{
                storage.feedback.diagnostics.flags.isFirstTransmission = false;
            }

            // Handle the 'hasClientInput' flag.
            if(storage.feedback.records.clientInput === null || storage.feedback.records.clientInput === ''){
                storage.feedback.diagnostics.flags.hasClientInput = false;
            }else{
                storage.feedback.diagnostics.flags.hasClientInput = true;
            }

            // Handle auto fields.
            storage.feedback.records.requestTimestamp = [new Date(), new Date().getTime()];
            storage.feedback.records.requestId = 'b1f005d3-0ae1-41c9-8727-eeb3b1858112';

            // Return data container.
            return storage;
        }
    };
    return publicMethods;
}
// }}}1

module.exports = {
    Layer: SocketLayer
};

// vim: fdm=marker ts=4
