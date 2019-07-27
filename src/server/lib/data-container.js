/* Price Table Server | tradekit.io
 *
 * @mudule: datacontainer
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 *
 */

// Global Imports
// 'red' is actually used, so it is probably only eslint freaking about it.
const { red, green, dim } = require ('ansicolor');

// Local Imports
var logging = require('./logging');
var util = require('util');

// Logging
const log = logging.getLogger();

// Globals
var MODULE = 'data';

/** dataObj {{{1
 * Generic Private Data Storage
 */
let dataObj = {};
// }}}1

/* Private Setters and Getters*/

/** @private set(head, next ... [element, val]) {{{1
 * A private low level setter for the data container.
 * @param {Array} The first argument is the head (our entry point) and the last element is a list
 * of a target and a value. Arguments in-between are way-points used to traverse the data-object.
 *
 * Since this is a lower-level private function, it expects a sanitised
 * arguments.
 */
function set(...paths){
    let CONTEXT = MODULE + '.' + 'set';
    const bundle = arguments[arguments.length - 1];

    // Sanity Checks
    if(!util.isArray(bundle)){
        let tmptype = typeof bundle;
        throw new Error(('Expected an array as the last argument, instead got: ' + tmptype));
    }

    const element = bundle[0];
    const value = bundle[1];

    log.debug({
        context: CONTEXT,
        verbosity: 5,
        colour: dim.red,
        message: ('SET_DATA -> ' + paths[0] + ' -> ' + paths[1] + ' -> ' + paths[2] + ' -> ' + paths[3] + ' -> ' + element),
    });

    // Remove the last element
    paths.pop();
    paths.push(element);

    let nested = dataObj;

    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];

        // It is important that we explicitly check for the last element. In some cases
        // the element string might be present up the hierarchy, we don't want
        // to terminate the traversing abruptly because of that.
        if (i === paths.length - 1){
            // Set the value of the element.

            // Sanity Checks
            if(!nested.hasOwnProperty(path)){
                throw new Error(('Unexpected target element: ' + path));
            }

            // Update the value of the element.
            nested[path] = value;
        }

        if (path !== null && path !== element){
            // Go to next level of nesting.

            // Sanity Checks
            if(!nested.hasOwnProperty(path)){
                throw new Error(('Unexpected level to traverse: ' + path));
            }

            // Update reference and keep traversing.
            nested = nested[path];
        }
    }

    return dataObj;
}
//}}}1

/** @private get(head, next ... element) {{{1
 * A private low level getter for the data container.
 * @param {Array} The first argument is the head (our entry point) and the last element is a string.
 * Arguments in-between are way-points used to traverse the data-object.
 *
 * Since this is a lower-level private function, it expects a sanitised
 * arguments.
 */
function get(...paths){
    let CONTEXT = MODULE + '.' + 'get';
    const element = paths[4];
    let result = false;

    // Debug
    log.debug({
        context: CONTEXT,
        verbosity: 5,
        colour: dim.green,
        message: ('GET_DATA <- ' + paths[0] + ' <- ' + paths[1] + ' <- ' + paths[2] + ' <- ' + paths[3] + ' <= ' + element),
    });

    let nested = dataObj;

    for (let i = 0; i < paths.length; i++) {
        const path = paths[i];

        // It is important that we explicitly check for the last element. In some cases
        // the element string might be present up the hierarchy, we don't want
        // to terminate the traversing abruptly because of that.
        if (i === paths.length - 1){
            // Sanity Checks
            if(!nested.hasOwnProperty(path)){
                throw new Error(('Unexpected target element: ' + path));
            }

            // Update the value of the element.
            result = nested[path];
        }

        if (path !== null && path !== element){
            // Go to next level of nesting.

            // Sanity Checks
            if(!nested.hasOwnProperty(path)){
                throw new Error(('Unexpected level to traverse: ' + path));
            }

            // Update reference and keep traversing.
            nested = nested[path];
        }
    }

    return result;
}
//}}}1

/* Public Methods */

