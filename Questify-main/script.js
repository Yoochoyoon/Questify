// 캡슐화를 통해 전역 네임스페이스 오염을 방지하기 위한 즉시 실행 함수(IIFE) 스코프이다.
(function () {
  'use strict';
  const MAX_LEVEL = 50;
  const STORAGE_KEY = 'questify_player_v3';
  // 앱의 기본(Default) 상태 스키마를 정의한다. 1번 캐릭터의 기초 데이터가 내장되어 있다.
  let state = { characters: [{ name: '기본 목표', level: 1, xp: 0, x: 50, y: 80, showExclamation: false, quizTypes: ['ox', 'multiple', 'short'] }] };

  // 캐릭터 객체 생성 또는 로드 시 외형(파츠) 및 기본 퀴즈 속성 데이터를 초기화/보강하는 함수이다.
  function initCharParts(char) {
    if (char.headType === undefined) char.headType = Math.floor(Math.random() * 5) + 1;
    if (char.bottomType === undefined) char.bottomType = Math.floor(Math.random() * 2) + 1;
    if (char.headColor === undefined) char.headColor = Math.floor(Math.random() * 360);
    if (char.bottomColor === undefined) char.bottomColor = Math.floor(Math.random() * 360);
    if (char.quizTypes === undefined) char.quizTypes = ['ox', 'multiple', 'short']; // 누락 방지용 기본 퀴즈 타입 할당 속성이다.
  }

  const DOM = {};
  // 특정 레벨의 다음 레벨업까지 요구되는 경험치(XP) 요구량을 연산하여 반환한다. (만렙 시 무한대)
  function getXpRequired(level) { return level >= MAX_LEVEL ? Infinity : 100; }

  // 보유한 모든 캐릭터들의 레벨 총합산인 유니온 레벨을 산출하여 반환한다.
  function getUnionLevel() { return state.characters.reduce((sum, char) => sum + char.level, 0); }

  // 화면에 시각적 알림(플로팅 텍스트)을 표출하기 위한 전용 DOM 레이어를 동적으로 삽입한다.
  function createFloatLayer() {
    const gameScreen = document.getElementById('game-screen');
    DOM.floatLayer = document.createElement('div');
    DOM.floatLayer.style.cssText = 'position:absolute; inset:0; pointer-events:none; z-index:100; overflow:hidden;';
    gameScreen.appendChild(DOM.floatLayer);
  }

  // 상태 변경 사항을 UI에 일괄적으로 동기화 렌더링하도록 지시하는 함수이다.
  function updateUI() {
    const unionElHUD = document.getElementById('union-level-hud');
    if (unionElHUD) unionElHUD.textContent = '유니온 Lv.' + getUnionLevel();
    if (typeof renderLobbyCharacters === 'function') renderLobbyCharacters();
  }

  // 인자로 전달된 수치만큼 특정 캐릭터에게 경험치(XP)를 부여하고 레벨업 여부를 판별한다.
  function gainXP(amount, charIdx = 0) {
    if (charIdx >= state.characters.length || charIdx < 0) charIdx = 0;
    const char = state.characters[charIdx];
    if (char.level >= MAX_LEVEL) { showFloat('만렙 달성!', false, charIdx); return; }

    showFloat('+' + amount + ' XP', false, charIdx);
    char.xp += amount;

    // 누적 경험치가 요구량을 초과할 경우 루프를 돌며 연속 레벨업을 처리한다.
    while (char.level < MAX_LEVEL && char.xp >= getXpRequired(char.level)) {
      char.xp -= getXpRequired(char.level); char.level++;
      showFloat('Lv.' + char.level + ' 달성!', true, charIdx);
    }

    if (char.level >= MAX_LEVEL) char.xp = 0;
    updateUI(); save();
  }

  // 특정 좌표를 기준으로 시각적인 텍스트 상승 애니메이션 DOM을 생성 후 일정 시간 뒤 제거한다.
  function showFloat(text, isLevelUp, charIdx = 0) {
    if (!DOM.floatLayer) return;
    const charEl = document.querySelector(`.lobby-char[data-idx="${charIdx}"]`);
    let left = '50%', top = '50%';
    if (charEl) { left = charEl.style.left; top = charEl.style.top; }
    const el = document.createElement('div'); el.textContent = text;
    el.style.cssText = `position:absolute; left:${left}; top:${top}; transform:translate(-50%,-100%); font-size:${isLevelUp ? '24px' : '16px'}; font-weight:900; color:${isLevelUp ? '#2563eb' : '#111'}; text-shadow:1.5px 1.5px 0 #fff,-1.5px -1.5px 0 #fff,1.5px -1.5px 0 #fff,-1.5px 1.5px 0 #fff; white-space:nowrap; animation:xpFloatUp 1.4s ease-out forwards;`;
    DOM.floatLayer.appendChild(el); setTimeout(() => el.remove(), 1500);
  }

  // 변경된 상태(State) 구조체를 로컬 스토리지에 문자열로 영구 저장한다.
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  // 브라우저 로컬 스토리지에서 기록된 애플리케이션 상태를 복원하고 유효성을 검사한다.
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY); let needsSave = false;
      if (raw) {
        const loadedState = JSON.parse(raw);
        if (loadedState.characters && loadedState.characters.length > 0) {
          state.characters = loadedState.characters;
          // 누락된 속성이나 좌표가 잘못된 객체에 대해 마이그레이션(보정)을 수행한다.
          state.characters.forEach(c => {
            if (typeof c.x !== 'number' || isNaN(c.x) || c.x < 0 || c.x > 100) { c.x = 50; needsSave = true; }
            if (typeof c.y !== 'number' || isNaN(c.y) || c.y < 0 || c.y > 100) { c.y = 80; needsSave = true; }
            if (c.headType === undefined || c.quizTypes === undefined) needsSave = true; initCharParts(c);
          });
        } else { needsSave = true; }
      } else { state.characters.forEach(c => initCharParts(c)); needsSave = true; }
      if (needsSave) save();
    } catch (e) { console.warn('Init error', e); }
  }

  // 외부 스코프에서 캐릭터 데이터 및 유틸리티에 접근할 수 있도록 API 객체를 노출한다.
  window.Questify = {
    gainXP, getUnionLevel, getXpRequired, getCharacters: () => state.characters, saveState: save, updateUI: updateUI, initCharParts: initCharParts,
    // 하드 리셋 시 모든 스토리지 데이터를 폐기하고 구조체를 초기 상태로 복구한다.
    reset() { localStorage.removeItem(STORAGE_KEY); state = { characters: [{ name: '기본 목표', level: 1, xp: 0, x: 50, y: 80, showExclamation: false, quizTypes: ['ox', 'multiple', 'short'] }] }; state.characters.forEach(c => initCharParts(c)); save(); updateUI(); }
  };

  // 실행 흐름 초기화 블록: 계층 생성, 스토리지 로드 후 UI 비동기 지연 업데이트를 실시한다.
  createFloatLayer(); load(); setTimeout(updateUI, 50);
})();

// 시스템 알림(Alert, Confirm 등)에 사용할 콜백 함수 포인터들을 관리하기 위한 전역 변수들이다.
let customAlertCb, customConfirmCb, customPromptCb, customSelectCb;
const dialogOverlay = document.getElementById('dialog-overlay');

// 활성화되어 있는 모든 다이얼로그 모달을 비표시 상태로 전환한다.
function closeAllDialogs() { document.querySelectorAll('#dialog-overlay .modal-content').forEach(m => m.classList.add('hidden')); }

// 특정 다이얼로그 요소의 ID를 전달받아 오버레이와 함께 시각화한다.
function openSpecificDialog(dialogId) {
  dialogOverlay.classList.remove('hidden'); closeAllDialogs();
  document.getElementById(dialogId).classList.remove('hidden');
}

// 기본 alert을 대체하여 디자인된 커스텀 알림창을 트리거하는 함수이다.
window.showCustomAlert = function (msg, callback) {
  document.getElementById('custom-alert-msg').innerText = msg; customAlertCb = callback; openSpecificDialog('custom-alert');
  setTimeout(() => { document.getElementById('custom-alert-btn').focus(); }, 30);
}
// 알림창 확인 버튼 클릭 시 오버레이를 감추고 콜백 이행.
document.getElementById('custom-alert-btn').onclick = () => { dialogOverlay.classList.add('hidden'); if (customAlertCb) customAlertCb(); }

// 기본 confirm을 대체하여 디자인된 커스텀 승인창을 트리거하는 함수이다.
window.showCustomConfirm = function (msg, onConfirm) {
  document.getElementById('custom-confirm-msg').innerText = msg; customConfirmCb = onConfirm; openSpecificDialog('custom-confirm');
  setTimeout(() => { document.getElementById('custom-confirm-ok').focus(); }, 30);
}
// 승인창 취소 시 무응답 처리, 확인 시 콜백 이행 로직을 설정한다.
document.getElementById('custom-confirm-cancel').onclick = () => dialogOverlay.classList.add('hidden');
document.getElementById('custom-confirm-ok').onclick = () => { dialogOverlay.classList.add('hidden'); if (customConfirmCb) customConfirmCb(); }

// 기본 prompt를 대체하여 텍스트 입력을 받아 처리하는 커스텀 입력창 트리거 함수이다.
window.showCustomPrompt = function (title, defaultVal, onConfirm) {
  document.getElementById('custom-prompt-title').innerText = title; const input = document.getElementById('custom-prompt-input'); input.value = defaultVal || ''; customPromptCb = onConfirm; openSpecificDialog('custom-prompt');
  setTimeout(() => { input.focus(); const val = input.value; input.value = ''; input.value = val; input.setSelectionRange(val.length, val.length); }, 30);
}
// 입력창 취소 및 확인 시 대응 로직을 바인딩한다.
document.getElementById('custom-prompt-cancel').onclick = () => dialogOverlay.classList.add('hidden');
document.getElementById('custom-prompt-ok').onclick = () => { const val = document.getElementById('custom-prompt-input').value; dialogOverlay.classList.add('hidden'); if (customPromptCb) customPromptCb(val); }

// 옵션 다중 선택을 요하는 로직에서 활용되는 셀렉트 박스 다이얼로그 호출 함수이다.
window.showCustomSelect = function (title, msg, options, onConfirm) {
  document.getElementById('custom-select-title').innerText = title; document.getElementById('custom-select-msg').innerText = msg;
  const select = document.getElementById('custom-select-input'); select.innerHTML = '';
  options.forEach(opt => { const el = document.createElement('option'); el.value = opt.value; el.innerText = opt.text; select.appendChild(el); });
  customSelectCb = onConfirm; openSpecificDialog('custom-select');
  setTimeout(() => { select.focus(); }, 30);
}
// 셀렉트 박스의 확인 클릭 처리 및 외부 영역 클릭 시 오버레이 닫기 로직이다.
document.getElementById('custom-select-ok').onclick = () => { const val = document.getElementById('custom-select-input').value; dialogOverlay.classList.add('hidden'); if (customSelectCb) customSelectCb(val); }
dialogOverlay.addEventListener('click', (e) => { if (e.target === dialogOverlay) dialogOverlay.classList.add('hidden'); });

// [수정됨] 콘텐츠용 모달 윈도우(메모장, 설정 등)를 제어하기 위한 포인터와 초기화 함수 세트이다.
const modalOverlay = document.getElementById('modal-overlay');
let isMemoOpenedFromSlot = false; // [추가됨] 캐릭터 유니온(슬롯) 창에서 메모장으로 진입했는지 여부를 저장하는 전역 플래그입니다.

function closeAllCustomModals() { document.querySelectorAll('#modal-overlay .modal-content').forEach(m => m.classList.add('hidden')); }
function openSpecificModal(modalId) { modalOverlay.classList.remove('hidden'); closeAllCustomModals(); document.getElementById(modalId).classList.remove('hidden'); }

