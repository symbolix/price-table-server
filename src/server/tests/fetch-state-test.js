// Local Imports
const utils = require('../lib/utils');

(async () => {
    let response;
    try {
        // Send the request.
        // Expects a response object with the following structure:
        // {data: data, state: boolean}
        response = await utils.readState('./data/statecache.json');
        if(!response.state){
            // Failure.
            console.log('CACHE_FETCH_STATUS: FAIL');
        }else{
            // Success
            console.log('CACHE_FETCH_STATUS: SUCCESS');
        }
    } catch (failure) {
        console.log('Failed to complete CACHE_FETCH_REQUEST.');
    }

    // Verbose the response.
    console.log('RESPONSE:\n', response);
})();
