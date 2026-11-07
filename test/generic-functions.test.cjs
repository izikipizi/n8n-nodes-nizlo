const test = require('node:test');
const assert = require('node:assert/strict');

const {
  compactQuery,
  listItems,
  listTotal,
  resourcePath,
} = require('../dist/nodes/Nizlo/GenericFunctions.js');

test('resourcePath maps only supported read-only resources', () => {
  assert.equal(resourcePath('customer'), '/customers');
  assert.equal(resourcePath('site'), '/sites');
  assert.equal(resourcePath('device'), '/devices');
  assert.equal(resourcePath('alert'), '/alerts');
});

test('compactQuery removes blank and absent values but preserves false and zero', () => {
  assert.deepEqual(
    compactQuery({ search: '', customerId: undefined, active: false, page: 0, status: 'ACTIVE' }),
    { active: false, page: 0, status: 'ACTIVE' },
  );
});

test('list helpers accept the Nizlo pagination envelope', () => {
  const response = { items: [{ id: 'one' }, { id: 'two' }], total: 2, page: 1, pageSize: 50 };
  assert.deepEqual(listItems(response), [{ id: 'one' }, { id: 'two' }]);
  assert.equal(listTotal(response), 2);
});

test('list helpers fail closed on malformed responses', () => {
  assert.deepEqual(listItems(null), []);
  assert.deepEqual(listItems({ items: 'not-an-array' }), []);
  assert.equal(listTotal({ total: -1 }), undefined);
  assert.equal(listTotal({ total: '2' }), undefined);
});
