// lib/data-container.js

// Local Imports
var logging = require('./logging');

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

/** @private set(section, field, pair, component, element, val) {{{1
 * A private getter for the data container.
 */
function set(section, field, pair, component, element, val){
    // Check the SECTION.
    if(dataObj.hasOwnProperty(section)){
        if(section==='utility'){
            try{
                dataObj[section][element] = val;
                return true;
            }catch(err){
                throw new Error(`Operation on SECTION: ${section} has failed for VAL: ${val}`);
            }
        }else{
            console.log('section:', section, 'is ok.');
            // Check the FIELD.
            if(dataObj[section].hasOwnProperty(field)){
                console.log('\tfield:', field, 'is ok.');
                // Check the PAIRS.
                if(dataObj[section][field].hasOwnProperty('pairs')){
                    console.log('\t\tpairs is ok.');
                    // Check if we already have a PAIR by that name.
                    if(dataObj[section][field].pairs.hasOwnProperty(pair)){
                        console.log('\t\t\tpair:', pair, 'is ok.');
                        // Check the COMPONENT.
                        if(dataObj[section][field].pairs[pair].hasOwnProperty(component)){
                            console.log('\t\t\t\tcomponent:', component, 'is ok.');

                            // Handle ELEMENT (start)
                            if(element in dataObj[section][field].pairs[pair][component]){
                                // Element already exists, we will be setting the value.
                                console.log('\t\t\t\t\telement:', element, 'is ok.');
                                try{
                                    dataObj[section][field].pairs[pair][component][element] = val;
                                    return true;
                                }catch(err){
                                    throw new Error(`Operation on ELEMENT: ${element} has failed for VAL: ${val}`);
                                }
                            }else{
                                // We will be adding the whole element as an object here.
                                console.log('\t\t\t\t\telement:', element, 'will created.');

                                // Sanity Check
                                const isElementTypeObject = typeof element === 'object';

                                try{
                                    if(isElementTypeObject){
                                        console.log('\t\t\t\t\telement:', element, 'will be inserted as an OBJ.');
                                        dataObj[section][field].pairs[pair][component] = element;
                                        return true;
                                    }else{
                                        console.log('\t\t\t\t\telement:', element, 'will be added as a key=val operation.');
                                        dataObj[section][field].pairs[pair][component][element] = val;
                                        return true;
                                    }
                                }catch(err){
                                    throw new Error(`Operation on COMPONENT: ${component} has failed for ELEMENT: ${element}`);
                                }
                            }
                            // Handle ELEMENT (end)

                        }else{
                            throw new Error(`Invalid COMPONENT: ${component}`);
                        }
                    }else{
                        // We will be adding the whole pair object here.
                        try{
                            dataObj[section][field].pairs = pair;
                            return true;
                        }catch(err){
                            throw new Error(`Operation on PAIRS has failed for PAIR: ${pair}`);
                        }
                    }
                }else{
                    throw new Error('Missing SUB-FIELD: pairs');
                }
            }else{
                throw new Error(`Invalid FIELD: ${field}`);
            }
        }
    }else{
        throw new Error(`Invalid SECTION: ${section}`);
    }
}
//}}}1

/** @private get(section, field, pair, component, element, key) {{{1
 * A private getter for the data container.
 */
function get({section=null, field=null, pair=null, component=null, key=null}){
    if(dataObj.hasOwnProperty(section)){
        if(section==='utility'){
            return dataObj[section][key];
        }else{
            if(dataObj[section].hasOwnProperty(field)){
                if(dataObj[section][field].hasOwnProperty(pair)){
                    if(dataObj[section][field][pair].hasOwnProperty(component)){
                        if(key in dataObj[section][field][pair][component]){
                            return dataObj[section][field][pair][component][key];
                        }else{
                            throw new Error(`Invalid key: ${component}`);
                        }
                    }else{
                        throw new Error(`Invalid component: ${component}`);
                    }
                }else{
                    throw new Error(`Invalid pair: ${pair}`);
                }
            }else{
                throw new Error(`Invalid field: ${field}`);
            }
        }
    }else{
        throw new Error(`Invalid section: ${section}`);
    }
}
//}}}1

/** @private set2(section, field, pair, component, element, val) {{{1
 * A private getter for the data container.
 * 'section', 'field', 'pair' and 'component' are immutable.
 * 'element' is mutable and receives the 'value'.
 */
