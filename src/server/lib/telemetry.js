/* Price Table Server | tradekit.io
 *
 * Telemetry Object
 *
 * This is the module responsible for keep track of the diagnostics.
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 *
 */

'use strict';

// Project Imports
// None

var MODULE = 'telemetry';

/** @public TelemetryLayer() {{{1
 *
 * This is the core telemetry object that handles the diagnostics for the server.
 */

function TelemetryLayer(data) {
    // Internal Storage
    let storage = data;

    let publicMethods = {
        set isDataFeedActive(value){
            storage.isDataFeedActive = value;
        },
        set dataFeedState(value){
            storage.dataFeedState = value;
        },
        set isDataContainerReady(value){
            storage.isDataContainerReady = value;
        },
        set areServicesRunning(value){
            storage.areServicesRunning = value;
        },
        query: (item) => {
            if(storage.dataFeedState == 'offline'){
                storage.isDataFeedActive = false;
            }else{
                storage.isDataFeedActive = true;
            }

            // Return data container.
            return storage[item];
        }
    };
    return publicMethods;
}
// }}}1

module.exports = {
    Layer: TelemetryLayer
};

// vim: fdm=marker ts=4

