/*
 * R£ST Asset Routes
 *
 * Copyright (c) 2019 Milen Bilyanov, "cryptoeraser"
 * Licensed under the MIT license.
 */

'use strict';

// Project Imports
const assetController = require('../controllers/assetController.js');
const getAssets = assetController.getAssets;
const getAssetBySymbol = assetController.getAssetBySymbol;

function routes(app) {
    app.route('/assets')
        .get((req, res, next) => {
            // middleware
            console.log(`Request from: ${req.originalUrl}`);
            console.log(`Request type: ${req.method}`);
            next();
        }, getAssets);


    app.route('/asset/:symbol')
        .get(getAssetBySymbol);
}

/* EXPORTS */
module.exports = {
    getRoutes: routes
};

// vim: fdm=marker ts=4
