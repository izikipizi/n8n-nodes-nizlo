const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

test('example workflows are valid JSON and reference the packaged Nizlo node', () => {
  const examplesDirectory = path.join(__dirname, '..', 'examples');
  const files = fs.readdirSync(examplesDirectory).filter((file) => file.endsWith('.json'));
  assert.equal(files.length, 2);

  for (const file of files) {
    const workflow = JSON.parse(fs.readFileSync(path.join(examplesDirectory, file), 'utf8'));
    const nizloNodes = workflow.nodes.filter((node) => node.type === 'n8n-nodes-nizlo.nizlo');
    assert.equal(nizloNodes.length, 1, `${file} must contain exactly one Nizlo node`);
    assert.equal(workflow.active, false, `${file} must be inactive when imported`);
    assert.ok(workflow.connections['Run manually'], `${file} must start from a manual trigger`);
  }
});
