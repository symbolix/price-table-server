// Local Imports
const data = require('../lib/data-container.js');
const schema = require('../lib/data-schema.js');

const PAIRS = ['usd', 'eur'];
const ASSETS = [
    'btc',
    'eth',
    'zec',
    'ltc',
    'xmr',
    'dash',
    'eos',
    'etc',
    'xlm',
    'xrp'
];

function arrayToContainer(array){
    let container = {};
    for (var i = 0; i < array.length; i++) {
        container[array[i]] = null;
    }
    return container;
}

data.init(schema.dataTemplate);

// Construct Value Sub-Container
let pairsContainer = {};
for (var i = 0; i < PAIRS.length; i++) {
    pairsContainer[PAIRS[i]] = {
        assets: arrayToContainer(ASSETS),
        signature: {}
    };
}

// Populate the DATA section.
data.update({
    section: 'data',
    element: 'current',
    value: pairsContainer
});

/*
// Populate the UTILITY section.
data.update({
    section: 'utility',
    element: 'attributes',
    value: {
        exportId: null,
        exportTimestamp: null
    }
});
*/

let result;

// console.log('DATA:', data.exportState());

// data.get({section:'utility', key: 'blah'});
// try {
//     data.update({a:1, b:2});
// }catch(err){
//     console.log('CAUGHT_EXCEPTION:', err);
// }

// data.update({section: 'utility', element: 'id', value: 1234});
// result = data.update({section: 'utility', element: 'owner', value: {a:'1', b:'2'}});
// result = data.update({section: 'data', field: 'current', pair: 'EUR', component: 'assets', element: 'owner', value: {a:'1', b:'2'}});
// result = data.update({section: 'data', field: 'current', pair: 'EUR', component: 'assets', element: 'eth', value: {a:'1', b:'2'}});

// result = data.update({section: 'data', field: 'current', pair: 'EUR', component: 'assets', element: {xrp: {x:'6', y:'7', z: '8', q:'9'}}});
// result = data.update({section: 'data', field: 'current', pair: 'EUR', component: 'signature', element: 'banana', value: '0101010101'});
// result = data.update({section: 'tility', element: 'exportId', value: 1637256});

console.log('BEFORE:\n', data.exportState(), '\n');

console.log('PROCESS:');

/*
data.set('utility', null, null, null, 'exportId', 1637256);
data.set('data', 'current', 'EUR', 'assets', 'btc', 'xxx');
data.set('utility', null, null, null, 'fruit', 'apple');
data.set('utility', null, null, null, {'vehicle': {'car': 'Mazda', 'truck': 'Kamaz'}});
*/

data.set('utility', 'attributes', null, ['exportId', 'orange']);
data.set('utility', 'attributes', null, ['exportTimestamp', '1453236742']);
data.set('data', 'current', 'usd', 'assets', ['xrp', { message: 'hello' }]);
data.set('data', 'current', 'usd', 'assets', ['btc', { symbol: 'btc/usd' }]);
//data.set('data', 'current', 'usd', 'assets', ['trx', { symbol: 'trx/usd' }]);
data.set('data', 'current', 'usd', 'assets', ['eth', { symbol: 'eth/usd' }]);
result = data.update({section: 'utility', field: 'attributes', element: 'exportId', value: '08de2200-6443-4f17-be97-ea1a429b3ab1'});
result = data.update({section: 'utility', field: 'attributes', element: 'exportTimestamp', value: '1556832507'});

// Direct Access API
// Splicing the whole 'current' block at one go.
result = data.update({
    section: 'data',
    element: 'current',
    value: {
        eur: {
            assets: {
                btc: {
                    symbol: 'btc/eur',
                    timestamp: 15664346,
                    last: 4535,
                    success: true
                },
                xrp: {}
            },
            signature: {
                timestamp: 1556065007213,
                success: true
            }
        },
        usd: {
            assets: {
                eth: {
                    symbol: 'eth/usd',
                    timestamp: 55555555,
                    last: 35,
                    success: true
                },
                xrp: {}
            },
            signature: {
                timestamp: 1556065007213,
                success: true
            }
        }
    }
});

console.log('\nAFTER:\n', data.exportState());

result = data.update({
    section: 'data',
    field: 'current',
    pair: 'usd',
    component: 'assets',
    element: 'xrp',
    value: {
        message: 'Hello World!'
    }
});

console.log('\nAFTER:\n', data.exportState());
