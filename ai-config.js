// AI 호출 설정(제공자, 모델). 저장소에 직접 접근하지 않고 getItem/setItem/removeItem을 받아서 쓰므로 Node에서도 테스트할 수 있다.
// 제공자마다 주소는 고정이고(키가 엉뚱한 주소로 전송되는 것을 막기 위해 직접 입력하지 않는다), 모델과 API 키는 따로 저장한다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QuestifyAiConfig = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 둘 다 OpenAI 호환(chat/completions) 형식이라 같은 요청 코드를 쓴다.
  const PROVIDERS = {
    factchat: {
      label: '팩트챗',
      endpoint: 'https://factchat-cloud.mindlogic.ai/v1/gateway/chat/completions/',
      defaultModel: 'gemini-3.5-flash',
      keyName: 'gemini_api_key', // 예전부터 쓰던 저장 이름. 기존 사용자의 키를 그대로 쓰기 위해 바꾸지 않는다.
    },
    gemini: {
      label: '제미나이',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      defaultModel: 'gemini-3.5-flash',
      keyName: 'questify_gemini_direct_key',
    },
  };
  const DEFAULT_PROVIDER = 'factchat';
  const PROVIDER_KEY = 'questify_ai_provider';
  const modelKey = id => 'questify_ai_model_' + id;

  const isProvider = id => Object.prototype.hasOwnProperty.call(PROVIDERS, id);

  // 특정 제공자의 설정(주소, 모델, 키 저장 이름)을 읽는다.
  function loadFor(getItem, id) {
    const p = PROVIDERS[isProvider(id) ? id : DEFAULT_PROVIDER];
    const providerId = isProvider(id) ? id : DEFAULT_PROVIDER;
    const model = (getItem(modelKey(providerId)) || '').trim() || p.defaultModel;
    return { provider: providerId, endpoint: p.endpoint, model, keyName: p.keyName };
  }

  // 지금 선택된 제공자의 설정을 읽는다. 값이 없거나 알 수 없는 제공자면 기본(팩트챗)을 쓴다.
  function load(getItem) {
    const saved = getItem(PROVIDER_KEY);
    return loadFor(getItem, isProvider(saved) ? saved : DEFAULT_PROVIDER);
  }

  function validate(input) {
    const provider = input && input.provider;
    const model = String((input && input.model) ?? '').trim();
    if (!isProvider(provider)) return { ok: false, error: '알 수 없는 AI 제공자예요.' };
    if (!model) return { ok: false, error: '모델 이름을 입력해 주세요.' };
    return { ok: true, config: { provider, model } };
  }

  // 기본값과 같은 항목은 저장하지 않고 지운다. 다른 제공자의 모델은 건드리지 않는다.
  function save(config, setItem, removeItem) {
    if (config.provider === DEFAULT_PROVIDER) removeItem(PROVIDER_KEY);
    else setItem(PROVIDER_KEY, config.provider);
    if (config.model === PROVIDERS[config.provider].defaultModel) removeItem(modelKey(config.provider));
    else setItem(modelKey(config.provider), config.model);
  }

  return { PROVIDERS, DEFAULT_PROVIDER, load, loadFor, validate, save };
});
