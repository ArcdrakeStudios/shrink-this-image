import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePayload, EVENTS, CATEGORIES} from '../dist/shared/measurement-contract.mjs';

test('only allowlisted product/event and exact event fields enter measurement', () => {
  for (const event of EVENTS) assert.deepEqual(validatePayload('events', {product:'shrink',event}), {product:'shrink',event});
  for (const data of [{product:'shrink',event:'download'}, {product:'unknown',event:'page_view'},
    {product:'shrink',event:'tool_start',url:'https://private.invalid/'},
    {product:'shrink',event:'tool_start',filename:'private.png'}]) {
    assert.throws(() => validatePayload('events', data), error => error.status === 400 && error.code === 'invalid');
  }
});

test('feedback categories, message boundaries, optional email and control rejection match shared contract', () => {
  for (const category of CATEGORIES) {
    assert.deepEqual(validatePayload('feedback',{product:'shrink',category,message:'  Synthetic\n\treport  '}),
      {product:'shrink',category,message:'Synthetic\n\treport'});
  }
  const valid = {product:'shrink',category:'bug',message:'x'.repeat(2000),replyTo:' synthetic@example.com '};
  assert.equal(validatePayload('feedback',valid).replyTo,'synthetic@example.com');
  for (const fields of [{category:'spam'}, {message:' '}, {message:'x'.repeat(2001)}, {message:'bad\x00data'},
    {replyTo:'bad'}, {replyTo:'x@example.com\r\nInjected'}, {replyTo:'x'.repeat(245)+'@example.com'}, {extra:'private'}]) {
    assert.throws(() => validatePayload('feedback', {...valid,...fields}));
  }
});
