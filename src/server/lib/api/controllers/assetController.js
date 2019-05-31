/*
 * REST Asset Controller
 *
 * Copyright (c) 2019 Milen Bilyanov, "cryptoeraser"
 * Licensed under the MIT license.
 */

'use strict';

// Project Imports
const AssetModel = require('../models/assetModel');
const utils = require('../../utils');
const data = require('../../data-container');
const schema = require('../../data-schema');

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

            // Soft-error Handling
            try {
                state = utils.generatePayload(data.exportState(), pair);
                local.updatePayload(state);
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
    Access.getAllAssets(req.params.pair, ((err, result) => {
        try{
            if(err){
                throw err;
            }
            console.log('STATUS: OK');
            res.json(result);
        }catch(err){
            console.log('STATUS: FAIL');
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
    Access.getSingleAsset(req.params.pair, req.params.symbol, ((err, result) => {
        try{
            if(err){
                throw err;
            }
            console.log('STATUS: OK');
            res.json(result);
        }catch(err){
            console.log('STATUS: FAIL');
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