// [수정됨] 모달 창 내부의 X 닫기 버튼 클릭 시나리오 제어 로직
document.querySelectorAll('.close-modal-btn').forEach(btn => {
  btn.addEventListener('click', function (e) {
    const parentModal = this.closest('.modal-content');

    // 1. 만약 현재 닫으려는 창이 '학습 메모장(글쓰기)' 창이라면, 
    // 오버레이를 완전히 닫지 않고 이전 화면인 '학습 메모 목록' 창으로 되돌아갑니다. (UX 개선)
    if (parentModal && parentModal.id === 'notepad-modal') {
      openSpecificModal('char-memo-modal');
      editingMemoId = null;
      return;
    }

    // 2. 만약 현재 닫으려는 창이 '학습 메모 목록' 창인데, 
    // 캐릭터 유니온(슬롯) 창에서 넘어서 들어온 것이라면 유니온 창으로 되돌아갑니다. (요청하신 기능)
    if (parentModal && parentModal.id === 'char-memo-modal' && isMemoOpenedFromSlot) {
      isMemoOpenedFromSlot = false; // 진입 상태 리셋
      openSpecificModal('slot-modal');
      return;
    }

    // 3. 그 외의 모든 경우 (로비에서 직접 느낌표를 누르거나, 다른 모달을 닫는 경우)
    // 모달 오버레이 자체를 완전히 숨겨서 메인 화면으로 복귀합니다.
    modalOverlay.classList.add('hidden');
    currentActiveQuiz = null;
    editingMemoId = null;
    isMemoOpenedFromSlot = false; // 만약을 위해 안전하게 초기화
  });
});

// 바깥쪽 어두운 오버레이 영역을 직접 클릭했을 때는 
// 예외 없이 모든 창을 완전히 닫고 메인으로 돌아가도록 유저 편의성을 제공합니다.
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.add('hidden');
    currentActiveQuiz = null;
    editingMemoId = null;
    isMemoOpenedFromSlot = false;
  }
});

// 퀘스트/퀴즈 데이터 영구 저장에 사용되는 스토리지 키 식별자와 상태 배열들을 선언한다.
const APP_DATA_KEY = 'questify_app_data_v5';
let todoList = []; let memoStorage = []; let quizStorage = []; let currentActiveQuiz = null; let targetCharIdxForMemo = 0; let editingMemoId = null; let isDraggingTodoItem = false; let isLogView = false; let isGeneratingQuiz = false;

// 문자열에 포함된 XSS 공격 및 이스케이프 문자 파괴를 방지하는 치환 유틸리티 함수이다.
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char])); }

// Date.now() ID 충돌 방지용 고유 ID 생성기
let __uidSeq = 0;
function uid() { return Date.now() * 1000 + (__uidSeq++ % 1000); }

// 로컬 환경의 애플리케이션 스토리지 구조체를 읽어 메모리에 복원하는 역할을 수행한다.
function loadAppData() {
  try {
    const data = localStorage.getItem(APP_DATA_KEY);
    if (data) {
      const parsed = JSON.parse(data); todoList = parsed.todoList || []; quizStorage = parsed.quizStorage || []; memoStorage = parsed.memoStorage || [];
      const today = new Date().toLocaleDateString();
      if (parsed.lastDate && parsed.lastDate !== today) {
        todoList.forEach(t => { if (t.status === 'clear' || t.isHiddenInLog) t.isPastLog = true; if (t.subtasks) { t.subtasks.forEach(s => { if (s.status === 'clear' || s.isHiddenInLog) s.isPastLog = true; }); } });
        saveAppData();
      }
    }
  } catch (e) { }
}

// 현재 메모리에 상주 중인 퀘스트 및 퀴즈 상태를 문자열화하여 스토리지에 플러시(저장)한다.
function saveAppData() { localStorage.setItem(APP_DATA_KEY, JSON.stringify({ todoList, quizStorage, memoStorage, lastDate: new Date().toLocaleDateString() })); }

// 데이터 갱신에 따라 투두 리스트, 퀴즈 저장소, 진행률 및 기타 UI 요소를 전체 리렌더링하는 통합 트리거 함수이다.
function renderAll() { renderTodoList(); renderStorageList(); updateProgressBar(); saveAppData(); syncExclamations(); if (window.Questify) window.Questify.updateUI(); }

// [로그] 버튼 클릭 시 현재 뷰 모드를 일일 퀘스트 모드와 지난 기록(로그) 모드 사이에서 스위칭한다.
document.getElementById('btn-toggle-log').addEventListener('click', () => {
  isLogView = !isLogView;
  document.getElementById('quest-panel-title').innerText = isLogView ? '완료 기록' : '일일퀘스트';
  const btn = document.getElementById('btn-toggle-log');
  btn.innerText = isLogView ? '목록' : '로그';
  btn.style.background = isLogView ? '#666' : '#555';

  const subtext = document.getElementById('quest-subtext');
  if (isLogView) subtext.style.visibility = 'hidden';
  else subtext.style.visibility = 'visible';

  renderTodoList();
});

// 일일 퀘스트 및 서브태스크 목록의 구조를 동적으로 생성하여 DOM 트리에 부착하는 렌더링 핵심 함수이다.
function renderTodoList() {
  const container = document.getElementById('quest-list-container'); container.innerHTML = '';
  const todos = todoList.filter(item => item.type === 'todo'); let displayTodos = [];

  if (isLogView) {
    displayTodos = todos.filter(item => item.status === 'clear' && !item.isHiddenInLog);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'add-card clear-log';
    clearBtn.setAttribute('tabindex', '0');
    clearBtn.innerHTML = '<span style="font-size: 20px;">비우기</span>';
    clearBtn.style.position = 'sticky';
    clearBtn.style.top = '0';
    clearBtn.style.zIndex = '10';
    clearBtn.style.marginBottom = '8px';
    clearBtn.style.backdropFilter = 'blur(8px)';
    clearBtn.style.WebkitBackdropFilter = 'blur(8px)';
    clearBtn.onclick = () => {
      showCustomConfirm('모든 로그 기록을 비우시겠습니까?\n(경험치 및 오늘의 목표 달성도는 보존됩니다.)', () => {
        todoList.forEach(item => { if (item.status === 'clear') item.isHiddenInLog = true; if (item.subtasks) { item.subtasks.forEach(s => { if (s.status === 'clear') s.isHiddenInLog = true; }); } });
        renderAll();
      });
    };
    container.appendChild(clearBtn);

  } else {
    displayTodos = todos.filter(item => item.status !== 'clear');

    const addBtn = document.createElement('button');
    addBtn.className = 'add-card';
    addBtn.setAttribute('tabindex', '0');
    addBtn.innerHTML = '<span>+</span>';
    addBtn.style.position = 'sticky'; addBtn.style.top = '0'; addBtn.style.zIndex = '10'; addBtn.style.marginBottom = '8px'; addBtn.style.backdropFilter = 'blur(8px)'; addBtn.style.WebkitBackdropFilter = 'blur(8px)';
    addBtn.onclick = () => { const newId = uid(); todoList.push({ id: newId, type: 'todo', title: '', status: 'ready', isEditing: true }); renderAll(); };
    container.appendChild(addBtn);
  }

  displayTodos.forEach(item => {
    const wrapper = document.createElement('div'); wrapper.className = 'todo-item-wrapper draggable-todo-item'; wrapper.dataset.id = item.id; wrapper.style.display = 'flex'; wrapper.style.flexDirection = 'column'; wrapper.style.gap = '4px'; wrapper.style.marginBottom = '4px';
    const isEditing = item.isEditing ? true : false;

    if (!isLogView && !isEditing && item.status !== 'clear') { wrapper.setAttribute('draggable', 'true'); wrapper.addEventListener('dragstart', handleDragStart); wrapper.addEventListener('dragover', handleDragOver); wrapper.addEventListener('drop', handleDrop); wrapper.addEventListener('dragend', handleDragEnd); }

    const card = document.createElement('div'); card.className = 'todo-card' + (item.status === 'clear' ? ' clear' : ''); card.dataset.id = item.id; card.dataset.status = item.status; card.setAttribute('tabindex', '0');

    if (!isLogView) {
      card.onclick = (e) => onCardClick(e, item.id);
      card.ondblclick = (e) => onCardDblClick(e, item.id);
    } else {
      card.onclick = (e) => onLogCardClick(e, item.id);
    }

    const placeholder = isEditing ? '내용을 적고 Enter' : ''; const isEditingAttr = isEditing ? '' : 'readonly'; const cursorStyle = isEditing ? 'text' : 'pointer';

    const tabIndexAttr = isEditing ? '' : 'tabindex="-1"';
    let innerHTML = `<div style="display:flex; align-items:center; width:100%; overflow:hidden;">`;

    if (!isLogView) {
      innerHTML += `
            <span class="drag-handle fold-triangle ${item.isExpanded ? 'expanded' : ''}"
              tabindex="0"
              onclick="window.toggleTodoExpand(event, ${item.id})"
              style="cursor:pointer; pointer-events:auto;">
              ▶
            </span>
          `;
      innerHTML += `
            <button class="folder-add-btn"
              onclick="handleAddSubtask(event, ${item.id})">
              +
            </button>
          `;
    }

    innerHTML += `
          <div class="text-area-wrapper" style="display:flex; flex-direction:column; width:100%; cursor: ${cursorStyle}; pointer-events: none;">
            <input type="text" class="inline-todo-input" data-id="${item.id}" data-type="parent" value="${escapeHTML(item.title || '')}" ${isEditingAttr} ${tabIndexAttr} placeholder="${placeholder}"
              onblur="window.saveTodoTitle(${item.id}, this.value, false);"
              style="pointer-events: ${isEditing ? 'auto' : 'none'};">
          </div>
        </div>`;

    innerHTML += `<div style="display:flex; gap:4px; flex-shrink:0; margin-left:8px;">`;
    if (!isLogView) {
      innerHTML += `<button onclick="event.stopPropagation(); handleTodoAction(${item.id}, 'clear')" id="suc" class="mini-btn">✔</button>
                        <button onclick="event.stopPropagation(); handleTodoAction(${item.id}, 'delete')" id="del" class="mini-btn"><span>X</span></button>`;
    } else {
      innerHTML += `<button onclick="event.stopPropagation(); handleTodoAction(${item.id}, 'delete')" id="del" class="mini-btn"><span>X</span></button>`;
    }
    innerHTML += `</div>`;
    card.innerHTML = innerHTML;

    const inputEl = card.querySelector('.inline-todo-input');
    if (inputEl) {
      inputEl.addEventListener('click', (e) => e.stopPropagation());
      inputEl.addEventListener('dblclick', (e) => e.stopPropagation());
    }

    if (!isLogView && isEditing) { setTimeout(() => { const input = card.querySelector('.inline-todo-input'); if (input) { input.focus(); const val = input.value; input.value = ''; input.value = val; input.setSelectionRange(val.length, val.length); } }, 10); }
    wrapper.appendChild(card);

    if (item.subtasks && item.subtasks.length > 0 && item.isExpanded) {
      const subContainer = document.createElement('div'); subContainer.className = 'subtasks-container';
      item.subtasks.forEach(sub => {
        if (isLogView && sub.isHiddenInLog) return;
        const subCard = document.createElement('div'); subCard.className = 'todo-card subtask-card' + (sub.status === 'clear' ? ' clear' : '');
        subCard.dataset.subid = sub.id;
        subCard.setAttribute('tabindex', '0');
        const subIsEditing = sub.isEditing ? true : false; const subIsEditingAttr = subIsEditing ? '' : 'readonly'; const subPlaceholder = subIsEditing ? '하위 목표 입력' : '';
        const subTabIndexAttr = subIsEditing ? '' : 'tabindex="-1"';
        let subHTML = `<div style="display:flex; align-items:center; width:100%; overflow:hidden;">`;
        subHTML += `<span style="color: rgba(255, 255, 255, 0.6); font-weight: 800; margin-right: 6px; font-size: 14px;">└</span>`;

        subHTML += `<div class="text-area-wrapper" style="display:flex; flex-direction:column; width:100%; cursor: ${subIsEditing ? 'text' : 'pointer'}; pointer-events: none;">
              <input type="text" class="inline-todo-input" data-id="${sub.id}" data-parentid="${item.id}" data-type="sub" value="${escapeHTML(sub.title || '')}" ${subIsEditingAttr} ${subTabIndexAttr} placeholder="${subPlaceholder}"
                onblur="window.saveSubtaskTitle(${item.id}, ${sub.id}, this.value, false);"
                style="pointer-events: ${subIsEditing ? 'auto' : 'none'};">
            </div></div>`;

        subHTML += `<div style="display:flex; gap:4px; flex-shrink:0; margin-left:8px;">`;
        if (!isLogView && sub.status !== 'clear') {
          subHTML += `<button onclick="event.stopPropagation(); handleSubtaskAction(${item.id}, ${sub.id}, 'clear')" id="suc" class="mini-btn">✔</button>
                          <button onclick="event.stopPropagation(); handleSubtaskAction(${item.id}, ${sub.id}, 'delete')" id="del" class="mini-btn" style="padding: 4px 6px; font-size: 11px;">X</button>`;
        } else if (!isLogView && sub.status === 'clear') {
          subHTML += `<span class="subtask-card-clear input">완료</span>`;
          subHTML += `<button onclick="event.stopPropagation(); handleSubtaskAction(${item.id}, ${sub.id}, 'delete')" id="del" class="mini-btn" style="padding: 4px 6px; font-size: 11px; margin-left:4px;">X</button>`;
        } else if (isLogView) {
          subHTML += `<button onclick="event.stopPropagation(); handleSubtaskAction(${item.id}, ${sub.id}, 'delete')" id="del" class="mini-btn" style="padding: 4px 6px; font-size: 11px;">X</button>`;
        }
        subHTML += `</div>`;
        subCard.innerHTML = subHTML;
        if (!isLogView) {
          subCard.ondblclick = (e) => onSubCardDblClick(e, item.id, sub.id);
        }
        if (!isLogView && subIsEditing) { setTimeout(() => { const subInput = subCard.querySelector('.inline-todo-input'); if (subInput) { subInput.focus(); const val = subInput.value; subInput.value = ''; subInput.value = val; subInput.setSelectionRange(val.length, val.length); } }, 10); }
        subContainer.appendChild(subCard);
      });
      wrapper.appendChild(subContainer);
    }
    container.appendChild(wrapper);
  });
  if (isLogView) { if (displayTodos.length === 0) { const emptyDiv = document.createElement('div'); emptyDiv.style.textAlign = 'center'; emptyDiv.style.marginTop = '20px'; emptyDiv.style.color = '#fff'; emptyDiv.style.opacity = '0.6'; emptyDiv.style.fontWeight = '800'; emptyDiv.innerText = '완료된 기록이 없습니다.'; container.appendChild(emptyDiv); } }
}

