// 데이터 옮기기: 이 기기의 저장 데이터를 백업으로 만들고, 다른 기기의 백업을 검사한 뒤 적용한다.
// 저장소에 직접 접근하지 않고 getItem/setItem/removeItem을 받아서 쓰므로 Node에서도 테스트할 수 있다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QuestifyTransfer = factory(); // 브라우저 기본 객체 DataTransfer와 이름이 겹치지 않게 한다.
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 옮길 수 있는 저장 항목. AI 키(gemini_api_key)는 파일이나 복사한 글자에 들어가면 위험하므로 의도적으로 뺐다.
  const KEYS = [
    'questify_player_v3',
    'questify_app_data_v5',
    'questify_memo_font',
    'questify_memo_size',
    'questify_memo_preview',
  ];
  const PLAYER_KEY = 'questify_player_v3';
  const APP_KEY = 'questify_app_data_v5';

  function buildBackup(getItem, now = new Date()) {
    const data = {};
    KEYS.forEach(k => {
      const v = getItem(k);
      if (v !== null && v !== undefined) data[k] = String(v);
    });
    return { app: 'questify', version: 1, exportedAt: now.toISOString(), data };
  }

  const fail = error => ({ ok: false, error });

  // 백업 텍스트를 검사한다. 통과하면 적용 전에 보여 줄 요약을 함께 돌려준다.
  function parseBackup(text) {
    let backup;
    try { backup = JSON.parse(String(text).trim()); } catch (e) { return fail('백업 형식이 아니에요. 내보낸 파일이나 코드를 그대로 붙여 넣어 주세요.'); }
    if (!backup || typeof backup !== 'object' || backup.app !== 'questify') return fail('Questify에서 내보낸 백업이 아니에요.');
    if (backup.version !== 1) return fail('지원하지 않는 백업 버전이에요.');
    if (!backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) return fail('백업 안에 데이터가 없어요.');

    const parsed = {};
    for (const k of KEYS) {
      if (!(k in backup.data)) continue;
      if (typeof backup.data[k] !== 'string') return fail('백업 내용이 손상됐어요.');
      if (k === PLAYER_KEY || k === APP_KEY) {
        try { parsed[k] = JSON.parse(backup.data[k]); } catch (e) { return fail('백업 내용이 손상됐어요.'); }
      }
    }
    const player = parsed[PLAYER_KEY];
    if (!player || !Array.isArray(player.characters) || player.characters.length === 0) return fail('백업에 캐릭터 정보가 없어요.');
    const app = parsed[APP_KEY] || {};
    const count = v => (Array.isArray(v) ? v.length : 0);
    return {
      ok: true,
      backup,
      summary: { exportedAt: backup.exportedAt, characters: player.characters.length, todos: count(app.todoList), memos: count(app.memoStorage), quizzes: count(app.quizStorage) },
    };
  }

  // 백업을 이 기기에 적용한다. 허용한 키만 다루며, 백업에 없는 허용 키는 지워서 기기를 백업과 같은 상태로 만든다.
  function applyBackup(backup, setItem, removeItem) {
    KEYS.forEach(k => {
      if (k in backup.data) setItem(k, backup.data[k]);
      else removeItem(k);
    });
  }

  return { KEYS, buildBackup, parseBackup, applyBackup };
});
