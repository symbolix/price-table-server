// Local Imports
const timers = require('../lib/timers.js');

/** getTime() {{{1
 * Construct a time string for debug purposes.
 */
const getTime = () => {
    var now = new Date();
    var h = now.getHours().toString().padStart(2, '0');
    var m = now.getMinutes().toString().padStart(2, '0');
    var s = now.getSeconds().toString().padStart(2, '0');
    const timeSignature = h + ':' + m + ':' + s;
    return timeSignature;
};
// }}}1

/** delay() {{{1
 * A simple function to simulate resource delays.
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// }}}1

/** someFakeAPI() {{{1
 * The core mock API call function.
 */
async function someFakeAPI() {
    // Emulate an asynchroneous fetch.
    console.log('\t\t\t\t___REQUEST___ Fetching data ...');
    // 12000 miliseconds (12 sec) is longer than our timer call.

    // There will be an overlap.
    // We have the option to delay the async call so that we can emulate network lags etc.
    await delay(120000);

    // Emulate a response.
    let result = 0.6; // Change to 0.4 to trigger a failed fetch.
    if (result < 0.5) {
        return '___FAIL___';
    } else {
        return { name: 'apple', price: '1234.12', time: 1549926859970 };
    }
}
// }}}1

/** update() {{{1
 * This is the request wrapper. This function also controls the start and the
 * end state of the request through the public method 'setState()'.
 * The state flag is 'isRequestActive', and have two states: true or false.
 */
const update = async () => {
    // Start request state.
    requestInterval.setState('isRequestActive', true);

    let timeSignature = getTime();

    let result;
    try {
        console.log(`---------> (${timeSignature}) REQUEST: Sending data request.`);
        result = await someFakeAPI();
    } catch (err) {
        throw err;
    }

    console.log(`---------> (${timeSignature}) REQUEST: Data request is done. Here is the result:`);
    console.log(`---------> (${timeSignature}) REQUEST:`, result);

    // End the request state here.
    requestInterval.setState('isRequestActive', false);
};
// }}}1

let requestInterval = new timers.Interval('request');
requestInterval.runInterval(0, 25, function() {
    update();
});

// vim: fdm=marker ts=4