// 투두 카드 클릭 시 상태 트리거 로직을 정의한다. (자식 요소 토글 기능 포함)
window.onCardClick = function (e, id) {
  if (isDraggingTodoItem) return;
  const item = todoList.find(t => t.id === id);
  if (!item || item.isEditing) return;
  if (item.subtasks && item.subtasks.length > 0) {
    item.isExpanded = !item.isExpanded;
    const tri = e.currentTarget.querySelector('.fold-triangle');
    if (tri) { tri.classList.toggle('expanded', item.isExpanded); setTimeout(renderAll, 200); }
    else renderAll();
  }
};
window.onCardDblClick = function (e, id) { e.preventDefault(); if (window.getSelection) window.getSelection().removeAllRanges(); if (isDraggingTodoItem) return; const item = todoList.find(t => t.id === id); if (!item || item.status === 'clear') return; if (!item.isEditing) window.makeTodoEditable(id); };
window.onLogCardClick = function (e, id) {
  const item = todoList.find(t => t.id === id);
  if (!item) return;
  if (item.subtasks && item.subtasks.length > 0) {
    item.isExpanded = !item.isExpanded;
    const tri = e.currentTarget.querySelector('.fold-triangle');
    if (tri) { tri.classList.toggle('expanded', item.isExpanded); setTimeout(renderAll, 200); }
    else renderAll();
  }
};

// 일일퀘스트 세모(▶) 아이콘 클릭 및 엔터 입력 시 하위 목표 펼침/접기를 수행한다.
window.toggleTodoExpand = function (e, id) {
  e.stopPropagation();
  const item = todoList.find(t => t.id === id);
  if (!item || item.isEditing) return;
  if (item.subtasks && item.subtasks.length > 0) {
    item.isExpanded = !item.isExpanded;
    const tri = e.currentTarget;
    if (tri && tri.classList.contains('fold-triangle')) {
      tri.classList.toggle('expanded', item.isExpanded);
      setTimeout(renderAll, 200);
    } else {
      renderAll();
    }
  }
};

// 폴더(+) 버튼 클릭을 감지하여 새로운 서브태스크 객체를 초기화하고 삽입한다.
window.handleAddSubtask = function (e, parentId) { e.stopPropagation(); const item = todoList.find(t => t.id === parentId); if (!item) return; if (!item.subtasks) item.subtasks = []; const newSubId = uid(); item.subtasks.push({ id: newSubId, title: '', status: 'ready', isEditing: true }); item.isExpanded = true; renderAll(); };
window.onSubCardDblClick = function (e, parentId, subId) { e.preventDefault(); if (window.getSelection) window.getSelection().removeAllRanges(); const item = todoList.find(t => t.id === parentId); if (!item) return; const sub = item.subtasks.find(s => s.id === subId); if (!sub || sub.status === 'clear') return; if (!sub.isEditing) { sub.isEditing = true; renderAll(); } };

// 하위 퀘스트 입력 상태 소실 시 텍스트 검증 및 속성 재설정을 수행한다. 빈칸 시 삭제한다.
window.saveSubtaskTitle = function (parentId, subId, newTitle, restoreFocus) {
  const item = todoList.find(t => t.id === parentId); if (!item) return;
  const subIdx = item.subtasks.findIndex(s => s.id === subId); if (subIdx === -1) return;
  if (newTitle.trim() === '') { item.subtasks.splice(subIdx, 1); }
  else { item.subtasks[subIdx].title = newTitle.trim(); delete item.subtasks[subIdx].isEditing; }

  // 하위 퀘스트가 하나도 남지 않으면 부모 퀘스트를 닫는다.
  if (item.subtasks.length === 0) {
    item.isExpanded = false;
  }

  renderAll();
  if (restoreFocus) {
    setTimeout(() => {
      const subCard = document.querySelector(`.subtask-card[data-subid="${subId}"]`);
      if (subCard) subCard.focus();
      else {
        const parentCard = document.querySelector(`.todo-card[data-id="${parentId}"]`);
        if (parentCard) parentCard.focus();
      }
    }, 30);
  }
};

// 하위 퀘스트 성공 시 소량의 경험치 지급 및 전체 달성도 갱신 확인을 실시한다.
window.handleSubtaskAction = function (parentId, subId, action) { const item = todoList.find(t => t.id === parentId); if (!item) return; const subIdx = item.subtasks.findIndex(s => s.id === subId); if (subIdx === -1) return; if (action === 'clear') { item.subtasks[subIdx].status = 'clear'; const chars = window.Questify.getCharacters(); chars.forEach((c, i) => { window.Questify.gainXP(5, i); }); const allClear = item.subtasks.every(s => s.status === 'clear'); if (allClear) { item.status = 'clear'; chars.forEach((c, i) => { window.Questify.gainXP(20, i); }); } } else if (action === 'delete') { if (isLogView) item.subtasks[subIdx].isHiddenInLog = true; else item.subtasks.splice(subIdx, 1); } if (item.subtasks.length === 0) { item.isExpanded = false; } renderAll(); };

// 메인 퀘스트 텍스트 입력 소실 시 데이터를 배열에 보존하고 시각화 갱신을 지시한다.
window.saveTodoTitle = function (id, newTitle, restoreFocus) {
  const idx = todoList.findIndex(item => item.id === id); if (idx === -1) return;
  if (newTitle.trim() === '') todoList.splice(idx, 1);
  else { todoList[idx].title = newTitle.trim(); delete todoList[idx].isEditing; }
  renderAll();
  if (restoreFocus) {
    setTimeout(() => {
      const card = document.querySelector(`.todo-card[data-id="${id}"]`);
      if (card) card.focus();
      else {
        const addBtn = document.querySelector('.add-card');
        if (addBtn) addBtn.focus();
      }
    }, 30);
  }
};

// 메인 퀘스트의 특정 항목을 강제 편집 모드로 설정하는 유틸리티 메서드이다.
window.makeTodoEditable = function (id) { const idx = todoList.findIndex(item => item.id === id); if (idx !== -1 && todoList[idx].status !== 'clear') { todoList[idx].isEditing = true; renderAll(); } };

// 전체 목표 대비 성공 비율을 분석하여 최상단 프로그레스 바의 퍼센트와 숫자를 동기화한다.
function updateProgressBar() { const todos = todoList.filter(item => item.type === 'todo' && !item.isPastLog); const total = todos.length; const clears = todos.filter(item => item.status === 'clear').length; const percent = total > 0 ? (clears / total) * 100 : 0; document.getElementById('progress-bar-fill').style.width = percent + '%'; document.getElementById('progress-text').innerText = clears + '/' + total; }

// 메인 퀘스트의 완료 또는 제거 지시를 받고 배열 속성 제어 및 경험치 보상을 관할한다.
window.handleTodoAction = function (id, action) { const idx = todoList.findIndex(item => item.id === id); if (idx === -1) return; if (action === 'clear') { todoList[idx].status = 'clear'; if (todoList[idx].subtasks) { todoList[idx].subtasks.forEach(sub => sub.status = 'clear'); } const chars = window.Questify.getCharacters(); chars.forEach((c, i) => { window.Questify.gainXP(20, i); }); } if (action === 'delete') { if (isLogView) { todoList[idx].isHiddenInLog = true; if (todoList[idx].subtasks) { todoList[idx].subtasks.forEach(sub => sub.isHiddenInLog = true); } } else { todoList.splice(idx, 1); } } renderAll(); };

// 이미 등록된 캐릭터 전용 학습 메모의 내용을 수정 모달에 인젝션하는 호출부이다.
window.editMemo = function (memoId, charIdx) {
  const memo = memoStorage.find(m => m.id === memoId);
  if (!memo) return;
  editingMemoId = memoId;
  targetCharIdxForMemo = charIdx;
  const charName = window.Questify.getCharacters()[charIdx]?.name || '캐릭터';
  document.getElementById('notepad-target-char-label').innerText = `[${charName}] 캐릭터의 메모를 수정합니다.`;
  const input = document.getElementById('input-notepad-content');
  input.value = memo.content;

  openSpecificModal('notepad-modal');
  setTimeout(() => { input.focus(); const val = input.value; input.value = ''; input.value = val; input.setSelectionRange(val.length, val.length); }, 50);
};

