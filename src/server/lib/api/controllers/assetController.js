/*
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

// Generic Imports
const utils = require('../../utils');
const data = require('../../data-container');
const schema = require('../../data-schema');

// Logging
const log = logging.getLogger();

// Model Init
let PayloadModel = AssetModel.Payload();
PayloadModel.init(schema.restApiTemplate);

const Payload = (() => {

    // Private Methods
    let local = {
        updatePayload: (data) => {
            PayloadModel.update(data);
        }
    };

    // Public Methods
    let publicMethods = {
        /**
         * @param {string} pair The target fiat pair.
         * @param {function} callback A function tobe executed internally.
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
        /**
         * @param {string} pair The target fiat pair.
         * @param {function} callback A function tobe executed internally.
         */
        getSingleAsset: (pair, symbol, callback) => {
            let error, response, state;
            const CONTEXT = 'querySingleAsset';


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

    };

    return publicMethods;
});

let Access = Payload();

function getAssets(req, res, next) {
    /*
    (DEBUG) console.log('incoming params:', req.params);
    When the request is made at http://localhost:9001/assets/eur the route
    '/assets/:pair' should be passing in the params object as: { pair: 'eur' }
    */
    const CONTEXT = 'rest::controller';
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

function getAssetBySymbol(req, res, next) {
    /*
    (DEBUG) console.log('incoming params:', req.params);
    When the request is made at http://localhost:9001/asset/eur/zec the route
    '/asset/:pair/:symbol' should be passing in the params object as: { pair: 'eur' }
    */
    const CONTEXT = 'rest::controller';
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

/* EXPORTS */
module.exports = {
    getAssets: getAssets,
    getAssetBySymbol: getAssetBySymbol
};

// vim: fdm=marker ts=4
