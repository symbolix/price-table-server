// lib/tables.js

// Project Imports
const { red, green } = require ('ansicolor');

/* Public Functions */

// @public moduleTest()
//      No arguments.
//      A simple module test function.
//{{{1
function moduleTest(){
    console.log('__TABLES__ module accessed.');
}
//}}}1

// @public exchangeRequestAsTable(dataObject)
//      dataObject: Formatted exchange request data object.
//{{{1
function exchangeRequestAsTable(dataObject){
    // The header is an array with the top row labels.
    // ['symbol', 'timestamp', 'last', 'success'];
    let header = ['symbol', 'timestamp', 'last', 'success'];

    // Initialize
    let contentData;
    let data = [];

    // Insert the header.
    data.push(header);

    // Iterate and distribute.
    Object.values(dataObject).forEach( (value) => {
        contentData = [];
        // let entryCounter = 0;
        Object.entries(value).forEach( (entry) => {
            let item = entry[1];
            if(typeof item === 'boolean'){
                // For boolean items.
                item = item ? green(item) : red(item);
            }
            // Increment item counter.
            contentData.push(item);
            // ++entryCounter;
        });
        // Store the current row.
        data.push(contentData);
    });
    // Return the result.
    return data;
}
//}}}1

/* EXPORTS */
module.exports = {
    moduleTest: moduleTest,
    exchangeRequestAsTable: exchangeRequestAsTable
};

// vim: fdm=marker ts=4