// 캐릭터 슬롯과 연결된 학습 메모 데이터 배열을 탐색하여 목록 컨테이너에 뿌리는 렌더링 함수이다.
function renderCharMemos(charIdx) {
  const char = window.Questify.getCharacters()[charIdx];
  const charName = char?.name || '캐릭터';
  document.getElementById('char-memo-title').innerText = `[${charName}]의 학습 메모`;

  const qTypes = char?.quizTypes || ['ox', 'multiple', 'short'];
  document.getElementById('quiz-type-ox').checked = qTypes.includes('ox');
  document.getElementById('quiz-type-multiple').checked = qTypes.includes('multiple');
  document.getElementById('quiz-type-short').checked = qTypes.includes('short');

  const container = document.getElementById('char-memo-list');
  container.innerHTML = '';
  const memos = memoStorage.filter(m => m.charIdx === charIdx);
  if (memos.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#666; margin-top:20px; font-size:14px; font-weight:800;">아직 작성된 메모가 없습니다.</div>';
  } else {
    memos.forEach(m => {
      const el = document.createElement('div'); el.style.cssText = 'padding:12px; border:3px solid #000; border-radius:10px; background:#fff; font-size:13px; font-weight:800; display:flex; flex-direction:column; gap:8px; margin-bottom: 4px;'; el.setAttribute('tabindex', '0'); el.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px dashed #ccc; padding-bottom: 4px;"><div style="font-size:10px; color:#999;">${m.date || ''}</div><div style="display:flex; gap:6px;"><button style="border:2px solid #000; border-radius:5px; background:#f59e0b; font-size:11px; font-weight:bold; color:#fff; padding:4px 8px;" onclick="editMemo(${m.id}, ${charIdx})">편집</button><button style="border:2px solid #000; border-radius:5px; background:#ef4444; font-size:11px; font-weight:bold; color:#fff; padding:4px 8px;" onclick="deleteMemo(${m.id}, ${charIdx})">삭제</button></div></div><div class="memo-text" onclick="this.classList.toggle('expanded')" title="클릭하면 내용을 모두 볼 수 있습니다.">${escapeHTML(m.content)}</div>`; container.appendChild(el);
    });
  }
}

window.deleteMemo = function (memoId, charIdx) { showCustomConfirm('이 메모를 삭제하시겠습니까?', () => { memoStorage = memoStorage.filter(m => m.id !== memoId); saveAppData(); renderCharMemos(charIdx); }); }

window.submitNotepad = function () { document.getElementById('btn-submit-notepad').click(); };
document.getElementById('btn-open-notepad').onclick = () => {
  editingMemoId = null;
  const charName = window.Questify.getCharacters()[targetCharIdxForMemo]?.name || '캐릭터';
  document.getElementById('notepad-target-char-label').innerText = `[${charName}] 캐릭터에게 메모를 추가합니다.`;
  document.getElementById('input-notepad-content').value = '';

  openSpecificModal('notepad-modal');
  setTimeout(() => document.getElementById('input-notepad-content').focus(), 50);
};

document.getElementById('btn-submit-notepad').addEventListener('click', () => {
  const content = document.getElementById('input-notepad-content').value.trim();
  if (!content) { showCustomAlert('공부한 내용을 적어주세요!'); return; }

  if (editingMemoId) {
    const idx = memoStorage.findIndex(m => m.id === editingMemoId);
    if (idx !== -1) {
      memoStorage[idx].content = content;
      memoStorage[idx].date = new Date().toLocaleDateString() + ' (수정됨)';
    }
    editingMemoId = null; saveAppData();
    showCustomAlert('메모가 수정되었습니다!', () => { renderCharMemos(targetCharIdxForMemo); openSpecificModal('char-memo-modal'); });
  } else {
    memoStorage.push({ id: uid(), charIdx: targetCharIdxForMemo, content: content, date: new Date().toLocaleDateString() });
    saveAppData();
    showCustomAlert('메모가 저장되었습니다!\n(문제는 시간 경과에 따라 자동으로 생성됩니다.)', () => { renderCharMemos(targetCharIdxForMemo); openSpecificModal('char-memo-modal'); renderAll(); });
  }
});

function saveQuizTypesForChar() {
  if (targetCharIdxForMemo === null || targetCharIdxForMemo === undefined) return;

  const selectedTypes = [];
  if (document.getElementById('quiz-type-ox').checked) selectedTypes.push('ox');
  if (document.getElementById('quiz-type-multiple').checked) selectedTypes.push('multiple');
  if (document.getElementById('quiz-type-short').checked) selectedTypes.push('short');

  if (selectedTypes.length === 0) {
    showCustomAlert('최소 한 개 이상의 퀴즈 유형을 선택해야 합니다!');
    document.getElementById('quiz-type-short').checked = true;
    selectedTypes.push('short');
  }

  const char = window.Questify.getCharacters()[targetCharIdxForMemo];
  if (char) {
    char.quizTypes = selectedTypes;
    window.Questify.saveState();
  }
}
document.getElementById('quiz-type-ox').addEventListener('change', saveQuizTypesForChar);
document.getElementById('quiz-type-multiple').addEventListener('change', saveQuizTypesForChar);
document.getElementById('quiz-type-short').addEventListener('change', saveQuizTypesForChar);

document.getElementById('btn-api-key').addEventListener('click', () => { const currentKey = localStorage.getItem('gemini_api_key') || ''; showCustomPrompt('FactChat Gateway API 키를 입력하세요:', currentKey, (newKey) => { if (newKey !== null && newKey.trim() !== '') { localStorage.setItem('gemini_api_key', newKey.trim()); showCustomAlert('API 키가 저장되었습니다.'); } }); });

function cleanAndParseJSON(rawText) { try { const match = rawText.match(/\[[\s\S]*\]/); if (match) return JSON.parse(match[0]); const objMatch = rawText.match(/\{[\s\S]*\}/); if (objMatch) return [JSON.parse(objMatch[0])]; throw new Error("JSON 배열 형식을 찾을 수 없습니다."); } catch (e) { console.error("JSON 파싱 에러:", e, "원본:", rawText); throw e; } }

async function fetchQuizFromGemini(text, type = 'short') { const apiKey = localStorage.getItem('gemini_api_key'); if (!apiKey) return null; const endpoint = `https://factchat-cloud.mindlogic.ai/v1/gateway/chat/completions/`; let typeStr = '', formatGuide = ''; if (type === 'ox') { typeStr = '진위형 (O/X)'; formatGuide = '{"id": 1, "title": "문제 제목", "content": "질문 내용", "answer": "O", "explanation": "왜 정답인지에 대한 해설"}'; } else if (type === 'multiple') { typeStr = '객관식 4지선다형'; formatGuide = '{"id": 1, "title": "문제 제목", "content": "질문 내용", "options": ["보기1", "보기2", "보기3", "보기4"], "answer": "정답이 되는 보기 텍스트 정확히 일치", "explanation": "왜 정답인지에 대한 해설"}'; } else { typeStr = '주관식 단답형'; formatGuide = '{"id": 1, "title": "문제 제목", "content": "질문 내용", "answer": "정답", "explanation": "해설 내용"}'; } const systemPrompt = `너는 입력받은 학습 노트를 바탕으로 학습 퀴즈를 생성하는 AI다.\n[지시사항]\n1. 문제 유형: ${typeStr}\n2. 난이도: 보통, 생성 문항 수: 1\n3. 순수 JSON 배열만 반환하라. 예: [${formatGuide}]\n주의사항: 'explanation' 필드에 친절한 해설을 포함하라.`; const userPrompt = `학습 노트:\n${text}`; try { const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: "gemini-2.5-flash", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }) }); if (!response.ok) throw new Error('Gateway API 통신 에러'); const resData = await response.json(); const rawText = resData.choices?.[0]?.message?.content; if (!rawText) return null; return cleanAndParseJSON(rawText); } catch (error) { return null; } }

async function gradeWithAI(question, correctAnswer, userAnswer) { const apiKey = localStorage.getItem('gemini_api_key'); if (!apiKey) return null; const endpoint = `https://factchat-cloud.mindlogic.ai/v1/gateway/chat/completions/`; const systemPrompt = `너는 학생의 주관식 답변을 유연하게 채점하는 AI 선생님이다.\n[지시사항]\n1. 학생의 답안이 의미상 정답과 일치하면 정답 처리하라.\n2. 순수 JSON 객체만 반환하라. 예: {"isCorrect": true, "explanation": "해설 내용"}`; const userPrompt = `문제: ${question}\n모범 정답: ${correctAnswer}\n학생 답안: ${userAnswer}`; try { const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model: "gemini-2.5-flash", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }) }); if (!response.ok) throw new Error('Gateway API 통신 에러'); const resData = await response.json(); const rawText = resData.choices?.[0]?.message?.content; if (!rawText) return null; const match = rawText.match(/\{[\s\S]*\}/); if (match) return JSON.parse(match[0]); return null; } catch (error) { return null; } }

// [저장소 렌더링] 저장된 AI 퀴즈를 카드 목록으로 다시 그린다.
function renderStorageList() { const container = document.getElementById('storage-list-container'); container.innerHTML = ''; if (quizStorage.length === 0) { container.innerHTML = '<div style="text-align:center; color:rgba(0,0,0,0.5); font-weight:800; margin-top:30px;">저장된 AI 문제가 없습니다.<br>캐릭터에 메모를 추가해보세요!</div>'; return; } quizStorage.forEach(quiz => { const charName = window.Questify.getCharacters()[quiz.charIdx]?.name || '알 수 없음'; let typeBadge = ''; if (quiz.type === 'ox') typeBadge = '<span style="font-size:10px; color:#ffb3ba; margin-left:4px;">[O/X]</span>'; else if (quiz.type === 'multiple') typeBadge = '<span style="font-size:10px; color:#ffd1ba; margin-left:4px;">[객관식]</span>'; else typeBadge = '<span style="font-size:10px; color:#baffc9; margin-left:4px;">[주관식]</span>'; const card = document.createElement('div'); card.className = 'storage-card'; card.setAttribute('tabindex', '0'); card.innerHTML = `<div class="storage-title">${escapeHTML(quiz.title || '문제')} <span style="font-size:10px; color:#fcd34d;">[${escapeHTML(charName)}]</span>${typeBadge}</div><div class="storage-bottom"><span class="storage-tag">AI 자동 생성 문제</span><div class="storage-actions"><button id="Pdel" class="mini-btn" onclick="deleteQuizFromStorage(${quiz.id})">삭제</button><button id="Bstorage" class="mini-btn" onclick="openSolveModalFromStorage(${quiz.id})">풀기</button></div></div>`; container.appendChild(card); }); }

// [알림 동기화] 퀴즈 존재 여부에 맞춰 로비 캐릭터의 느낌표 표시를 정리한다.
function syncExclamations() { const chars = window.Questify.getCharacters(); let needsUpdate = false; chars.forEach((c, idx) => { const charQuizzes = quizStorage.filter(q => q.charIdx === idx); if (charQuizzes.length === 0 && c.showExclamation) { c.showExclamation = false; needsUpdate = true; } else if (charQuizzes.length > 0 && !c.showExclamation) { c.showExclamation = true; needsUpdate = true; } }); if (needsUpdate) { window.Questify.saveState(); if (typeof renderLobbyCharacters === 'function') renderLobbyCharacters(); } }

setInterval(async () => {
  if (memoStorage.length === 0 || isGeneratingQuiz) return;
  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) return;

  if (Math.random() < 0.5) {
    const randomMemo = memoStorage[Math.floor(Math.random() * memoStorage.length)];
    const chars = window.Questify.getCharacters();
    const targetChar = chars[randomMemo.charIdx];
    const alreadyHasQuiz = quizStorage.some(q => q.charIdx === randomMemo.charIdx);

    if (targetChar && !targetChar.showExclamation && !alreadyHasQuiz) {
      isGeneratingQuiz = true;
      // [퀴즈 유형 계산] 현재 캐릭터가 허용하는 문제 유형 목록을 구한다.
      const availableTypes = (targetChar.quizTypes && targetChar.quizTypes.length > 0) ? targetChar.quizTypes : ['ox', 'multiple', 'short'];
      const quizType = availableTypes[Math.floor(Math.random() * availableTypes.length)];

      const generated = await fetchQuizFromGemini(randomMemo.content, quizType);
      const currentChars = window.Questify.getCharacters();
      const aliveChar = currentChars[randomMemo.charIdx];

      if (!aliveChar) { isGeneratingQuiz = false; return; }

      if (generated && generated.length > 0) {
        const newQuiz = generated[0];
        quizStorage.push({ id: uid(), title: newQuiz.title || "AI 생성 문제", content: newQuiz.question || newQuiz.content || "문제 내용", options: newQuiz.options || [], answer: newQuiz.answer || "자유 응답형", explanation: newQuiz.explanation || "해설이 제공되지 않았습니다.", type: quizType, charIdx: randomMemo.charIdx });
        aliveChar.showExclamation = true;
        saveAppData(); window.Questify.saveState(); window.Questify.updateUI(); renderStorageList();
      }
      isGeneratingQuiz = false;
    }
  }
}, 15000);

