// lib/configs.js

// No setter functions should be allowed.
// Config stream is one way, running process cannot change the config until
// further implementations.
var resources = {
    DEBUG_DATA_FEED_STATUS: false,
    SILENT: false,
    DEBUG: {
        console: true,
        logfile: false
    },
    EXCHANGE_DATA_IMPORT_RETRY_LIMIT: 10,
    EXCHANGE_DATA_EXPORT_RETRY_LIMIT: 9999,
    STATE_CACHE_IMPORT_RETRY_LIMIT: 9999,
    STATE_CACHE_FILE_AGE_LIMIT: {
        days: 0,
        hours: 0,
        minutes: 15,
        seconds: 0
    },
    /* This is the verbosity depth required by the function hosting the verbosity request.*/
    REQUIRED_VERBOSITY_DEPTH: 1,
    /* This is the current global verbosity depth.*/
    CURRENT_VERBOSITY_DEPTH: 9,
};

function moduleTest(){
    console.log('__CONFIGS__ module accessed.');
}

function getResource(resource){
    return resources[resource];
}

function setResource(resource, value){
    // resources[resource] = value;
    throw new Error('Changing configuration options is NOT allowed!');
}

module.exports = {
    moduleTest: moduleTest,
    set: setResource,
    get: getResource
};