/** @public init(template) {{{1
 * Initializes the data object based on the provided _template_ parameter. The template is
 * a template data schema designed to represent a data structure.
 *
 * @param {Object}
 */

function init(template){
    dataObj = template;
}
//}}}1

/** @public update(options) {{{1
 *
 * A public method that wraps the private set() method.
 * We do NOT tolerate any critical errors here. The method needs to be called
 * properly or we fail all together.
 *
 * The _options_ parameter is an options object containing the following routes into the data storage:
 * {section, field, pair, component, element, val}.
 *
 * This function will return a boolean, an indication of the success of the
 * procedure.
 *
 * @param {Object} options
 * @returns {Boolean}
 */

function update(options){
    let CONTEXT = MODULE + '.' + 'update';
    let section, field, pair, component, element, value;

    // Sanity Check
    let isOptionsTypeObject = typeof options === 'object';

    // Check for a valid options object.
    if(!isOptionsTypeObject){
        try {
            throw new Error('Arguments must be passed in as an options object.');
        }catch(err){
            log.severe({
                context: CONTEXT,
                message: ('Function access error!\n' + err.stack)
            });

            // Terminate
            throw err;
        }
    }else{
        // Handle arguments.
        section = options.section || null;
        field = options.field || null;
        pair = options.pair || null;
        component = options.component || null;
        element = options.element || null;
        value = options.value || null;
    }

    // Sanity Check
    let isElementTypeObject = typeof element === 'object';

    // When the element is passed in as a whole object, that would substitute
    // any 'value' values. For example: { eth: { a: '1', b: '2', c: '3', d: '4' } } will be
    // passed in as a whole object. We still need to check if the element
    // consists of a single-key object. In this case, 'eth' is the only key and
    // the rest is the value.
    if(isElementTypeObject){
        if(Object.keys(element).length > 1){
            try {
                throw new Error('Only single-key objects are allowed when passing in object based ELEMENT arguments!');
            }catch(err){
                log.severe({
                    context: CONTEXT,
                    message: ('Argument error!\n' + err.stack)
                });

                // Terminate
                // process.exit(1);
                throw err;
            }
        }else{
            // Override value here so that it passes the argument test.
            // Extracting the value of the element key here, but the intention
            // is NOT to pass this in, doing this for sanity reasons.
            value = element[Object.keys(element)[0]];
        }
    }

    // Check for critical arguments.
    try {
        if(section === null || element === null || value === null){
            throw new Error('Missing SECTION, ELEMENT or VALUE arguments detected!');
        }
    }catch(err){
        log.severe({
            context: CONTEXT,
            message: ('Function access error!\n' + err.stack)
        });

        // Terminate
        throw err;
        //process.exit(1);
    }

    try {
        let result = set(section, field, pair, component, [element, value]);
        return result;
    }catch(err){
        log.severe({
            context: CONTEXT,
            message: ('Internal function error!\n' + err.stack)
        });

        // Terminate
        throw err;
    }
}
// }}}1

/** @public query(options) {{{1
 *
 * A public method that wraps the private get() method. Expects an _options_
 * argument that will pass a route to the data storage in the following format:
 * {section, field, pair, component, element}
 *
 * This function will return the corresponding value stored at the queried
 * location within the data storage.
 *
 * @param {Object}
 * @returns {Value}
 */

function query(options){
    let CONTEXT = MODULE + '.' + 'query';
    let section, field, pair, component, element;

    // Sanity Check
    let isOptionsTypeObject = typeof options === 'object';

    // Check for a valid options object.
    if(!isOptionsTypeObject){
        try {
            throw new Error('Arguments must be passed in as an options object.');
        }catch(err){
            log.severe({
                context: CONTEXT,
                message: ('Function access error!\n' + err.stack)
            });

            // Terminate
            // process.exit(1);
            throw err;
        }
    }else{
        // Handle arguments.
        section = options.section || null;
        field = options.field || null;
        pair = options.pair || null;
        component = options.component || null;
        element = options.element || null;
    }

    // Check for critical arguments.
    try {
        if(section === null || element === null){
            throw new Error('Missing SECTION or ELEMENT arguments detected!');
        }
    }catch(err){
        log.severe({
            context: CONTEXT,
            message: ('Function access error!\n' + err.stack)
        });

        // Terminate
        throw err;
    }

    try {
        let result = get(section, field, pair, component, element);
        return result;
    }catch(err){
        log.severe({
            context: CONTEXT,
            message: ('Internal function error!\n' + err.stack)
        });

        // Terminate
        throw err;
    }
}
// }}}1