window.deleteQuizFromStorage = function (quizId) { showCustomConfirm('이 문제(AI 생성)를 삭제하시겠습니까?', () => { quizStorage = quizStorage.filter(q => q.id !== quizId); syncExclamations(); renderAll(); }); };
window.openSolveModalFromStorage = function (quizId) { const quiz = quizStorage.find(q => q.id === quizId); if (quiz) setupSolveModal(quiz, false); };
window.handleExclamationClick = function (e, charIdx) { e.stopPropagation(); const charQuizzes = quizStorage.filter(q => q.charIdx === charIdx); if (charQuizzes.length === 0) { syncExclamations(); return; } const randomQuiz = charQuizzes[Math.floor(Math.random() * charQuizzes.length)]; setupSolveModal(randomQuiz, true); currentActiveQuiz.isLobbySurprise = true; };

// [풀이 모달 초기화] 선택된 퀴즈를 풀이 화면에 맞게 세팅한다.
function setupSolveModal(quiz, isSurprise) {
  currentActiveQuiz = { ...quiz, isSurprise };
  document.getElementById('solve-quiz-title').innerText = quiz.title;
  document.getElementById('solve-quiz-content').innerText = quiz.content;

  const inputAnswer = document.getElementById('input-solve-answer');
  const oxButtons = document.getElementById('ox-buttons');
  const multipleChoiceButtons = document.getElementById('multiple-choice-buttons');
  const gradeBtn = document.getElementById('btn-grade-problem');

  inputAnswer.classList.add('hidden');
  gradeBtn.classList.add('hidden');
  oxButtons.classList.add('hidden');
  multipleChoiceButtons.classList.add('hidden');

  if (quiz.type === 'ox') {
    oxButtons.classList.remove('hidden');
  } else if (quiz.type === 'multiple') {
    multipleChoiceButtons.classList.remove('hidden');
    multipleChoiceButtons.innerHTML = '';
    if (quiz.options && Array.isArray(quiz.options)) {
      quiz.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'submit-btn';
        btn.style.width = '100%';
        btn.style.textAlign = 'left';
        btn.style.padding = '10px 16px';
        btn.style.background = '#3b82f6';
        btn.style.fontSize = '14px';
        btn.innerText = `${idx + 1}. ${opt}`;
        btn.onclick = () => processGrading(opt);
        multipleChoiceButtons.appendChild(btn);
      });
    }
  } else {
    inputAnswer.classList.remove('hidden');
    gradeBtn.classList.remove('hidden');
    inputAnswer.value = '';
    setTimeout(() => inputAnswer.focus(), 50);
  }

  document.getElementById('solve-input-state').classList.remove('hidden');
  document.getElementById('solve-result-state').classList.add('hidden');
  openSpecificModal('solve-modal');
}

// [채점 처리] 사용자 답안을 비교하고 정답/오답 결과를 출력한다.
async function processGrading(userAnswer) { if (!currentActiveQuiz) return; const resultBox = document.getElementById('solve-result-state'); const inputState = document.getElementById('solve-input-state'); inputState.classList.add('hidden'); resultBox.classList.remove('hidden'); resultBox.className = 'result-good'; resultBox.innerHTML = '<div style="font-size:16px;">채점 중입니다... ✍️</div>'; resultBox.onclick = null; const cleanUserAnswer = String(userAnswer).trim().toLowerCase(); const cleanCorrectAnswer = String(currentActiveQuiz.answer).trim().toLowerCase(); let isCorrect = false, explanation = ""; if (currentActiveQuiz.type === 'ox' || currentActiveQuiz.type === 'multiple') { isCorrect = (cleanUserAnswer === cleanCorrectAnswer); explanation = currentActiveQuiz.explanation || ""; } else { const aiResult = await gradeWithAI(currentActiveQuiz.content, currentActiveQuiz.answer, userAnswer); if (aiResult !== null) { isCorrect = aiResult.isCorrect; explanation = aiResult.explanation || currentActiveQuiz.explanation || ""; } else { isCorrect = (cleanUserAnswer === cleanCorrectAnswer); explanation = currentActiveQuiz.explanation || ""; } } if (!isCorrect) { resultBox.className = 'result-bad'; resultBox.innerHTML = `<div style="margin-bottom: 12px; font-size: 16px;">❌ 틀렸습니다!</div><div style="display:flex; gap: 8px; width: 100%;"><button id="btn-retry" class="submit-btn" style="flex:1; font-size: 14px; padding: 8px; background: #fca5a5; color: #7f1d1d; border: 2px solid #7f1d1d;">다시 풀기</button><button id="btn-show-answer" class="submit-btn" style="flex:1; font-size: 14px; padding: 8px; background: #ef4444; color: #fff; border: 2px solid #7f1d1d;">정답 보기</button></div>`; document.getElementById('btn-retry').onclick = () => { inputState.classList.remove('hidden'); resultBox.classList.add('hidden'); }; document.getElementById('btn-show-answer').onclick = () => { resultBox.innerHTML = `<div style="margin-bottom: 8px;">내가 쓴 답: ${escapeHTML(userAnswer)}</div><div style="color: #b91c1c; font-weight: 900; font-size: 16px; margin-bottom: 12px;">정답: ${escapeHTML(currentActiveQuiz.answer)}</div>${explanation ? `<div style="margin-bottom: 12px; font-size: 13px; color: #7f1d1d; text-align: left; padding: 8px; background: rgba(255,255,255,0.5); border-radius: 8px;"><b>AI 해설:</b> ${escapeHTML(explanation)}</div>` : ''}<button id="btn-close-quiz" class="submit-btn" style="width: 100%; font-size: 14px; padding: 8px;">확인 (닫기)</button>`; document.getElementById('btn-close-quiz').onclick = () => { quizStorage = quizStorage.filter(q => q.id !== currentActiveQuiz.id); syncExclamations(); renderAll(); document.getElementById('modal-overlay').classList.add('hidden'); currentActiveQuiz = null; }; }; return; } resultBox.className = 'result-good'; resultBox.innerHTML = `<div style="margin-bottom: 12px; font-size: 16px;">✅ 정답입니다! 🎉 경험치를 획득했습니다.</div>${explanation ? `<div style="margin-bottom: 12px; font-size: 13px; color: #15803d; text-align: left; padding: 8px; background: rgba(255,255,255,0.5); border-radius: 8px;"><b>AI 해설:</b> ${escapeHTML(explanation)}</div>` : ''}<button id="btn-close-quiz-success" class="submit-btn" style="width: 100%; font-size: 14px; padding: 8px; background: #22c55e;">확인 (닫기)</button>`; if (window.Questify) window.Questify.gainXP(currentActiveQuiz.isSurprise ? 30 : 20, currentActiveQuiz.charIdx); quizStorage = quizStorage.filter(q => q.id !== currentActiveQuiz.id); syncExclamations(); renderAll(); document.getElementById('btn-close-quiz-success').onclick = () => { document.getElementById('modal-overlay').classList.add('hidden'); currentActiveQuiz = null; }; }
document.getElementById('btn-grade-problem').addEventListener('click', () => { const userAnswer = document.getElementById('input-solve-answer').value; processGrading(userAnswer); });
document.getElementById('btn-ox-o').addEventListener('click', () => { processGrading("O"); });
document.getElementById('btn-ox-x').addEventListener('click', () => { processGrading("X"); });

const lobbyContainer = document.getElementById('lobby-container'); const gameScreenBox = document.getElementById('game-screen');
let isCharDragging = false, dragTargetChar = null, charStartX = 0, charStartY = 0, charInitialLeft = 0, charInitialTop = 0, dragMoved = false;

// [파츠 색상] 캐릭터 파츠에 적용할 hue-rotate 필터를 만든다.
function getPartFilter(hueRotateDeg) { return `hue-rotate(${hueRotateDeg}deg)`; }

// [로비 렌더링] 현재 저장된 캐릭터들을 메인 화면에 다시 배치한다.
function renderLobbyCharacters() {
  lobbyContainer.innerHTML = ''; const chars = window.Questify.getCharacters(); if (!chars || chars.length === 0) return;
  chars.forEach((char, idx) => {
    const charWrapper = document.createElement('div'); charWrapper.className = 'lobby-char'; charWrapper.dataset.idx = idx;
    charWrapper.style.left = char.x + '%'; charWrapper.style.top = char.y + '%';
    charWrapper.setAttribute('tabindex', '0');

    let exclamationHTML = ''; if (char.showExclamation) exclamationHTML = `<div class="char-exclamation" onclick="handleExclamationClick(event, ${idx})">!</div>`;
    const requiredXP = window.Questify.getXpRequired(char.level); const xpPercent = requiredXP === Infinity ? 100 : Math.min(100, (char.xp / requiredXP) * 100);

    const crownClass = char.level >= 20 ? 'crown-gold' : (char.level >= 10 ? 'crown-silver' : '');
    const crownImg = char.level >= 10 ? `<div class="char-part-crown-wrapper"><img class="char-part-crown ${crownClass}" src="./Character/crown.svg" alt="왕관" draggable="false"></div>` : '';

    charWrapper.innerHTML = `
          ${exclamationHTML} <div class="char-bubble hidden"></div>
          <div class="char-nameplate"><div class="char-name-text">${escapeHTML(char.name)}</div><div class="char-level-text">Lv.${char.level}</div></div>
          <div class="char-body">
             ${crownImg}
             <img class="char-part-base" src="./Character/chrSD.png" alt="몸" draggable="false">
             <img class="char-part-bottom" src="./Character/chrbottom${char.bottomType}.png" alt="하의" style="filter: ${getPartFilter(char.bottomColor)};" draggable="false">
             <img class="char-part-head" src="./Character/chrhair${char.headType}.png" alt="머리" style="filter: ${getPartFilter(char.headColor)};" draggable="false">
          </div>
          <div class="char-xp-bar-container"><div class="char-xp-bar-fill" style="width: ${xpPercent}%;"></div></div>`;

    charWrapper.addEventListener('mousedown', startCharDrag); charWrapper.addEventListener('touchstart', startCharDrag, { passive: false });
    charWrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        targetCharIdxForMemo = idx; renderCharMemos(idx);
        isMemoOpenedFromSlot = false; // [추가됨] 로비에서 직접 진입했으므로 플래그를 꺼둡니다.
        openSpecificModal('char-memo-modal');
      }
    });
    lobbyContainer.appendChild(charWrapper);
  });
}

// [드래그 시작] 로비 캐릭터를 끌기 위한 초기 좌표를 기록한다.
function startCharDrag(e) { if (gameScreenBox.classList.contains('hidden') || e.target.classList.contains('char-exclamation')) return; isCharDragging = true; dragMoved = false; dragTargetChar = e.currentTarget; const point = e.type.includes('mouse') ? e : e.touches[0]; charStartX = point.clientX; charStartY = point.clientY; charInitialLeft = dragTargetChar.offsetLeft; charInitialTop = dragTargetChar.offsetTop; }

// [드래그 진행] 마우스/터치 이동량에 따라 캐릭터 위치를 갱신한다.
function dragChar(e) { if (!isCharDragging || !dragTargetChar) return; const point = e.type.includes('mouse') ? e : e.touches[0]; if (Math.abs(point.clientX - charStartX) > 5 || Math.abs(point.clientY - charStartY) > 5) dragMoved = true; if (dragMoved) { e.preventDefault(); let newLeft = charInitialLeft + (point.clientX - charStartX); let newTop = charInitialTop + (point.clientY - charStartY); const parentRect = gameScreenBox.getBoundingClientRect(); const rect = dragTargetChar.getBoundingClientRect(); let halfW = rect.width / 2; let halfH = rect.height / 2; if (newLeft - halfW < 0) newLeft = halfW; if (newTop - halfH < 0) newTop = halfH; if (newLeft + halfW > parentRect.width) newLeft = parentRect.width - halfW; if (newTop + halfH > parentRect.height) newTop = parentRect.height - halfH; dragTargetChar.style.left = newLeft + 'px'; dragTargetChar.style.top = newTop + 'px'; } }

