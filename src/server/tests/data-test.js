// Local Imports
const data = require('../lib/data-container.js');
const schema = require('../lib/data-schema.js');

data.init(schema.dataTemplate);

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
result = data.set('utility', null, null, null, 'exportId', 1637256);
result = data.set('data', 'current', 'EUR', 'assets', 'btc', 'xxx');
result = data.set('utility', null, null, null, 'fruit', 'apple');
result = data.set('utility', null, null, null, {'vehicle': {'car': 'Mazda', 'truck': 'Kamaz'}});

console.log('Continue ...');
console.log('result:', result);
console.log('DATA:\n', data.exportState());
