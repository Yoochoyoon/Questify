const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../ai-config.js');

const store = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
};

test('제공자는 팩트챗과 제미나이 두 가지, 기본은 팩트챗', () => {
  assert.deepEqual(Object.keys(C.PROVIDERS), ['factchat', 'gemini']);
  assert.equal(C.DEFAULT_PROVIDER, 'factchat');
  assert.equal(C.PROVIDERS.factchat.endpoint, 'https://factchat-cloud.mindlogic.ai/v1/gateway/chat/completions/');
  assert.equal(C.PROVIDERS.gemini.endpoint, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
});

test('키 저장 이름: 팩트챗은 예전 이름을 그대로 쓰고(기존 사용자 호환), 제미나이는 따로 저장', () => {
  assert.equal(C.PROVIDERS.factchat.keyName, 'gemini_api_key');
  assert.notEqual(C.PROVIDERS.gemini.keyName, C.PROVIDERS.factchat.keyName);
});

test('모든 주소는 https다', () => {
  Object.values(C.PROVIDERS).forEach(p => assert.ok(p.endpoint.startsWith('https://')));
});

test('load: 저장된 값이 없으면 팩트챗과 그 기본 모델', () => {
  const c = C.load(store().getItem);
  assert.equal(c.provider, 'factchat');
  assert.equal(c.endpoint, C.PROVIDERS.factchat.endpoint);
  assert.equal(c.model, C.PROVIDERS.factchat.defaultModel);
  assert.equal(c.keyName, 'gemini_api_key');
});

test('load: 선택한 제공자와 그 제공자의 모델을 쓴다', () => {
  const s = store({ questify_ai_provider: 'gemini', questify_ai_model_gemini: 'my-gemini', questify_ai_model_factchat: 'other' });
  const c = C.load(s.getItem);
  assert.equal(c.provider, 'gemini');
  assert.equal(c.endpoint, C.PROVIDERS.gemini.endpoint);
  assert.equal(c.model, 'my-gemini');
  assert.equal(c.keyName, C.PROVIDERS.gemini.keyName);
});

test('load: 알 수 없는 제공자 값은 팩트챗으로 되돌린다', () => {
  const s = store({ questify_ai_provider: 'evil' });
  assert.equal(C.load(s.getItem).provider, 'factchat');
});

test('loadFor: 선택과 상관없이 특정 제공자의 설정을 읽는다', () => {
  const s = store({ questify_ai_provider: 'factchat', questify_ai_model_gemini: 'g-model' });
  assert.equal(C.loadFor(s.getItem, 'gemini').model, 'g-model');
  assert.equal(C.loadFor(s.getItem, 'gemini').provider, 'gemini');
});

test('validate: 정상 값은 모델 앞뒤 공백을 뗀다', () => {
  const r = C.validate({ provider: 'gemini', model: ' gemini-x ' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.config, { provider: 'gemini', model: 'gemini-x' });
});

test('validate: 모르는 제공자나 빈 모델은 거부', () => {
  assert.equal(C.validate({ provider: 'x', model: 'm' }).ok, false);
  assert.equal(C.validate({ provider: 'gemini', model: '   ' }).ok, false);
  assert.equal(C.validate({}).ok, false);
});

test('save: 기본값과 같은 항목은 지우고 다른 항목만 저장하며, 다른 제공자의 모델은 건드리지 않는다', () => {
  const s = store({ questify_ai_provider: 'gemini', questify_ai_model_gemini: 'old', questify_ai_model_factchat: 'keep' });
  C.save({ provider: 'factchat', model: C.PROVIDERS.factchat.defaultModel }, s.setItem, s.removeItem);
  assert.equal(s.getItem('questify_ai_provider'), null); // 기본 제공자이므로 지운다
  assert.equal(s.getItem('questify_ai_model_factchat'), null); // 기본 모델이므로 지운다
  assert.equal(s.getItem('questify_ai_model_gemini'), 'old'); // 다른 제공자 설정은 그대로
  C.save({ provider: 'gemini', model: 'new-model' }, s.setItem, s.removeItem);
  assert.equal(s.getItem('questify_ai_provider'), 'gemini');
  assert.equal(s.getItem('questify_ai_model_gemini'), 'new-model');
});
