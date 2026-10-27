import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture, descendants} from './helpers/app-fixture.mjs';

test('actual sample → compression → result hooks; narrow event payloads and unavailable API isolation', async () => {
  const f = await fixture({unavailable:true});
  assert.deepEqual(f.events(), ['page_view']);
  await f.sample();
  assert.equal(f.elements.get('shrink').disabled, false);
  assert.equal(f.doc.focused, f.elements.get('shrink'));
  assert.deepEqual(f.events(), ['page_view']);
  await f.shrink();
  assert.deepEqual(f.events(), ['page_view','tool_start','tool_complete']);
  assert.equal(f.elements.get('result').hidden, false);
  assert.equal(f.elements.get('download').download, 'sample-small.jpg');
  for (const call of f.requests) {
    assert.deepEqual(Object.keys(call.body).sort(), ['event','product']);
    assert.equal(call.body.product, 'shrink');
    assert.equal(call.options.mode, 'same-origin');
  }
  assert.equal(f.requests.some(call => call.path === '/api/feedback'), false);
});

test('actual failed compression records start only; invalid settings do not start; recovery works', async () => {
  const f = await fixture(); await f.sample();
  f.elements.get('target').value = 'custom'; f.elements.get('custom-size').value = '1';
  await f.shrink(); assert.deepEqual(f.events(), ['page_view']);
  assert.match(f.elements.get('status').textContent, /50 KB to 20 MB/);
  f.elements.get('target').value = '100000'; f.state.encodeFailure = true;
  await f.shrink(); assert.deepEqual(f.events(), ['page_view','tool_start']);
  assert.match(f.elements.get('status').textContent, /could not create/);
  assert.equal(f.elements.get('shrink').disabled, false);
  f.state.encodeFailure = false; await f.shrink();
  assert.deepEqual(f.events(), ['page_view','tool_start','tool_start','tool_complete']);
});

test('real app consent defaults off; GPC and DNT override saved opt-in', async () => {
  for (const options of [{optedIn:false}, {privacy:{globalPrivacyControl:true}}, {privacy:{doNotTrack:'1'}}]) {
    const f = await fixture(options); await f.sample(); await f.shrink();
    assert.equal(f.elements.get('result').hidden, false);
    assert.equal(f.requests.length, 0);
  }
});

test('actual feedback stays explicit, failures keep draft, EN/DE changes preserve state and links', async () => {
  const f = await fixture({optedIn:false,unavailable:true});
  const nodes = descendants(f.elements.get('measurement-feedback'));
  const open = nodes.find(el => el.textContent === 'Give feedback');
  await open.listeners.click(); assert.equal(f.requests.length, 0);
  const message = nodes.find(el => el.tagName === 'TEXTAREA'); message.value = 'Synthetic report';
  nodes.find(el => el.tagName === 'SELECT').value = 'usability';
  f.language.setLanguage('de');
  assert.equal(message.value, 'Synthetic report');
  assert.ok(nodes.some(el => el.href === 'https://tools.arcdrake.com/de/privacy/'));
  assert.ok(nodes.some(el => el.href === 'https://arcdrake.com/de/contact/'));
  assert.equal(f.language.translate('Give feedback'), 'Feedback geben');
  assert.equal(open.textContent, 'Feedback geben');
  assert.equal(f.language.translate('Feedback saved. Receipt ID: abc'), 'Feedback gespeichert. Beleg-ID: abc');
  await nodes.find(el => el.tagName === 'FORM').listeners.submit({preventDefault() {}});
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].path, '/api/feedback');
  assert.equal(message.value, 'Synthetic report');
  assert.ok(nodes.some(el => /receipt could not be confirmed/.test(el.textContent)));
  f.language.setLanguage('de');
  assert.ok(nodes.some(el => /Beleg konnte nicht bestätigt/.test(el.textContent)));
  f.language.setLanguage('en');
  assert.equal(message.value, 'Synthetic report');
  assert.ok(nodes.some(el => el.href === 'https://tools.arcdrake.com/privacy/'));
  assert.equal(f.elements.get('language').disabled, false);
});

test('opt-out stays usable during compression and suppresses the pending completion count', async () => {
  const f = await fixture(); await f.sample();
  const nodes = descendants(f.elements.get('measurement-feedback'));
  const deny = nodes.find(el => el.textContent === 'No usage counts');
  f.state.holdEncode = true;
  await f.shrink();
  assert.deepEqual(f.events(), ['page_view','tool_start']);
  assert.equal(deny.disabled, false);
  assert.equal(f.elements.get('language').disabled, false);
  deny.listeners.click();
  f.state.finishEncode(); await f.flush();
  assert.deepEqual(f.events(), ['page_view','tool_start']);
  assert.equal(f.elements.get('result').hidden, false);
});

test('every shared notice and combined page-only consent status translates EN/DE without remounting', async () => {
  const f = await fixture({storageUnavailable:true,optedIn:false});
  const {en, de} = f.notices;
  assert.deepEqual(Object.keys(en).sort(), Object.keys(de).sort());
  f.language.setLanguage('de');
  for (const key of Object.keys(en)) {
    assert.equal(f.language.translate(en[key]).trim(), de[key].trim(), key);
  }
  for (const state of ['on','off','blocked']) {
    assert.equal(f.language.translate(`${en[state]} ${en.pageOnly}`), `${de[state]} ${de.pageOnly}`);
  }
  const nodes = descendants(f.elements.get('measurement-feedback'));
  assert.ok(nodes.some(el => el.textContent === `${de.off} ${de.pageOnly}`));
  f.language.setLanguage('en');
  assert.ok(nodes.some(el => el.textContent === `${en.off} ${en.pageOnly}`));
});
