/* Price Table Server | tradekit.io
 *
 * @mudule: wrappers
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 */

'use strict';

var MODULE = 'wrappers';

/** @public generatePairAssetContainer(pairs, assets) {{{1
 *
 *  This is an async fetch call wrapping the cached date request.
 *
 *  @param {array} pairs - An array with the first set of keys.
 *  @param {array} assets - An array with the sub-set of keys.
 */

const serializeLists = (primary, secondary) => {
    let container = {};

    primary.map(pair => {
        let assetsStructure = {};
        secondary.map(asset => {
            assetsStructure[asset] = null;
        });
        container[pair] = assetsStructure;
    });

    return container;
};
// }}}1

module.exports = {
    serializeLists: serializeLists
};

// vim: fdm=marker ts=4