// [드래그 종료] 드래그 상태를 정리하고 변경 위치를 저장한다.
function endCharDrag(e) {
  if (!isCharDragging || !dragTargetChar) return;
  isCharDragging = false;
  if (!dragMoved) {
    const clickedIdx = parseInt(dragTargetChar.dataset.idx);
    targetCharIdxForMemo = clickedIdx;
    renderCharMemos(clickedIdx);
    isMemoOpenedFromSlot = false; // [추가됨] 로비에서 드래그 없이 직접 클릭 진입 시 플래그 끄기
    openSpecificModal('char-memo-modal');
    dragTargetChar = null;
    return;
  }
  const parentRect = gameScreenBox.getBoundingClientRect();
  if (parentRect.width === 0 || parentRect.height === 0) {
    dragTargetChar = null;
    return;
  }

  let currentLeft = parseFloat(dragTargetChar.style.left);
  let currentTop = parseFloat(dragTargetChar.style.top);
  const others = Array.from(document.querySelectorAll('.lobby-char')).filter(el => el !== dragTargetChar);
  others.forEach(other => {
    const oLeft = other.offsetLeft;
    const oTop = other.offsetTop;
    const dist = Math.hypot(currentLeft - oLeft, currentTop - oTop);
    if (dist < 50) { currentLeft += 50; currentTop += 50; }
  });

  let pctX = (currentLeft / parentRect.width) * 100;
  let pctY = (currentTop / parentRect.height) * 100;
  if (isNaN(pctX) || pctX < 0) pctX = 50;
  if (isNaN(pctY) || pctY < 0) pctY = 80;

  // 1. 화면 밖 이탈 방지
  pctX = Math.max(2, Math.min(92, pctX));
  pctY = Math.max(5, Math.min(90, pctY));

  // 2. 상단 건물 구역 침범 방지 (y좌표 32% 이하 접근 불가)
  if (pctY < 32) pctY = 32;

  // 3. 중앙 분수대 구역 침범 방지 (타원형 알고리즘)
  const fX = 45;  // 분수대 중심 X
  const fY = 56;  // 분수대 중심 Y
  const fRx = 25; // 가로 반지름
  const fRy = 19; // 세로 반지름
  const dx = pctX - fX;
  const dy = pctY - fY;

  // 만약 분수대(타원) 내부에 드롭했다면 바깥으로 밀어냄
  if ((dx * dx) / (fRx * fRx) + (dy * dy) / (fRy * fRy) < 1) {
    const angle = Math.atan2(dy / fRy, dx / fRx);
    pctX = fX + fRx * Math.cos(angle);
    pctY = fY + fRy * Math.sin(angle);
  }

  dragTargetChar.style.left = pctX + '%';
  dragTargetChar.style.top = pctY + '%';

  const idx = parseInt(dragTargetChar.dataset.idx);
  const chars = window.Questify.getCharacters();
  if (chars[idx]) { chars[idx].x = pctX; chars[idx].y = pctY; window.Questify.saveState(); }
  dragTargetChar = null;
}

document.addEventListener('mousemove', dragChar); document.addEventListener('mouseup', endCharDrag); document.addEventListener('touchmove', dragChar, { passive: false }); document.addEventListener('touchend', endCharDrag); document.addEventListener('touchcancel', endCharDrag); window.addEventListener('blur', endCharDrag);

setInterval(() => { const chars = document.querySelectorAll('.lobby-char'); if (chars.length === 0 || gameScreenBox.classList.contains('hidden')) return; const randomChar = chars[Math.floor(Math.random() * chars.length)]; const idx = parseInt(randomChar.dataset.idx); const charData = window.Questify.getCharacters()[idx]; if (charData && charData.showExclamation) return; const bubble = randomChar.querySelector('.char-bubble'); if (!bubble) return; const lines = ["오늘도 화이팅!", "퀘스트 잊지 않았지?", "메모를 남겨볼까?", "성장하고 있어!"]; bubble.innerText = lines[Math.floor(Math.random() * lines.length)]; bubble.classList.remove('hidden'); setTimeout(() => { bubble.classList.add('hidden'); }, 3000); }, 6000);

const timerDisplay = document.getElementById('timer-display'); const startTimerBtn = document.getElementById('start-timer-btn'); const resetTimerBtn = document.getElementById('reset-timer-btn'); const presetBtns = document.querySelectorAll('.preset-btn');
let totalSeconds = 0; let timerInterval = null; let timerRunning = false; let timerPaused = false; let timerSelectedCharIdx = 0; let targetEndTime = 0; const DIGIT_POSITIONS = [0, 1, 3, 4, 6, 7];

let timerLastTickTime = 0;
let timerXpAccumulator = 0;

// [시간 포맷] 초 단위를 00:00:00 형식 문자열로 바꾼다.
function formatTime(seconds) { const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0'); const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0'); const secs = String(seconds % 60).padStart(2, '0'); return `${hrs}:${mins}:${secs}`; }

// [시간 파싱] 입력 칸의 6자리 숫자를 초 단위로 합산한다.
function totalSecondsFromDigits(digits) { const h = Number(`${digits[0]}${digits[1]}`) || 0; const m = Number(`${digits[2]}${digits[3]}`) || 0; const s = Number(`${digits[4]}${digits[5]}`) || 0; return (h * 3600) + (m * 60) + s; }
// [타이머 반영] 내부 초 값을 화면 표시값에 동기화한다.
function updateDisplays() { timerDisplay.value = formatTime(totalSeconds); }

// [타이머 캐릭터 선택] 타이머에 함께할 캐릭터 목록을 렌더링한다.
function renderTimerCharSelect() {
  const grid = document.getElementById('timer-char-grid'); grid.innerHTML = ''; const chars = window.Questify.getCharacters();
  chars.forEach((char, idx) => {
    const card = document.createElement('div'); card.className = 'timer-char-card'; card.setAttribute('tabindex', '0');
    const crownClass = char.level >= 20 ? 'crown-gold' : (char.level >= 10 ? 'crown-silver' : '');
    const crownImg = char.level >= 10 ? `<div class="char-part-crown-wrapper"><img class="char-part-crown ${crownClass}" src="./Character/crown.svg" alt="왕관" draggable="false"></div>` : '';
    card.innerHTML = `<div class="card-name">${escapeHTML(char.name)}</div><div class="card-level">Lv.${char.level}</div><div class="char-body" style="width: 60px;">${crownImg}<img class="char-part-base" src="./Character/chrSD.png" alt="몸" draggable="false"><img class="char-part-bottom" src="./Character/chrbottom${char.bottomType}.png" alt="하의" style="filter: ${getPartFilter(char.bottomColor)};" draggable="false"><img class="char-part-head" src="./Character/chrhair${char.headType}.png" alt="머리" style="filter: ${getPartFilter(char.headColor)};" draggable="false"></div>`;
    // [선택 완료] 선택한 캐릭터로 타이머 메인 화면에 진입한다.
    const selectAction = () => { timerSelectedCharIdx = idx; updateTimerCharHUD(); document.getElementById('timer-char-select').classList.add('hidden'); document.getElementById('timer-main').classList.remove('hidden'); };
    card.addEventListener('click', selectAction); card.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectAction(); }); grid.appendChild(card);
  });
}

// [타이머 HUD] 선택된 캐릭터의 이름/레벨/경험치 바를 갱신한다.
function updateTimerCharHUD() {
  const chars = window.Questify.getCharacters(); const char = chars[timerSelectedCharIdx]; if (!char) return;
  document.getElementById('timer-char-hud-name').innerText = escapeHTML(char.name); document.getElementById('timer-char-hud-level').innerText = `Lv.${char.level}`;
  const maxXP = window.Questify.getXpRequired(char.level); const xpPercent = maxXP === Infinity ? 100 : Math.min(100, (char.xp / maxXP) * 100); document.getElementById('timer-char-hud-xpfill').style.width = `${xpPercent}%`;
  const charBody = document.getElementById('timer-main-char-body');
  const crownClass = char.level >= 20 ? 'crown-gold' : (char.level >= 10 ? 'crown-silver' : '');
  const crownImg = char.level >= 10 ? `<div class="char-part-crown-wrapper"><img class="char-part-crown ${crownClass}" src="./Character/crown.svg" alt="왕관" draggable="false"></div>` : '';

  // 타이머 메인 캐릭터에 한해서만 머리카락을 조금 올리고 크기를 유지하도록 인라인 스타일을 강제 주입
  charBody.innerHTML = `${crownImg}<img class="char-part-base" src="./Character/chrSD.png" alt="몸" draggable="false"><img class="char-part-bottom" src="./Character/chrbottom${char.bottomType}.png" alt="하의" style="filter: ${getPartFilter(char.bottomColor)};" draggable="false"><img class="char-part-head" src="./Character/chrhair${char.headType}.png" alt="머리" style="filter: ${getPartFilter(char.headColor)}; " draggable="false">`;
}

// [타이머 보상] 경과 시간에 따라 경험치 보너스를 누적 계산한다.
function triggerTimerXpBonus() {
  window.Questify.gainXP(5, timerSelectedCharIdx);
  updateTimerCharHUD();
  const charBody = document.getElementById('timer-main-char-body');
  const floatEl = document.createElement('div');
  floatEl.className = 'xp-floating-text';
  floatEl.innerText = '+5 XP';
  charBody.appendChild(floatEl);
  setTimeout(() => {
    if (floatEl.parentNode) floatEl.parentNode.removeChild(floatEl);
  }, 1200);
}

// [타이머 종료] 완료 시 보상 지급 및 결과 오버레이를 연다.
function onTimerEnd() {
  const chars = window.Questify.getCharacters(); const charBefore = chars[timerSelectedCharIdx]; const levelBefore = charBefore ? charBefore.level : 1;
  window.Questify.gainXP(50, timerSelectedCharIdx);
  updateTimerCharHUD();
  const charAfter = chars[timerSelectedCharIdx]; const levelAfter = charAfter ? charAfter.level : 1; const charName = charAfter ? charAfter.name : '캐릭터';
  document.getElementById('result-char-name').innerText = charName; const lvTextEl = document.getElementById('result-lv-text'); if (levelAfter > levelBefore) { lvTextEl.innerText = `🎉 레벨업! Lv.${levelBefore} ➔ Lv.${levelAfter}`; } else { lvTextEl.innerText = `현재 Lv.${levelAfter}`; } document.getElementById('timer-result-overlay').classList.remove('hidden');
}

document.getElementById('result-btn-memo').addEventListener('click', () => {
  document.getElementById('timer-result-overlay').classList.add('hidden');
  toggleTimerScreen();
  targetCharIdxForMemo = timerSelectedCharIdx;
  const charName = window.Questify.getCharacters()[targetCharIdxForMemo]?.name || '캐릭터';
  document.getElementById('notepad-target-char-label').innerText = `[${charName}] 캐릭터에게 메모를 추가합니다.`;
  document.getElementById('input-notepad-content').value = '';
  isMemoOpenedFromSlot = false; // [추가됨] 타이머 화면에서 메모장으로 바로 넘어올 때도 플래그는 꺼둡니다.
  openSpecificModal('notepad-modal');
});

document.getElementById('result-btn-skip').addEventListener('click', () => { document.getElementById('timer-result-overlay').classList.add('hidden'); });

