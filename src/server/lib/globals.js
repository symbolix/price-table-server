// lib/globals.js

var resources = {
    APP_NAME: 'Price Table Server',
    APP_VERSION: 'v0.0.1.[12]',
    DATA_FEED_IS_ACTIVE: false
};

function moduleTest(){
    console.log('__GLOBALS__ module accessed.');
}

function getResource(resource){
    return resources[resource];
}

function setResource(resource, value){
    resources[resource] = value;
}

module.exports = {
    moduleTest: moduleTest,
    set: setResource,
    get: getResource
};
