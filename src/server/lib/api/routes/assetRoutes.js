/*
 * R£ST Asset Routes
 *
 * Copyright (c) 2019 Milen Bilyanov, "cryptoeraser"
 * Licensed under the MIT license.
 */

'use strict';

// Project Imports
const assetController = require('../controllers/assetController.js');

// Define Controllers
const getAssets = assetController.getAssets;
const getAssetBySymbol = assetController.getAssetBySymbol;

// Attach Controllers
function routes(app) {
    app.route('/assets/:pair')
        .get((req, res, next) => {
            // middleware
            console.log(`Request from: ${req.originalUrl}`);
            console.log(`Request type: ${req.method}`);
            console.log('Request params:', req.params);
            next();
        }, getAssets);

    app.route('/asset/:pair/:symbol')
        .get((req, res, next) => {
            // middleware
            console.log(`Request from: ${req.originalUrl}`);
            console.log(`Request type: ${req.method}`);
            console.log('Request params:', req.params);
            next();
        }, getAssetBySymbol);
}

// Exports
module.exports = {
    getRoutes: routes
};

// vim: fdm=marker ts=4