timerDisplay.addEventListener('keydown', e => { if (timerRunning) { e.preventDefault(); return; } if (['ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key)) return; e.preventDefault(); let digits = timerDisplay.value.replace(/:/g, '').split(''); const start = timerDisplay.selectionStart; if (/\d/.test(e.key)) { let digitIndex = DIGIT_POSITIONS.findIndex(pos => pos >= start); if (digitIndex === -1) digitIndex = 5; digits[digitIndex] = e.key; totalSeconds = totalSecondsFromDigits(digits); updateDisplays(); const nextPos = digitIndex < 5 ? DIGIT_POSITIONS[digitIndex + 1] : DIGIT_POSITIONS[5] + 1; timerDisplay.setSelectionRange(nextPos, nextPos); } else if (e.key === 'Backspace') { let targetIdx = DIGIT_POSITIONS.findIndex(pos => pos >= start) - 1; if (start === timerDisplay.value.length) targetIdx = 5; if (targetIdx >= 0) { digits[targetIdx] = '0'; totalSeconds = totalSecondsFromDigits(digits); updateDisplays(); timerDisplay.setSelectionRange(DIGIT_POSITIONS[targetIdx], DIGIT_POSITIONS[targetIdx]); } } else if (e.key === 'Delete') { const targetIdx = DIGIT_POSITIONS.findIndex(pos => pos >= start); if (targetIdx !== -1) { digits[targetIdx] = '0'; totalSeconds = totalSecondsFromDigits(digits); updateDisplays(); timerDisplay.setSelectionRange(start, start); } } });

// [타이머 시작] 카운트다운을 시작하고 다음 틱을 예약한다.
function startTimer() {
  if (totalSeconds <= 0) return;
  timerRunning = true;
  timerPaused = false;
  startTimerBtn.innerText = '일시정지';
  timerDisplay.disabled = true;
  targetEndTime = Date.now() + (totalSeconds * 1000);

  timerLastTickTime = Date.now();
  timerXpAccumulator = 0;

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const now = Date.now();
    if (timerPaused) {
      timerLastTickTime = now;
      return;
    }

    const delta = now - timerLastTickTime;
    timerLastTickTime = now;
    timerXpAccumulator += delta;

    if (timerXpAccumulator >= 5000) {
      timerXpAccumulator -= 5000;
      triggerTimerXpBonus();
    }

    const remaining = Math.round((targetEndTime - now) / 1000);
    if (remaining > 0) {
      totalSeconds = remaining;
      updateDisplays();
    } else {
      totalSeconds = 0;
      updateDisplays();
      stopTimer();
      onTimerEnd();
    }
  }, 200);
}

// [타이머 중지] 진행 중인 타이머를 안전하게 멈춘다.
function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
  timerPaused = false;
  startTimerBtn.innerText = '시작';
  timerDisplay.disabled = false;
  timerXpAccumulator = 0;
}

startTimerBtn.addEventListener('click', () => { if (timerRunning) { timerPaused = !timerPaused; startTimerBtn.innerText = timerPaused ? '계속' : '일시정지'; if (!timerPaused) { targetEndTime = Date.now() + (totalSeconds * 1000); timerLastTickTime = Date.now(); } } else { startTimer(); } });
resetTimerBtn.addEventListener('click', () => { stopTimer(); totalSeconds = 0; updateDisplays(); });
presetBtns.forEach(btn => { btn.addEventListener('click', () => { const addSecs = parseInt(btn.dataset.time, 10); if (timerRunning && !timerPaused) { targetEndTime += addSecs * 1000; totalSeconds = Math.round((targetEndTime - Date.now()) / 1000); } else { totalSeconds += addSecs; } updateDisplays(); }); });

let dragSrcEl = null;
// [할일 드래그] 투두 항목의 드래그를 시작한다.
function handleDragStart(e) { isDraggingTodoItem = true; dragSrcEl = this; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', this.dataset.id); setTimeout(() => { this.style.opacity = '0'; }, 0); }
// [할일 드래그] 드래그 중인 항목의 삽입 위치를 계산한다.
function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragSrcEl && this !== dragSrcEl && this.classList.contains('draggable-todo-item')) { const children = Array.from(this.parentNode.querySelectorAll('.draggable-todo-item')); if (children.indexOf(dragSrcEl) < children.indexOf(this)) { this.after(dragSrcEl); } else { this.before(dragSrcEl); } } return false; }
// [할일 드롭] 드롭 이벤트 기본 동작을 제어한다.
function handleDrop(e) { e.stopPropagation(); e.preventDefault(); return false; }
// [할일 정렬 저장] 드래그 결과를 배열 순서에 반영한다.
function handleDragEnd(e) { this.style.opacity = '1'; dragSrcEl = null; const container = document.getElementById('quest-list-container'); const wrappers = Array.from(container.querySelectorAll('.draggable-todo-item')); const domOrderIds = []; wrappers.forEach(w => { const id = parseInt(w.dataset.id); if (!domOrderIds.includes(id)) domOrderIds.push(id); }); todoList.sort((a, b) => { const idxA = domOrderIds.indexOf(a.id); const idxB = domOrderIds.indexOf(b.id); if (idxA !== -1 && idxB !== -1) return idxA - idxB; if (idxA !== -1 && idxB === -1) return -1; if (idxA === -1 && idxB !== -1) return 1; return 0; }); saveAppData(); renderAll(); setTimeout(() => { isDraggingTodoItem = false; }, 100); }

const mobileToggleBtn = document.getElementById('mobile-toggle-btn'); const appContainer = document.querySelector('.app'); mobileToggleBtn.addEventListener('click', () => { appContainer.classList.toggle('mobile-menu-open'); });

const gameScreen = document.getElementById('game-screen'); const timerScreen = document.getElementById('timer-screen'); const openTimerBtn = document.getElementById('open-timer-btn'); const closeTimerBtn = document.getElementById('close-timer-btn'); const closeTimerSelectBtn = document.getElementById('close-timer-select-btn');

// [화면 전환] 게임 화면과 타이머 화면을 서로 전환한다.
function toggleTimerScreen() { if (timerScreen.classList.contains('hidden')) { gameScreen.classList.add('hidden'); timerScreen.classList.remove('hidden'); openTimerBtn.style.background = '#d1d5db'; document.getElementById('timer-main').classList.add('hidden'); document.getElementById('timer-char-select').classList.remove('hidden'); renderTimerCharSelect(); } else { timerScreen.classList.add('hidden'); gameScreen.classList.remove('hidden'); openTimerBtn.style.background = 'transparent'; } }

closeTimerBtn.addEventListener('click', toggleTimerScreen); closeTimerSelectBtn.addEventListener('click', toggleTimerScreen);
[document.getElementById('user-profile-card'), document.getElementById('tab-quest'), document.getElementById('tab-storage')].forEach(el => { if (el) { el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.click(); } }); } });
const tabQuest = document.getElementById('tab-quest'); const panelQuest = document.getElementById('panel-quest'); const tabStorage = document.getElementById('tab-storage'); const panelStorage = document.getElementById('panel-storage'); tabStorage.addEventListener('click', () => { panelQuest.classList.add('hidden'); panelStorage.classList.remove('hidden'); tabStorage.classList.add('active'); tabQuest.classList.remove('active'); }); tabQuest.addEventListener('click', () => { panelStorage.classList.add('hidden'); panelQuest.classList.remove('hidden'); tabQuest.classList.add('active'); tabStorage.classList.remove('active'); });

document.getElementById('user-profile-card').addEventListener('click', () => { renderSlotInventory(); openSpecificModal('slot-modal'); });

window.randomizeChar = function (idx) {
  const char = window.Questify.getCharacters()[idx];
  if (!char) return;
  char.headType = Math.floor(Math.random() * 5) + 1;
  char.bottomType = Math.floor(Math.random() * 2) + 1;
  char.headColor = Math.floor(Math.random() * 360);
  char.bottomColor = Math.floor(Math.random() * 360);
  window.Questify.saveState();
  window.Questify.updateUI();
  renderSlotInventory();
}

// [슬롯 렌더링] 캐릭터 관리 슬롯 목록을 다시 그린다.
function renderSlotInventory() {
  const chars = window.Questify.getCharacters();
  const container = document.getElementById('slot-manager-container');
  const unionLevelDisplay = document.getElementById('union-level-display');
  if (unionLevelDisplay) unionLevelDisplay.innerText = '전체 유니온 Lv.' + window.Questify.getUnionLevel();
  container.innerHTML = '';

  chars.forEach((char, index) => {
    const slotCard = document.createElement('div');
    slotCard.className = 'slot-card';
    slotCard.setAttribute('tabindex', '0');
    const maxXP = window.Questify.getXpRequired(char.level);
    const xpText = maxXP === Infinity ? 'MAX' : maxXP;
    const xpPercent = maxXP === Infinity ? 100 : Math.min(100, (char.xp / maxXP) * 100);

    slotCard.innerHTML = `  <div class="slot-head">    <span>${escapeHTML(char.name)}</span>    ${char.level >= 50 ? '<span class="badge gold">졸업</span>' : ''}
          <span style="font-size:11px; color:#374151; font-weight:700;">Lv.${char.level}</span>  </div>  <div style="position:relative; width:100%; display:flex; justify-content:center; align-items:center;">    <button class="slot-dice-btn" onclick="window.randomizeChar(${index})" title="외형 랜덤 변경">      <img src="./changeIcon.png" alt="주사위" style="width:24px; height:24px; display:block;" onerror="this.parentElement.innerText='🎲'; this.style.display='none';">    </button>    <div class="slot-char-img char-body">      <img class="char-part-base" src="./Character/chrSD.png" alt="몸" draggable="false">      <img class="char-part-bottom" src="./Character/chrbottom${char.bottomType}.png" alt="하의" style="filter: ${getPartFilter(char.bottomColor)};" draggable="false">      <img class="char-part-head" src="./Character/chrhair${char.headType}.png" alt="머리" style="filter: ${getPartFilter(char.headColor)};" draggable="false">    </div>  </div>  <div style="width:100%; font-size:10px; color:#374151; font-weight:700; text-align:center;">경험치: ${char.xp} / ${xpText} XP</div>  <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.1); border: 1px solid rgba(0,0,0,0.2); border-radius: 4px; overflow: hidden;"><div style="width: ${xpPercent}%; height: 100%; background: #3b82f6; transition: width 0.3s;"></div></div>  <div class="slot-card-btns">    <button class="slot-rename-btn" onclick="window.renameChar(${index})">이름 변경</button>    <button class="slot-delete-btn" onclick="window.deleteChar(${index})">삭제</button>  </div>`;

    // 1. 캐릭터 슬롯 마우스 클릭 시 동작
    slotCard.addEventListener('click', (e) => {
      if (e.target.closest('.slot-dice-btn') ||
        e.target.closest('.slot-rename-btn') ||
        e.target.closest('.slot-delete-btn')) {
        return;
      }
      targetCharIdxForMemo = index;
      renderCharMemos(index);
      // [추가됨] 슬롯 창에서 메모장으로 넘어갔음을 전역 변수에 기록하여,
      // 나중에 메모장을 닫을 때 다시 슬롯 창으로 돌아오도록 상태를 만듭니다.
      isMemoOpenedFromSlot = true;
      openSpecificModal('char-memo-modal');
    });

    // 2. 키보드(Enter)를 이용해 캐릭터 슬롯을 선택했을 때 동작
    slotCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        targetCharIdxForMemo = index;
        renderCharMemos(index);
        // [추가됨] 키보드로 진입할 때도 동일하게 이전 창 상태를 기록합니다.
        isMemoOpenedFromSlot = true;
        openSpecificModal('char-memo-modal');
      }
    });

    container.appendChild(slotCard);
  });

  document.getElementById('btn-add-new-character').onclick = () => {
    const suggestedName = generateUniqueBirdName();
    showCustomPrompt('새로운 카테고리(캐릭터) 이름을 입력하세요:', suggestedName, (newName) => {
      if (!newName || !newName.trim()) newName = suggestedName;

      let randomX = Math.floor(Math.random() * 60) + 20;
      let randomY = Math.floor(Math.random() * 40) + 40;

      // 새 캐릭터 생성 시 분수대 위에 스폰되지 않도록 겹침 방지 보정
      const fX = 50, fY = 62, fRx = 20, fRy = 14;
      const dx = randomX - fX;
      const dy = randomY - fY;
      if ((dx * dx) / (fRx * fRx) + (dy * dy) / (fRy * fRy) < 1) {
        randomY = fY + fRy + 5;
      }

      const newChar = { name: newName.trim().substring(0, 10), level: 1, xp: 0, x: randomX, y: randomY, showExclamation: false, quizTypes: ['ox', 'multiple', 'short'] };
      window.Questify.initCharParts(newChar);
      chars.push(newChar);
      window.Questify.saveState();
      window.Questify.updateUI();
      renderSlotInventory();
    });
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const btnResetAllData = document.getElementById('btn-reset-all-data');
  const confirmOverlay = document.getElementById('confirm-overlay');
  const confirmCancel = document.getElementById('confirm-cancel');
  const confirmOk = document.getElementById('confirm-ok');

  if (!btnResetAllData || !confirmOverlay || !confirmCancel || !confirmOk) return;

  // [전체 삭제 확인] 확인 모달을 띄우는 핸들러이다.
  const openConfirm = () => confirmOverlay.classList.remove('hidden');
  // [전체 삭제 확인] 확인 모달을 닫는 핸들러이다.
  const closeConfirm = () => confirmOverlay.classList.add('hidden');

  // [전체 초기화] 저장된 모든 데이터와 상태를 지운다.
  const resetAllData = () => {
    localStorage.clear();
    location.reload();
  };

  btnResetAllData.onclick = openConfirm;
  confirmCancel.onclick = closeConfirm;
  confirmOk.onclick = () => {
    closeConfirm();
    resetAllData();
  };

  confirmOverlay.onclick = (e) => {
    if (e.target === confirmOverlay) closeConfirm();
  };
});