/** @public updatePair(pair, valueObj, {forceGranularity = false}) {{{1
 *
 * A higher level wrapper method that modifies the PAIR slot of the 'current' section.
 * When the 'forceGranularity' option is set to 'true', each asset will be
 * checked prior to any updates. The _pair_ parameter is the pair slot. The
 * _valueObj_ argument is there to pass in the incoming pair bundle. When the
 * _forceGranularity_ parameter is set to 'true', each asset will be checked
 * prior to any updates.
 *
 * @param {String} pair
 * @param {Object} valueObj
 * @param {Boolean} forceGranularity
 */

function updatePair(pair, valueObj, { forceGranularity = false }){
    let CONTEXT = MODULE + '.' + 'updatePair';
    log.debug({
        context: CONTEXT,
        verbosity: 7,
        message: 'SECTION: data, FIELD: current, [ELEMENT: ' + pair + ', VALUE: ...] (FORCE_GRANULARITY: ' + forceGranularity + ')'
    });

    // We have internal controls that will check the incoming data before
    // updating the slots, however, it is still a good idea to double check
    // here as well.
    if(!forceGranularity){
        update({
            section: 'data',
            field: 'current',
            element: pair,
            value: valueObj
        });
    }else{
        let storage = dataObj.data.current[pair].assets;
        let input = valueObj.assets;
        Object.keys(input).forEach((key) => {
            if(storage.hasOwnProperty(key) && input.hasOwnProperty(key)){
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'Asset ' + key.toUpperCase() + ' exists.'
                });
                if(input[key].success){
                    log.info({
                        context: CONTEXT,
                        verbosity: 3,
                        message: ('\tIncoming data for ' + key.toUpperCase() + ' is complete.')
                    });
                    // storage[key] = input[key];
                    update({
                        section: 'data',
                        field: 'current',
                        pair: pair,
                        component: 'assets',
                        element: key,
                        value: input[key]
                    });
                }else{
                    log.warning({
                        context: CONTEXT,
                        verbosity: 1,
                        message: ('\tSkipping missing data for asset: ' + key.toUpperCase())
                    });
                }
            }else{
                log.severe({
                    context: CONTEXT,
                    message: ('ASSET_KEY missmatch for asset: ' + key.toUpperCase())
                });
            }

            // Finally, update the signature slot.
            update({
                section: 'data',
                field: 'current',
                pair: pair,
                element: 'signature',
                value: valueObj.signature
            });
        });
    }
}
// }}}1

/* Utility Functions */

/** @public shuffleData(source, target) {{{1
 * Copy the whole data block passed in through the _source_ parameter, into the data block
 * specified by the _target_ data block.
 *
 * @param {Object} source
 * @param {Object} target
 */

function shuffleData(source, target){
    // { data: { current {} } }
    let sourceObj =  dataObj.data[source];
    // { data: { current {} } } -> { data: { previous {} } }
    // Deep-copy seems to be a challenge in JavaScript.
    // The solution here is the only one that works for now.
    dataObj.data[target] = JSON.parse(JSON.stringify(sourceObj));
}
// }}}1

/** @public exportState() {{{1
 *
 * Dump the entire data structure.
 */

function exportState(){
    return dataObj;
}
// }}}1

/** @public importState() {{{1
 *
 * Set the entire data structure.
 */

function importState(stateObject){
    dataObj = JSON.parse(JSON.stringify(stateObject));
}
// }}}1

/* EXPORTS */
module.exports = {
    init: init,
    update: update,
    query: query,
    shuffleData: shuffleData,
    updatePair: updatePair,
    exportState: exportState,
    importState: importState
};

// vim: fdm=marker ts=4
