// lib/logging.js

// Project Imports
const log = require ('ololog');
const bullet = require ('string.bullet');
const { darkGray,  magenta, black, bgRed, lightYellow, dim, red, cyan } = require ('ansicolor');

// Local Imports
const config = require('./configs');

// Local Variables
const operators = {
    '=': (a, b) => a === b,
    '<': (a, b) => a < b,
    '>': (a, b) => a > b
};

/*-----------;
 ; Overrides ;
 ;-----------*/

// @prototypeOverride stringFormatter
//      Method override to the String object.
//      (https://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format)
String.prototype.stringFormatter = String.prototype.stringFormatter ||
// {{{1
function () {
    'use strict';
    var str = this.toString();
    if (arguments.length) {
        var t = typeof arguments[0];
        var key;
        var args = ('string' === t || 'number' === t) ?
            Array.prototype.slice.call(arguments)
            : arguments[0];

        // console.log('===>', args);
        // console.log('--->', typeof args[0]);
        // console.log('--->', typeof args[1]);

        for (key in args) {
            let currentArg;
            let keyType = typeof args[key];
            // console.log('key:', key, 'keyType:', keyType);
            if(keyType === 'object'){
                // console.log('YES');
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

// @getComparisionOperator(a, b)
// (args)
//      a: first value
//      b: second value
// (info)
//      Expects two values and returns a literal comparison string.
//{{{1
const getComparisionOperator = (a, b) => {
    for (const operator in operators) {
        if (operators[operator](a, b)) {
            return operator;
        }
    }
    return '?';
};
//}}}1

/*-----------------;
 ; Public Methods. ;
 ;-----------------*/

// Module Test Functions
//      A generic test function.
//{{{1
function moduleTest(){
    console.log('__LOGGING__ module accessed.');
}
//}}}1

// Labels Config
//      Configuration stage for the labels.
//{{{1
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

// Logger Config
//      Configuration stage for the logger.
//{{{1
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
            return bullet(dim(contextStr.padEnd(16)) + '\t' + dim(verbosityStr.padStart(0)) + '\t' + levelStr.padStart(0) + '\t', lines);
        },
        locate: false
    }
);
// }}}1

// Main Logger Object
//      Container for the logging facilities.
//{{{1
function logger(){

    // DEBUG Messages {{{2
    this.debug = !config.get('DEBUG').console ? function(){} : function({ context=null, verbosity=null, message=null } = {}){
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

            logging.configure({ tag: { level: 'debug', context: context, verbosity: verbosityProduct } })(darkGray(message));
        }
    };
    //}}}2

    // INFO Messages {{{2
    this.info = !config.get('DEBUG').console ? function(){} : function({ context=null, verbosity=null, message=null } = {}){

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

            logging.configure({ tag: { level: 'info', context: context, verbosity: verbosityProduct } })(lightYellow(message));
        }
    };
    //}}}2

    // WARNING Messages {{{2
    this.warning = !config.get('DEBUG').console ? function(){} : function({ context=null, verbosity=null, message=null } = {}){

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
            logging.configure({ tag: { level: 'warning', context: context, verbosity: verbosityProduct } })(magenta(message));
        }
    };
    // }}}2

    // ERROR Messages {{{2
    this.error = !config.get('DEBUG').console ? function(){} : function({ context=null, verbosity=null, message=null } = {}){
        /* This type of message should NOT be tested against the global
         * verbosity depth. */
        logging.configure({ tag: { level: 'error', context: context } })(red(message));
    };
    //}}}2

    // SEVERE Messages {{{2
    this.severe = !config.get('DEBUG').console ? function(){} : function({ context=null, verbosity=null, message=null } = {}){
        /* This type of message should NOT be tested against the global
         * verbosity depth. */
        logging.configure({ tag: { level: 'severe', context: context } })(bgRed(message));
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
            labels.configure()(''.padStart(56) + colour(''.padEnd(3, '-') + ' [' + message + '] ' + ''.padStart(3, '-')));
        }
    };
    //}}}2
}
//}}}1

// Get Logger
//      Instancer function for the logger.
//{{{1
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