function set2(section, field, pair, component, element, value){
    console.log('section:', section, '| field:', field, '| pair:', pair, '| component:', component, '| element:', element, '| value:', value);

    let isDeep = true;
    let structure;

    if(section=='utility'){
        isDeep = false;
    }
    // Sanity Check
    if(section !== null){
        if(!dataObj.hasOwnProperty(section)){
            throw new Error(`Invalid SECTION: ${section}`);
        }
    }

    if(field !== null){
        if(!dataObj[section].hasOwnProperty(field)){
            throw new Error(`Invalid FIELD: ${field}`);
        }
    }

    if(pair !== null){
        if(!dataObj[section][field].hasOwnProperty(pair)){
            throw new Error(`Invalid PAIR: ${pair}`);
        }
    }

    if(component !== null){
        if(!dataObj[section][field][pair].hasOwnProperty(component)){
            throw new Error(`Invalid COMPONENT: ${component}`);
        }
    }

    if(isDeep){
        structure = dataObj[section][field][pair][component];
    }else{
        structure = dataObj[section];
    }

    console.log(isDeep, structure);

    // Handle ELEMENT (start)
    if(element in structure){
        // Element already exists, we will be setting the value.
        console.log('\t\t\t\t\telement:', element, 'is ok.');
        try{
            if(isDeep){
                dataObj[section][field][pair][component][element] = value;
            }else{
                dataObj[section][element] = value;
            }

            return true;
        }catch(err){
            throw new Error(`Operation on ELEMENT: ${element} has failed for VAL: ${value}`);
        }
    }else{
        // We will be adding the whole element as an object here.
        console.log('\t\t\t\t\telement:', element, 'will be created.');

        // Sanity Check
        const isElementTypeObject = typeof element === 'object';

        // TODO: Make sure we do not overwrite the existing values.

        try{
            if(isElementTypeObject){
                console.log('\t\t\t\t\telement:', element, 'will be inserted as an OBJ.');
                if(isDeep){
                    dataObj[section][field][pair][component] = element;
                }else{
                    dataObj[section] = element;
                }
                return true;
            }else{
                console.log('\t\t\t\t\telement:', element, 'will be added as a key=val operation.');
                if(isDeep){
                    dataObj[section][field][pair][component][element] = value;
                }else{
                    dataObj[section][element] = value;
                }
                return true;
            }
        }catch(err){
            throw new Error(`Operation on COMPONENT: ${component} has failed for ELEMENT: ${element}`);
        }
    }
    // Handle ELEMENT (end)

}
//}}}1

/* Public Methods */

/** init() {{{1
 * Initializes the data object based on the provided template.
 * @parm {object} A template data schema.
 */
function init(template){
    dataObj = template;
}
//}}}1

/** update(section, field, component, element, value) {{{1
 * Returns a boolean.
 * A public method that wraps the private set() method.
 * We do NOT tolerate any critical errors here. The method needs to be called
 * properly or we fail all together.
 * @param {object} An options object {section, field, pair, component, element, val}
 * @returns {boolean} Success or NOT.
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
            process.exit(1);
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
                process.exit(1);
            }
        }else{
            // Override value here so that it passes the argument test.
            // Extracting the value of the element key here, but the intention
            // is NOT to pass this in, doing this for sanity reasons.
            value = element[Object.keys(element)[0]];
        }
    }

    console.log(section, element, value);

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
        process.exit(1);
    }

    try {
        let result = set2(section, field, pair, component, element, value);
        return result;
    }catch(err){
        log.severe({
            context: CONTEXT,
            message: ('Internal function error!\n' + err.stack)
        });

        // Terminate
        process.exit(1);
    }
}
// }}}1

/** update2(section, field, component, element, value) {{{1
 * Returns a boolean.
 * A public method that wraps the private set() method.
 * We do NOT tolerate any critical errors here. The method needs to be called
 * properly or we fail all together.
 * @param {object} An options object {section, field, pair, component, element, val}
 * @returns {boolean} Success or NOT.
 */
function update2(options){
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
            process.exit(1);
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
                process.exit(1);
            }
        }else{
            // Override value here so that it passes the argument test.
            // Extracting the value of the element key here, but the intention
            // is NOT to pass this in, doing this for sanity reasons.
            value = element[Object.keys(element)[0]];
        }
    }

    console.log(section, element, value);

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
        process.exit(1);
    }

    try {
        let result = set2(section, field, pair, component, element, value);
        return result;
    }catch(err){
        log.severe({
            context: CONTEXT,
            message: ('Internal function error!\n' + err.stack)
        });

        // Terminate
        process.exit(1);
    }
}
// }}}1

