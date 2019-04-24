/*
 * R£ST Asset Controller
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
    let privateMethods = {
        updatePayload: (data) => {
            PayloadModel.update(data);
        }
    };

    // Public Methods
    let publicMethods = {
        getAllAssets: (callback) => {
            let error, response, state;
            try {
                state = utils.generatePayload(data.exportState());
                // console.log('STATE:', state);
                privateMethods.updatePayload(state);
                response = PayloadModel.findAll();
                callback(error, response);
            }catch(err){
                throw 'ERROR';
            }
        }
    };

    return publicMethods;
});

let Access = Payload();

function getAssets(req, res) {
    Access.getAllAssets((err, contact) => {
        if (err) {
            res.send(err);
        }
        res.json(contact);
    });
}

function getAssetBySymbol(req, res) {
    console.log('(getAssetBySymbol) __DATA_ACCESS_POINT');
    /*
    Contact.findById(req.params.contactId, (err, contact) => {
        if (err) {
            res.send(err);
        }
        res.json(contact);
    });
    */
}

/* EXPORTS */
module.exports = {
    getAssets: getAssets,
    getAssetBySymbol: getAssetBySymbol
};

// vim: fdm=marker ts=4
