const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../data-transfer.js');

const PLAYER = JSON.stringify({ characters: [{ name: '기본 목표', level: 3, xp: 10 }, { name: '둘째', level: 1, xp: 0 }] });
const APP = JSON.stringify({ todoList: [{ id: 1 }], quizStorage: [{ id: 2 }, { id: 3 }], memoStorage: [{ id: 4 }, { id: 5 }, { id: 6 }], wrongStorage: [] });

const fakeStorage = (init) => {
  const m = new Map(Object.entries(init));
  return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
};

test('buildBackup: 허용한 키만 담고 AI 키와 모르는 키는 넣지 않는다', () => {
  const s = fakeStorage({ questify_player_v3: PLAYER, questify_app_data_v5: APP, gemini_api_key: 'SECRET', other: 'x', questify_memo_font: "'Jua'" });
  const b = T.buildBackup(s.getItem, new Date('2026-10-21T00:00:00Z'));
  assert.equal(b.app, 'questify');
  assert.equal(b.version, 1);
  assert.equal(b.exportedAt, '2026-10-21T00:00:00.000Z');
  assert.deepEqual(Object.keys(b.data).sort(), ['questify_app_data_v5', 'questify_memo_font', 'questify_player_v3']);
  assert.ok(!JSON.stringify(b).includes('SECRET'));
});

test('parseBackup: 정상 백업은 요약(캐릭터·퀘스트·메모·퀴즈 수)과 함께 통과', () => {
  const s = fakeStorage({ questify_player_v3: PLAYER, questify_app_data_v5: APP });
  const r = T.parseBackup(JSON.stringify(T.buildBackup(s.getItem)));
  assert.equal(r.ok, true);
  assert.deepEqual(r.summary, { exportedAt: r.backup.exportedAt, characters: 2, todos: 1, memos: 3, quizzes: 2 });
});

test('parseBackup: JSON이 아니거나 우리 앱 백업이 아니면 거부', () => {
  assert.equal(T.parseBackup('이건 json 아님').ok, false);
  assert.equal(T.parseBackup('').ok, false);
  assert.equal(T.parseBackup(JSON.stringify({ app: 'other', version: 1, data: {} })).ok, false);
  assert.equal(T.parseBackup(JSON.stringify({ app: 'questify', version: 2, data: {} })).ok, false);
  assert.equal(T.parseBackup(JSON.stringify({ app: 'questify', version: 1, data: 'x' })).ok, false);
});

test('parseBackup: 캐릭터 정보가 없거나 안쪽 JSON이 깨졌으면 거부', () => {
  const bad1 = { app: 'questify', version: 1, exportedAt: 'x', data: { questify_app_data_v5: APP } };
  assert.equal(T.parseBackup(JSON.stringify(bad1)).ok, false);
  const bad2 = { app: 'questify', version: 1, exportedAt: 'x', data: { questify_player_v3: '{깨짐' } };
  assert.equal(T.parseBackup(JSON.stringify(bad2)).ok, false);
  const bad3 = { app: 'questify', version: 1, exportedAt: 'x', data: { questify_player_v3: JSON.stringify({ characters: [] }) } };
  assert.equal(T.parseBackup(JSON.stringify(bad3)).ok, false);
  const bad4 = { app: 'questify', version: 1, exportedAt: 'x', data: { questify_player_v3: 123 } };
  assert.equal(T.parseBackup(JSON.stringify(bad4)).ok, false);
});

test('applyBackup: 백업의 허용 키를 쓰고, 백업에 없는 허용 키는 지우며, 모르는 키와 AI 키는 건드리지 않는다', () => {
  const s = fakeStorage({ questify_player_v3: '{"characters":[{"name":"옛"}]}', questify_memo_size: '16px', gemini_api_key: 'MINE', other: 'keep' });
  const backup = { app: 'questify', version: 1, exportedAt: 'x', data: { questify_player_v3: PLAYER, questify_app_data_v5: APP, gemini_api_key: 'HACK', evil: 'y' } };
  T.applyBackup(backup, s.setItem, s.removeItem);
  assert.equal(s.getItem('questify_player_v3'), PLAYER);
  assert.equal(s.getItem('questify_app_data_v5'), APP);
  assert.equal(s.getItem('questify_memo_size'), null); // 백업에 없으므로 지워진다
  assert.equal(s.getItem('gemini_api_key'), 'MINE'); // 백업의 값으로 바뀌지 않는다
  assert.equal(s.getItem('other'), 'keep');
  assert.equal(s.getItem('evil'), null);
});