// getData {{{1
// A method to access the DATA section of our data container.
// 'field' being one of the states: previous or current.
// 'component' is either 'symbols' or 'info'.
function getData(field, component, key){
    return get('data', field, component, key);
}
// }}}1

// updateSymbol {{{1
// A higher level wrapper method that modifies the ASSETS section of our data container.
// 'field' being one of the states: 'previous' or 'current'.
function updateSymbol(field, key, value){
    updateData(field, 'assets', key, value);
}
// }}}1

// getSymbol {{{1
// A method to access the ASSETS section of our data container.
// 'field' being one of the states: previous or current.
function getSymbol(field, key){
    return getData(field, 'assets', key);
}
// }}}1

// updateSignature {{{1
// A higher level wrapper method that modifies the ASSETS section of our data container.
// 'field' being one of the states: 'previous' or 'current'.
function updateSignature(field, key, value){
    updateData(field, 'signature', key, value);
}
// }}}1

// getInfo {{{1
// A higher level wrapper method that gives access to the INFO section of our data container.
// 'field' being one of the states: previous or current.
function getInfo(field, key){
    return getData(field, 'signature', key);
}
// }}}1

// updateConfig {{{1
// A higher level wrapper method that modifies the SYMBOLS section of our data container.
// 'field' being one of the states: 'previous' or 'current'.
function updateConfig(key, value){
    update('config', null, null, key, value);
}
// }}}1

// getConfig {{{1
// A method to access the SYMBOLS section of our data container.
// 'field' being one of the states: previous or current.
function getConfig(key){
    return get('config', null, null, key);
}
// }}}1

// updateField {{{1
// A higher level wrapper method that modifies the FIELD section of our data container.
// 'field' being one of the states: 'previous' or 'current'.
function updateField(field, fieldObj, { forceGranularity = false }){
    let CONTEXT = 'updateField';
    log.debug({
        context: CONTEXT,
        verbosity: 7,
        message: 'FIELD: ' + field + ', FORCE_GRANULARITY: ' + forceGranularity
    });
    if(!forceGranularity){
        dataObj.data[field] = fieldObj;
    }else{
        let storage = dataObj.data[field].assets;
        let input = fieldObj.assets;
        Object.keys(storage).forEach((key) => {
            if(storage.hasOwnProperty(key) && input.hasOwnProperty(key)){
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: 'Asset ' + key.toUpperCase() + ' exists.'
                });
                if(fieldObj.assets[key].success){
                    log.info({
                        context: CONTEXT,
                        verbosity: 3,
                        message: ('\tIncoming data for ' + key.toUpperCase() + ' is complete.')
                    });
                    storage[key] = input[key];
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
        });
    }
}
// }}}1

// getField {{{1
// A higher level wrapper method that gets the FIELD section of our data container.
// 'field' being one of the states: previous or current.
function getField(field){
    return dataObj.data[field];
}
// }}}1

/* Utility Functions */

// shuffleData {{{1
// Copy the whole source data block to the target data block.
function shuffleData(source, target){
    // { data: { current {} } }
    let sourceObj =  dataObj.data[source];
    // { data: { current {} } } -> { data: { previous {} } }
    // Deep-copy seems to be a challenge in javascript.
    // The solution here is the only one that works for now.
    dataObj.data[target] = JSON.parse(JSON.stringify(sourceObj));
}
// }}}1

// Export State {{{1
// Return entire data structure.
function exportState(){
    return dataObj;
}
// }}}1

// Import State {{{1
// Set the entire data structure.
function importState(stateObject){
    dataObj = JSON.parse(JSON.stringify(stateObject));
}
// }}}1

/* EXPORTS */
module.exports = {
    set: set2,
    init: init,
    update: update2,
    getData: getData,
    updateSymbol: updateSymbol,
    getSymbol: getSymbol,
    updateInfo: updateSignature,
    getInfo: getInfo,
    updateConfig: updateConfig,
    getConfig: getConfig,
    shuffleData: shuffleData,
    updateField: updateField,
    getField: getField,
    exportState: exportState,
    importState: importState
};

// vim: fdm=marker ts=4