window.renameChar = function (idx) { if (!window.Questify.getCharacters()[idx]) return; const currentName = window.Questify.getCharacters()[idx].name; showCustomPrompt('새로운 캐릭터 이름을 입력하세요:', currentName, (newName) => { if (newName && newName.trim()) { window.Questify.getCharacters()[idx].name = newName.trim().substring(0, 10); window.Questify.saveState(); window.Questify.updateUI(); renderSlotInventory(); } }); }

window.deleteChar = function (idx) {
  const chars = window.Questify.getCharacters();
  if (chars.length <= 1) {
    showCustomAlert('캐릭터는 반드시 1명 이상 존재해야 합니다.');
    return;
  }
  showCustomConfirm('이 캐릭터를 정말 삭제하시겠습니까?\n(해당 캐릭터의 메모와 AI 퀴즈도 함께 삭제됩니다.)', () => {
    chars.splice(idx, 1);
    quizStorage = quizStorage.filter(q => q.charIdx !== idx);
    memoStorage = memoStorage.filter(m => m.charIdx !== idx);

    quizStorage.forEach(q => { if (q.charIdx > idx) q.charIdx--; });
    memoStorage.forEach(m => { if (m.charIdx > idx) m.charIdx--; });

    const __maxIdx = chars.length - 1;
    if (targetCharIdxForMemo > __maxIdx) targetCharIdxForMemo = __maxIdx;
    if (timerSelectedCharIdx > __maxIdx) timerSelectedCharIdx = __maxIdx;
    if (targetCharIdxForMemo < 0) targetCharIdxForMemo = 0;
    if (timerSelectedCharIdx < 0) timerSelectedCharIdx = 0;

    saveAppData();
    window.Questify.saveState();
    window.Questify.updateUI();
    renderSlotInventory();
    renderAll();
  });
}

/* --------------------------------------------------------------------------
   [2-11] DOM 요소 간 포커스 갇힘 픽스 및 키보드 방향키 전용 네비게이션 제어 모듈이다.
   -------------------------------------------------------------------------- */
document.addEventListener('keydown', function (e) {
  if (e.isComposing || e.keyCode === 229) return;

  const key = e.key;
  const active = document.activeElement;

  if (active && active.tagName === 'TEXTAREA') {
    if (key === 'Escape') {
      e.preventDefault();
      if (active.id === 'input-notepad-content') {
        document.getElementById('btn-submit-notepad').click();
      }
    }
    return;
  }

  if (active && active.tagName === 'INPUT') {
    if (key === 'Enter') {
      e.preventDefault();
      active.blur();
    }
    return;
  }

  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) return;
  e.preventDefault();

  if (key === 'Enter') {
    if (active && active !== document.body) {
      if (active.classList.contains('todo-card') || active.classList.contains('subtask-card')) {
        active.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      } else if (active.id === 'open-timer-btn') {
        toggleTimerScreen();
      } else {
        active.click();
      }
    }
    return;
  }

  let container = document.body;
  const dialog = document.getElementById('dialog-overlay');
  const modal = document.getElementById('modal-overlay');
  const timer = document.getElementById('timer-screen');

  if (!dialog.classList.contains('hidden')) {
    container = Array.from(dialog.children).find(c => !c.classList.contains('hidden')) || dialog;
  } else if (!modal.classList.contains('hidden')) {
    container = Array.from(modal.children).find(c => !c.classList.contains('hidden')) || modal;
  } else if (!timer.classList.contains('hidden')) {
    if (!document.getElementById('timer-char-select').classList.contains('hidden')) {
      container = document.getElementById('timer-char-select');
    } else if (!document.getElementById('timer-result-overlay').classList.contains('hidden')) {
      container = document.getElementById('timer-result-overlay');
    } else {
      container = timer;
    }
  } else {
    container = document.querySelector('.app');
  }

  const selectors = 'button:not([tabindex="-1"]), input:not([tabindex="-1"]), textarea:not([tabindex="-1"]), select:not([tabindex="-1"]), [tabindex="0"]';
  let focusable = Array.from(container.querySelectorAll(selectors)).filter(el => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || el.disabled) return false;
    let curr = el;
    while (curr && curr !== document.body) {
      const style = window.getComputedStyle(curr);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      curr = curr.parentElement;
    }
    return true;
  });

  if (!focusable.includes(active)) {
    if (focusable.length > 0) focusable[0].focus();
    return;
  }

  const activeRect = active.getBoundingClientRect();
  const center1 = { x: activeRect.left + activeRect.width / 2, y: activeRect.top + activeRect.height / 2 };

  let bestMatch = null;
  let minDistance = Infinity;

  focusable.forEach(el => {
    if (el === active) return;
    const rect = el.getBoundingClientRect();
    const center2 = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    let dx = center2.x - center1.x;
    let dy = center2.y - center1.y;
    let isValidDir = false;

    if (key === 'ArrowUp' && dy < 0 && Math.abs(dy) >= Math.abs(dx) * 0.3) isValidDir = true;
    if (key === 'ArrowDown' && dy > 0 && Math.abs(dy) >= Math.abs(dx) * 0.3) isValidDir = true;
    if (key === 'ArrowLeft' && dx < 0 && Math.abs(dx) >= Math.abs(dy) * 0.3) isValidDir = true;
    if (key === 'ArrowRight' && dx > 0 && Math.abs(dx) >= Math.abs(dy) * 0.3) isValidDir = true;

    if (isValidDir) {
      let penalty = 0;
      if (key === 'ArrowUp' || key === 'ArrowDown') penalty = Math.abs(dx) * 5;
      if (key === 'ArrowLeft' || key === 'ArrowRight') penalty = Math.abs(dy) * 5;

      let dist = Math.sqrt(dx * dx + dy * dy) + penalty;

      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = el;
      }
    }
  });

  if (bestMatch) {
    bestMatch.focus({ preventScroll: true });
    bestMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
});

// 시스템 가이드(물음표 호버) UI를 템플릿화하여 동적으로 생성 후 문서 트리에 주입하는 유틸리티이다.
function initSystemGuide() {
  if (document.getElementById('questify-guide-module')) return;
  const guideHTML = `    <div id="questify-guide-module" style="position: fixed; bottom: 20px; left: 20px; z-index: 9999;">      <div class="guide-tooltip">        <h4>🎮 Questify 시스템 가이드</h4>        <p style="margin-bottom: 10px;">할 일을 달성하고 퀴즈를 풀며 나만의 캐릭터를 성장시키는 방치형 스터디 RPG입니다!</p>        <div class="guide-rewards">          <div style="color: #059669;">📝 하위 퀘스트 완료: <b>모든 캐릭터</b> +5 XP</div>          <div style="color: #2563eb;">🔥 부모 퀘스트 완료: <b>모든 캐릭터</b> +20 XP</div>          <div style="color: #7c3aed;">💡 일반 퀴즈 정답: <b>해당 캐릭터</b> +20 XP</div>          <div style="color: #dc2626;">🎁 돌발(느낌표) 정답: <b>해당 캐릭터</b> +30 XP</div>          <div style="color: #d97706;">⏳ 타이머 유지/완료: <b>해당 캐릭터</b> +5 XP / +50 XP</div>        </div>        <p class="guide-footer">※ 캐릭터 머리 위의 느낌표(!)를 클릭해 문제를 풀어보세요</p>      </div>      <div class="guide-icon">?</div>    </div>  `;
  const styleHTML = `    <style>      #questify-guide-module .guide-tooltip {        display: none; position: absolute; bottom: 35px; left: 0; width: 300px;        background: #fff; border: 3px solid #000; border-radius: 10px; padding: 12px;        box-shadow: 4px -4px 0px #000; font-family: inherit;      }      #questify-guide-module .guide-tooltip h4 {        margin: 0 0 8px 0; font-size: 15px; color: #1e3a8a; font-weight: 900;        border-bottom: 2px dashed #000; padding-bottom: 4px;      }      #questify-guide-module .guide-tooltip p {        margin: 0 0 8px 0; font-size: 12px; line-height: 1.4; color: #374151; font-weight: 800;      }      #questify-guide-module .guide-rewards {        background: #f3f4f6; border: 2px solid #000; border-radius: 6px; padding: 6px;        font-size: 11px; font-weight: 800; display: flex; flex-direction: column; gap: 4px;      }      #questify-guide-module .guide-footer {        margin: 8px 0 0 0 !important; font-size: 10px !important; color: #6b7280 !important;        text-align: center; font-weight: 700 !important;      }      #questify-guide-module .guide-icon { margin-bottom : 45px;      width: 28px; height: 28px; background: #f59e0b; color: #fff; border: 3px solid #000;        border-radius: 50%; display: flex; align-items: center; justify-content: center;        font-weight: 900; font-size: 16px; cursor: help;      }      #questify-guide-module:hover .guide-tooltip, #questify-guide-module.show-guide .guide-tooltip { display: block; }      #questify-guide-module .guide-icon:hover {        background: #d97706; transform: scale(1.1); transition: transform 0.1s ease;      }    </style>  `;
  document.body.insertAdjacentHTML('beforeend', guideHTML + styleHTML);
  const __gm = document.getElementById('questify-guide-module');
  if (__gm) {
    const __gi = __gm.querySelector('.guide-icon');
    if (__gi) __gi.addEventListener('click', (ev) => { ev.stopPropagation(); __gm.classList.toggle('show-guide'); });
    document.addEventListener('click', (ev) => { if (!__gm.contains(ev.target)) __gm.classList.remove('show-guide'); });
  }
}
initSystemGuide();

// [이름 생성] 중복되지 않는 캐릭터 이름을 자동 추천한다.
function generateUniqueBirdName() {
  const birds = ["새폴더", "직박구리", "멧비둘기", "가마우지", "종다리", "찌르레기", "오목눈이"];
  const existingNames = window.Questify.getCharacters().map(c => c.name);

  const availableBirds = birds.filter(b => !existingNames.includes(b));
  if (availableBirds.length > 0) {
    return availableBirds[Math.floor(Math.random() * availableBirds.length)];
  }

  let counter = 1;
  while (true) {
    const availableWithCounter = birds.map(b => `${b}(${counter})`).filter(name => !existingNames.includes(name));

    if (availableWithCounter.length > 0) {
      return availableWithCounter[Math.floor(Math.random() * availableWithCounter.length)];
    }
    counter++;
  }
}

loadAppData(); renderAll();