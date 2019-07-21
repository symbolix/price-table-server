/* Price Table Server | tradekit.io
 *
 * R£ST Asset Routes
 *
 * Copyright (c) 2019 Milen Bilyanov, "cryptoeraser"
 * Licensed under the MIT license.
 */

'use strict';

// Project Imports
const assetController = require('../controllers/assetController.js');

// Local Imports
const logging = require('../../logging');

var MODULE = 'rest.route';

// Logging
const log = logging.getLogger();

// Define Middleware Controllers
const getAssets = assetController.getAssets;
const getAssetBySymbol = assetController.getAssetBySymbol;

// Setup Express.js Routes
function routes(app) {
    const CONTEXT = MODULE + '.' + 'routes';
    app.route('/assets/:pair')
        .get((req, res, next) => {
            // Attach middleware.
            log.debug({
                context: CONTEXT,
                verbosity: 9,
                message: ('Request url: ' + req.originalUrl + ' || Request type: ' + req.method + ' || Request params: ' + JSON.stringify(req.params))
            });
            next();
        }, getAssets);

    app.route('/asset/:pair/:symbol')
        .get((req, res, next) => {
            // Attach middleware.
            log.debug({
                context: CONTEXT,
                verbosity: 9,
                message: ('Request url: ' + req.originalUrl + ' || Request type: ' + req.method + ' || Request params: ' + JSON.stringify(req.params))
            });
            next();
        }, getAssetBySymbol);
}

// Exports
module.exports = {
    getRoutes: routes
};

// vim: fdm=marker ts=4
