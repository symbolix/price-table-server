/* Price Table Server | tradekit.io
 *
 * @mudule: logging
 *
 * Copyright (c) 2019 Milen Bilyanov
 * Licensed under the MIT license.
 */
'use strict';

// Project Imports
const log = require ('ololog');
const bullet = require ('string.bullet');
const { darkGray,  magenta, bgRed, lightYellow, dim, red, cyan } = require ('ansicolor');

// Local Imports
const config = require('./config');

var MODULE = 'logging';

// Local Variables
const operators = {
    '=': (a, b) => a === b,
    '<': (a, b) => a < b,
    '>': (a, b) => a > b
};

/*-----------;
 ; Overrides ;
 ;-----------*/

/** @prototypeOverride stringFormatter {{{1
 * Method override to the String object.
 * (https://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format)
 */

String.prototype.stringFormatter = String.prototype.stringFormatter ||
    function () {
        'use strict';
        var str = this.toString();
        if (arguments.length) {
            var t = typeof arguments[0];
            var key;
            var args = ('string' === t || 'number' === t) ?
                Array.prototype.slice.call(arguments)
                : arguments[0];

            for (key in args) {
                let currentArg;
                let keyType = typeof args[key];
                if(keyType === 'object'){
                    currentArg = JSON.stringify(args[key]);
                }else{
                    currentArg = args[key];
                }
                str = str.replace(new RegExp('\\{' + key + '\\}', 'gi'), currentArg);
            }
        }

        return str;
    };
// }}}1

/*------------------;
 ; Private Methods. ;
 ;------------------*/

/** @private getComparisionOperator(a, b) {{{1
 *
 * Expects two values and returns a literal comparison string. The _a_
 * parameter is the first value and the _b_ parameter is the second value.
 *
 * @param {Number} a
 * @param {Number} b
 */

const getComparisionOperator = (a, b) => {
    for (const operator in operators) {
        if (operators[operator](a, b)) {
            return operator;
        }
    }
    return '?';
};
//}}}1

/** @private labels() {{{1
 *
 * Logger configuration specific to the label style messages.
 *
 */

const labels = log.configure (
    {
        time: {
            yes: false,
        },
        tag: (lines
        ) => {
            return bullet('', lines);
        },
        locate: false
    }
);
// }}}1

/** @private logging() {{{1
 * This is the logger configuration object.
 */

const logging = log.configure (
    {
        time: {
            yes: true,
            format: 'iso',
            print: x => (dim.cyan(('[' + String(x.toISOString()) +'] ')))
        },
        tag: (lines, {
            level = '',
            levelColor = { 'debug': darkGray, 'info': lightYellow.inverse, 'warning': magenta.inverse, 'error': red.inverse, 'severe': red, 'label': cyan.inverse },
            context,
            verbosity
        }) => {
            const contextStr = context ? ('[' + (context + '') + ']') : '';
            const verbosityStr = verbosity ? ('{' + (verbosity + '') + '}') : '';
            const levelStr = level && (levelColor[level] || (s => s)) (level.toUpperCase ());
            return bullet(dim(contextStr.padEnd(34)) + '' + dim(verbosityStr.padStart(0)) + '\t' + levelStr.padStart(0) + '\t', lines);
        },
        locate: false
    }
);
// }}}1

/** @private logger() {{{1
 *
 * Main logger object. Container for the logging facilities.
 */

