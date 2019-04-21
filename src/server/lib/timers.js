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

    // Counter
    let _counter = 0;

    // State Container
    let state = {
        isFirstRun: true,
        isRequestActive: false,
        get counter() {
            return _counter;
        }
    };

    log.info({
        context: 'constructor',
        verbosity: 3,
        message: 'Interval initialised as [' + name + ']',
    });

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
        let myGap, pivotIsLocal, mode, nextUpdateMilliseconds, identifier;

        log.debug({
            context: CONTEXT,
            verbosity: 7,
            message: '[{0}] Parameters: TIME <{1}>, INDEX <{2}>,  SKIP (MINUTES) <{3}>, INTERVAL (SECONDS) <{4}>, ENTRY TIME (SECONDS) <{5}>'
                .stringFormatter(
                    name,
                    getTime(),
                    getState('counter'),
                    mySkip,
                    myInterval,
                    currentSeconds
                )
        });

        log.debug({
            context: CONTEXT,
            verbosity: 7,
            message: '[{0}] State flags: IS_FIRST_RUN <{1}>, IS_REQUEST_ACTIVE <{2}>'
                .stringFormatter(
                    name,
                    getState('isFirstRun').toString(),
                    getState('isRequestActive').toString()
                )
        });


        // Pivot detection for our entry point.
        // For cases where our entry is before the INTERVAL or right at the INTERVAL,
        // we consider the pivot to be local as the temporal resolution will take place
        // within the current minute. For situations where we are beyond the INTERVAL,
        // we will be waiting for the start of the next minute for the resolution to be
        // started.
        if (currentSeconds <= myInterval) {
            // Just a debug.
            if (currentSeconds == myInterval) {
                identifier = 'aligned';
            } else {
                identifier = 'ahead';
            }

            pivotIsLocal = true;
        } else {
            identifier = 'on_next_minute';
            pivotIsLocal = false;
        }

        log.debug({
            context: CONTEXT,
            verbosity: 7,
            message: '[{0}] Identifier: START_TIME <{1}>'
                .stringFormatter(
                    name,
                    identifier
                )
        });

        if (currentSeconds % 60 == 0) {
            // We need to move $INTERVAL seconds forward.
            mode = 0;
        } else {
            if (currentSeconds == myInterval) {
                // We need to move 60 seconds forward.
                mode = 1;
            } else {
                // We need to calculate how much we will be jumping forward.
                mode = 2;
            }
        }

        if (mode == 2) {
            // mode 2

            // Reset skip only if we are in the first cycle.
            if (getState('isFirstRun')) {
                // Need to reset skip.
                log.debug({
                    context: CONTEXT,
                    verbosity: 7,
                    message: '[{0}] Resetting any SKIP values on the first run.'
                        .stringFormatter(
                            name
                        )
                });
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

        log.debug({
            context: CONTEXT,
            verbosity: 7,
            message: '[{0}] Interval values: LOCAL_PIVOT <{1}>, MODE <{2}>, SKIP <{3}>, GAP (SECONDS) <{4}>'
                .stringFormatter(
                    name,
                    pivotIsLocal.toString(),
                    mode,
                    mySkip,
                    myGap
                )
        });

        nextUpdateMilliseconds = (myGap * 1000) + (mySkip * 60 * 1000);
        return nextUpdateMilliseconds;
    };
    // }}}2

    /** startInterval(timeToNextTick, skip, interval, callback) {{{2
     * This is a recursive function and is the main timer reposible for the cycle.
     */
    const startInterval = function(timeToNextTick, skip, interval, callback) {
        let CONTEXT = 'startInterval';

        // Plant the next run.
        setTimeout(function() {
            if(getState('isRequestActive')){
                // Skip the interval task if previous task still active.
                log.warning({
                    context: CONTEXT,
                    verbosity: 3,
                    message: '[{0}] Previous interval task is still active, skipping most recent request at {1}'
                        .stringFormatter(
                            name,
                            getTime().toString()
                        )
                });
            }else{
                // Perform the interval task.
                log.info({
                    context: CONTEXT,
                    verbosity: 3,
                    message: '[{0}] Performing interval task at {1}'
                        .stringFormatter(
                            name,
                            getTime().toString()
                        )
                });

                // Execute the callback.
                callback();

            }

            log.info({
                context: CONTEXT,
                verbosity: 3,
                message: '[{0}] Restarting interval cycle.'
                    .stringFormatter(
                        name,
                    )
            });

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
        state[item] = value;
    };
    // }}}2

    /** runInterval(skip, interval, callback) {{{2
     * This is the main starting point for the interval.
     */
    self.runInterval = function(skip, interval, callback) {
        let CONTEXT = 'runInterval';
        var date = new Date();
        let myInterval = interval;
        let mySkip = skip;
        let currentSeconds = date.getSeconds();

        // Start
        updateCounter(1);
        let timeToNextTick = getNextTick(mySkip, myInterval, currentSeconds);

        log.info({
            context: CONTEXT,
            verbosity: 3,
            message: '[{0}] Next interval task will be called in {1} milliseconds.'
                .stringFormatter(
                    name,
                    timeToNextTick.toString()
                )
        });

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
