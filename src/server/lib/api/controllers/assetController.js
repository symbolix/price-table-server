/* Price Table Server | tradekit.io
 *
 * REST Asset Controller
 *
 * Copyright (c) 2019 Milen Bilyanov, "cryptoeraser"
 * Licensed under the MIT license.
 *
 * These are the middleware components.
 */

'use strict';

// REST API Imports
const AssetModel = require('../models/assetModel');

// Local Imports
const logging = require('../../logging');

var MODULE = 'rest.controller';

// Generic Imports
const utils = require('../../utils');
const data = require('../../data-container');
const schema = require('../../data-schema');
const globals = require('../../globals');

// Globals
const APP_NAME = globals.get('APP_NAME');
const APP_VERSION = globals.get('APP_VERSION');

// Logging
const log = logging.getLogger();

// Initialize the asset model.
let PayloadModel = AssetModel.Payload();
PayloadModel.init(schema.restApiTemplate, APP_NAME, APP_VERSION);

// Wrap the PayloadModel as a Payload.
const Payload = (() => {

    // Private Methods
    let local = {
        updatePayload: (data) => {
            PayloadModel.update(data);
        }
    };

    // Public Methods
    let publicMethods = {
        /** @public getAllAssets(pair, callback) {{{1
         * Expects a _pair_ parameter for the target fiat pair and a _callback_
         * function to be executed internally.
         *
         * @param {string} pair
         * @param {function} callback
         */

        getAllAssets: (pair, callback) => {
            let error, response, state;

            // Soft-error Handling
            try {
                state = utils.generatePayload(data.exportState(), pair);
                local.updatePayload(state);
                response = PayloadModel.queryAll();
                error = false;
            }catch(err){
                response = false;
                error = err;
            }
            callback(error, response);
        },
        //}}}1

        /** @public getSingleAsset(pair, symbol, callback) {{{1
         * Expects a _pair_ parameter for the target fiat pair and a _callback_
         * function to be executed internally.
         *
         * @param {string} pair
         * @param {function} callback
         */

        getSingleAsset: (pair, symbol, callback) => {
            let error, response, state;
            const CONTEXT = MODULE + '.' + 'querySingleAsset';

            // Soft-error Handling
            try {
                state = utils.generatePayload(data.exportState(), pair);
                local.updatePayload(state);

                // We need a more granular approach here since both methods rely on
                // the same payload method. A secondary stage for isolating the
                // specific asset is used at the next stage.
                log.debug({
                    context: CONTEXT,
                    verbosity: 9,
                    message: ('Payload sub-request for individual asset: ' + pair.toUpperCase() + '/' + symbol.toUpperCase() + ' received.')
                });

                response = PayloadModel.querySingle(symbol);
                error = false;
            }catch(err){
                response = false;
                error = err;
            }
            callback(error, response);
        }
        // }}}1
    };
    return publicMethods;
});

// Create a Payload instance.
let Access = Payload();

/** @public getAssets(req, res, next) {{{1
 *
 * An Express.js controller for accessing all of the assets within the data
 * storage. Follows the Express.js argument structure.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 *
 */

function getAssets(req, res, next) {
    // When the request is made at http://localhost:9001/assets/eur the route
    // '/assets/:pair' should be passing in the params object as: { pair: 'eur' }
    const CONTEXT = MODULE + '.' + 'getAssets';
    Access.getAllAssets(req.params.pair, ((err, result) => {
        try{
            if(err){
                throw err;
            }
            log.info({
                context: CONTEXT,
                verbosity: 7,
                message: '<getAllAssets> Route request for (' + req.originalUrl + ') was successful.'
            });
            res.json(result);
        }catch(err){
            log.error({
                context: CONTEXT,
                message: '<getAllAssets> Route request for (' + req.originalUrl + ') has failed!'
            });
            next(err);
        }
    }));
}
// }}}1

/** @public getAssets(req, res, next) {{{1
 *
 * An Express.js controller to access a single asset within the data structure.
 * Follows the Express.js argument structure.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} next
 *
 */

function getAssetBySymbol(req, res, next) {
    // When the request is made at http://localhost:9001/asset/eur/zec the route
    // '/asset/:pair/:symbol' should be passing in the params object as: { pair: 'eur' }
    const CONTEXT = MODULE + '.' + 'getAssetBySymbol';
    Access.getSingleAsset(req.params.pair, req.params.symbol, ((err, result) => {
        try{
            if(err){
                throw err;
            }
            log.info({
                context: CONTEXT,
                verbosity: 7,
                message: '<getSingleAsset> Route request for (' + req.originalUrl + ') was successful.'
            });
            res.json(result);
        }catch(err){
            log.error({
                context: CONTEXT,
                message: '<getSingleAsset> Route request for (' + req.originalUrl + ') has failed!'
            });
            next(err);
        }
    }));
}
// }}}1

/* EXPORTS */
module.exports = {
    getAssets: getAssets,
    getAssetBySymbol: getAssetBySymbol
};

// vim: fdm=marker ts=4