function logger(){

    // DEBUG Messages {{{2
    this.debug = !config.get('DEBUG').console ? function(){} : function({ context=null, verbosity=null, colour=darkGray, message=null } = {}){
        // The verbosity requirement sent by the function.
        let requiredVerbosityDepth = verbosity === null ? config.get('REQUIRED_VERBOSITY_DEPTH') : verbosity;

        // Current verbosity depth.
        let currentVerbosityDepth = config.get('CURRENT_VERBOSITY_DEPTH');

        // Verbosity Condition
        if(requiredVerbosityDepth <= currentVerbosityDepth){

            // Visual representation of the verbosity comparison character.
            let verbositySign = getComparisionOperator(requiredVerbosityDepth, currentVerbosityDepth);

            // Combined verbosity relation string.
            let verbosityProduct = requiredVerbosityDepth + verbositySign + currentVerbosityDepth;

            logging.configure({ tag: { level: 'debug', context: context, verbosity: verbosityProduct } })(colour(message));
        }
    };
    //}}}2

    // INFO Messages {{{2
    this.info = !config.get('DEBUG').console ? function(){} : function({ context=null, verbosity=null, colour=lightYellow, message=null } = {}){

        // The verbosity requirement sent by the function.
        let requiredVerbosityDepth = verbosity === null ? config.get('REQUIRED_VERBOSITY_DEPTH') : verbosity;

        // Current verbosity depth.
        let currentVerbosityDepth = config.get('CURRENT_VERBOSITY_DEPTH');

        // Verbosity Condition
        if(requiredVerbosityDepth <= currentVerbosityDepth){

            // Visual representation of the verbosity comparison character.
            let verbositySign = getComparisionOperator(requiredVerbosityDepth, currentVerbosityDepth);

            // Combined verbosity relation string.
            let verbosityProduct = requiredVerbosityDepth + verbositySign + currentVerbosityDepth;

            logging.configure({ tag: { level: 'info', context: context, verbosity: verbosityProduct } })(colour(message));
        }
    };
    //}}}2

    // WARNING Messages {{{2
    this.warning = !config.get('DEBUG').console ? function(){} : function({ context=null, verbosity=null, colour=magenta ,message=null } = {}){

        // The verbosity requirement sent by the function.
        let requiredVerbosityDepth = verbosity === null ? config.get('REQUIRED_VERBOSITY_DEPTH') : verbosity;

        // Current verbosity depth.
        let currentVerbosityDepth = config.get('CURRENT_VERBOSITY_DEPTH');

        // Verbosity Condition
        if(requiredVerbosityDepth <= currentVerbosityDepth){

            // Visual representation of the verbosity comparison character.
            let verbositySign = getComparisionOperator(requiredVerbosityDepth, currentVerbosityDepth);

            // Combined verbosity relation string.
            let verbosityProduct = requiredVerbosityDepth + verbositySign + currentVerbosityDepth;
            logging.configure({ tag: { level: 'warning', context: context, verbosity: verbosityProduct } })(colour(message));
        }
    };
    // }}}2

    // ERROR Messages {{{2
    this.error = !config.get('DEBUG').console ? function(){} : function({ context=null, verbosity=null, colour=red, message=null } = {}){
        /* This type of message should NOT be tested against the global
         * verbosity depth. */
        // Colour override is not allowed here!
        colour = red;
        logging.configure({ tag: { level: 'error', context: context, verbosity: '___' } })(colour(message));
    };
    //}}}2

    // SEVERE Messages {{{2
    this.severe = !config.get('DEBUG').console ? function(){} : function({ context=null, verbosity=null, colour=null, message=null } = {}){
        /* This type of message should NOT be tested against the global
         * verbosity depth. */
        // Colour override is not allowed here!
        colour = bgRed;
        logging.configure({ tag: { level: 'severe', context: context, verbosity: '___' } })(colour(message));
    };
    //}}}2

    // LABEL Messages {{{2
    this.label = !config.get('DEBUG').console ? function(){} : function({ colour=cyan, verbosity=null, message=null } = {}){

        // The verbosity requirement sent by the function.
        let requiredVerbosityDepth = verbosity === null ? config.get('REQUIRED_VERBOSITY_DEPTH') : verbosity;

        // Current verbosity depth.
        let currentVerbosityDepth = config.get('CURRENT_VERBOSITY_DEPTH');

        // Verbosity Condition
        if(requiredVerbosityDepth <= currentVerbosityDepth){

            // Visual representation of the verbosity comparison character.
            let verbositySign = getComparisionOperator(requiredVerbosityDepth, currentVerbosityDepth);

            // No need for a verbosity product here.
            // But we need some formatting work.
            labels.configure()(''.padStart(72) + colour(''.padEnd(3, '-') + ' <' + message + '> ' + ''.padStart(3, '-')));
        }
    };
    //}}}2
}
//}}}1

/*-----------------;
 ; Public Methods. ;
 ;-----------------*/

/** @public moduleTest() {{{1
 * A generic test function.
 */

function moduleTest(){
    let CONTEXT = MODULE + '.' + 'moduleTest';
    log.debug({
        context: CONTEXT,
        verbosity: 5,
        message: ('__LOGGING__ module accessed.'),
    });
}
//}}}1

/** @public getLogger() {{{1
 * Get Logger
 * Constructor function for the logger.
 */

function getLogger(){
    return new logger();
}
//}}}1

/*----------------;
 ; Module Exports ;
 ;----------------*/

module.exports = {
    getLogger,
    moduleTest
};

// vim: fdm=marker ts=4
