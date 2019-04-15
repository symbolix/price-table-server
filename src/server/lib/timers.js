'use strict';
// lib/timers.js

// Local Imports
var logging = require('./logging');

// Logging
const log = logging.getLogger();

// getTime() {{{1
// Construct a time string for debug purposes.
const getTime = () => {
    var now = new Date();
    var h = now.getHours().toString().padStart(2, '0');
    var m = now.getMinutes().toString().padStart(2, '0');
    var s = now.getSeconds().toString().padStart(2, '0');
    const timeSignature = h + ':' + m + ':' + s;
    return timeSignature;
};
// }}}1

/** Interval Object (name) {{{1
 * Creates an Interval object with the required mothods.
 * @parm {string} name : The name of the interval.
 */
function Interval(name = 'default') {
    // Private Data
    let pivotIsLocal, mode;

    // Counter
    let _counter = 0;

    // State Container
    let state = {
        isFirstRun: true,
        isRequestActive: false,
        get counter() {
            let prepCounter = _counter.toString().padStart(6, '000000');
            return prepCounter;
        }
    };

    console.log('Init interval [' + name + ']');

    // Public access point.
    let self = {};

    // Private Methods
    /** updateCounter(value) {{{2
     * Increments the counter state.
     */
    const updateCounter = function(value) {
        _counter += value;
    };
    // }}}2

    /** getState(item) {{{2
     * Returns the state of the requested item.
     */
    const getState = function(item) {
        return state[item];
    };
    // }}}2

    /** getNextTick(mySkip, myInterval, currentSeconds) {{{2
     * Calculates the time to the next tick in milliseconds.
     */
    const getNextTick = function(mySkip, myInterval, currentSeconds) {
        let CONTEXT = 'getNextTick';
        // Local Data
        let myGap, pivotIsLocal, mode, nextUpdateMilliseconds;

        // Debug
        console.log('[' + name + '.' + CONTEXT + '] (' + getState('counter') + ') <' + getTime() + '> SKIP (MINUTES):' + mySkip + ', ' +
            'INTERVAL (SECONDS):' + myInterval + ', ' +
            'ENTRY AT (SECONDS):' + currentSeconds);

        console.log('[' + name + '.' + CONTEXT + '] (' + getState('counter') + ') <' + getTime() + '> IS_FIRST_RUN (STATE):' + getState('isFirstRun') + ', IS_REQUEST_ACTIVE (STATE):' + getState('isRequestActive'));

        // Pivot detection for our entry point.
        // For cases where our entry is before the INTERVAL or right at the INTERVAL,
        // we consider the pivot to be local as the temporal resolution will take place
        // within the current minute. For situations where we are beyond the INTERVAL,
        // we will be waiting for the start of the next minute for the resolution to be
        // started.
        if (currentSeconds <= myInterval) {
            // Just a debug.
            if (currentSeconds == myInterval) {
                console.log('[' + name + '.' + CONTEXT + '] (' + getState('counter') + ') <' + getTime() + '> start_time_aligned');
            } else {
                console.log('[' + name + '.' + CONTEXT + '] (' + getState('counter') + ') <' + getTime() + '> start_time_ahead');
            }
            pivotIsLocal = true;
        } else {
            console.log('[' + name + '.' + CONTEXT + '] (' + getState('counter') + ') <' + getTime() + '> start_time_on_next_minute');
            pivotIsLocal = false;
        }

        if (currentSeconds % 60 == 0) {
            // We need to move $INTERVAL seconds forward.
            console.log('[' + name + '.' + CONTEXT + '] (' + getState('counter') + ') <' + getTime() + '> We are at ??:00.');
            mode = 0;
        } else {
            if (currentSeconds == myInterval) {
                // We need to move 60 seconds forward.
                console.log('[' + name + '.' + CONTEXT + '] (' + getState('counter') + ') <' + getTime() + '> We are at the interval of (' + myInterval + ') seconds.');
                mode = 1;
            } else {
                // We need to calculate how much we will be jumping forward.
                console.log('[' + name + '.' + CONTEXT + '] (' + getState('counter') + ') <' + getTime() + '> We are at an arbitary time location.');
                mode = 2;
            }
        }

        if (mode == 2) {
            // mode 2

            // Reset skip only if we are in the first cycle.
            if (getState('isFirstRun')) {
                // Need to reset skip.
                console.log('[' + name + '.' + CONTEXT + '] (' + getState('counter') + ') <' + getTime() + '> Resetting the SKIP value.');
                mySkip = 0;
            }

            if (pivotIsLocal) {
                myGap = (myInterval - currentSeconds);
            } else {
                myGap = (60 - currentSeconds) + myInterval;
            }
        } else {
            // mode 0 and mode 1
            if (mode == 0) {
                // mode 0
                myGap = myInterval;
            } else {
                // mode 1
                myGap = 60;
            }
        }

        // Debug
        console.log('[' + name + '.' + CONTEXT + '] (' + getState('counter') + ') <' + getTime() + '> LOCAL_PIVOT:' + pivotIsLocal + ', ' +
            'MODE:' + mode + ', ' +
            'SKIP:' + mySkip + ', ' +
            'GAP:' + myGap + ' seconds');

        nextUpdateMilliseconds = (myGap * 1000) + (mySkip * 60 * 1000);
        return nextUpdateMilliseconds;
    };
    // }}}2

    /** startInterval(timeToNextTick, skip, interval, callback) {{{2
     * This is a recursive function and is the main timer reposible for the cycle.
     */
    const startInterval = function(timeToNextTick, skip, interval, callback) {
        // Plant the next run.
        setTimeout(function() {
            console.log(';\n\t(' + getTime() + ') Performing data push ...');

            // REMOTE API CALL
            // PUSH BLOCK STARTS
            console.time('\t\t>>>push');

            if(getState('isRequestActive')){
                console.log('\t(' + getTime() + ') Previous async REQUEST already running. Skipping ...');
            }else{
                // PERFORM THE WEBSOCKETS DATA PUSH.
                console.log('\t\t>>>___DATA_PUSH at ' + getTime());

                // Execute the callback.
                callback();

            }
            // PUSH BLOCK ENDS
            console.timeEnd('\t\t>>>push');
            console.log('\t(' + getTime() + ') Restarting runInterval() ...\n;');

            // Stick to the raw parameters.
            self.runInterval(skip, interval, callback);

        }, timeToNextTick);
    };
    // }}}2

    // Public Methods
    /** setState(item, value) {{{2
     * A public method dedicated to the control of the states.
     */
    self.setState = function(item, value) {
        console.log('*** ITEM:', item, 'VALUE:', value, ' ***');
        state[item] = value;
    };
    // }}}2

    /** runInterval(skip, interval, callback) {{{2
     * This is the main starting point for the interval.
     */
    self.runInterval = function(skip, interval, callback) {
        let CONTEXT = 'runInterval';
        var date = new Date();
        let myInterval = interval;              // Used
        let mySkip = skip;                      // Used
        let currentSeconds = date.getSeconds(); // Used
        let timeSignature = getTime();

        // Start
        updateCounter(1);
        let timeToNextTick = getNextTick(mySkip, myInterval, currentSeconds);
        console.log('[' + name + '.' + CONTEXT + '] (' + getState('counter') + ') <' + getTime() + '> Next data push expected in ' + timeToNextTick + ' milliseconds.');

        startInterval(timeToNextTick, mySkip, myInterval, callback);

        // Rest first run state flag.
        if(getState('isFirstRun')){
            self.setState('isFirstRun', false);
        }
    };
    // }}}2

    // Publish public end-points.
    return self;
}
// }}}1

/* EXPORTS */
module.exports = {
    Interval: Interval,
};

// vim: fdm=marker ts=4
