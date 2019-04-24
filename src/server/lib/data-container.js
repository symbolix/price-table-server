// lib/data-container.js

// Local Imports
var logging = require('./logging');

// Logging
const log = logging.getLogger();

// dataObj {{{1
/* Generic Data Construct
NOTES:
    The 'signature' section is for storing generic data.
    The 'assets' section is for storing individual symbol entries.
    There are also three fields, 'current', 'previous' and 'config'. The first tow are intended to
    store two different data states, and the third is allocated for the
    configuration related parameters.
CALC:
    Increase = New Number - Original Number
    % increase = Increase ÷ Original Number × 100
    Decrease = Original Number - New Number
    % decrease = Decrease ÷ Original Number × 100
    (Note how the % calculations are identical,-/+ determine the increase or decrease)

*/
let dataObj = {
    data: {
        current: {
            assets: {},
            signature: {}
        },
        previous: {
            assets: {},
            signature: {}
        }
    },
    config: {
        pair: null
    }
};
// }}}1

function moduleTest(){
    console.log('__DATA__ module accessed.');
}

/* Setters and Getters*/

// update {{{1
/*----------------------------------------------;
 ; Low level function to set data object values.
 ; SECTION  : 'data' or 'config'
 ; FIELD    : 'current' or 'previous'
 ; COMPONENT: 'symbols', 'info'
 ;----------------------------------------------*/
function update(section, field, component, key, val){
    if(section == 'data'){
        if(dataObj.data.hasOwnProperty(field)){
            if(dataObj.data[field].hasOwnProperty(component)){
                dataObj.data[field][component][key] = val;
            }else{
                throw new Error(`Invalid data component: ${component}`);
            }
        }else{
            throw new Error(`Invalid data field: ${field}`);
        }
    }else{
        if(section == 'config'){
            dataObj.config[key] = val;
        }else{
            throw new Error(`Invalid data section: ${section}`);
        }
    }
}
// }}}1

// get {{{1
/*----------------------------------------------;
 ; Low level function to get data object values.
 ; SECTION  : 'data' or 'config'
 ; FIELD    : 'current' or 'previous'
 ; COMPONENT: 'symbols', 'info'
 ;----------------------------------------------*/
function get(section, field, component, key){
    if(section == 'data'){
        if(dataObj.data.hasOwnProperty(field)){
            if(dataObj.data[field].hasOwnProperty(component)){
                return dataObj.data[field][component][key];
            }else{
                throw new Error(`Invalid data component: ${component}`);
            }
        }else{
            throw new Error(`Invalid data field: ${field}`);
        }
    }else{
        if(section == 'config'){
            return dataObj.config[key];
        }else{
            throw new Error(`Invalid data section: ${section}`);
        }
    }
}
// }}}1

/* Wrappers */

// updateData {{{1
// A method that modifies the DATA section of our data container.
// 'field' being one of the states: 'previous' or 'current'.
// 'component' is either 'symbols' or 'info'.
function updateData(field, component, key, value){
    update('data', field, component, key, value);
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

/* TMP */
function viewDataObj(){
    console.log('data_container:', dataObj);
}

/* EXPORTS */
module.exports = {
    moduleTest: moduleTest,
    updateData: updateData,
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
