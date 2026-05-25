let quests = [
  { id: 1, name: '인터넷 프로그래밍 과제하기', done: false, isEditing: false },
  { id: 2, name: '자바 반복문 예제 복습하기', done: false, isEditing: false },
  { id: 3, name: 'HTML/CSS 레이아웃 연습', done: false, isEditing: false }
];
let nextQuestId = 4;

document.addEventListener('DOMContentLoaded', () => {
  renderQuests();
});

// 리스트 순서 변경 드래그 기능 함수
function initListDrag() {
  const container = document.getElementById('quest-list-active');
  const items = container.querySelectorAll('.quest-item');

  items.forEach(item => {
    item.addEventListener('dragstart', () => {
      if (item.querySelector('.quest-edit-input')) return;
      setTimeout(() => item.classList.add('dragging'), 0);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      saveNewOrder();
    });
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggingItem = container.querySelector('.dragging');
    if (!draggingItem) return;

    const siblings = [...container.querySelectorAll('.quest-item:not(.dragging)')];
    const nextSibling = siblings.find(sibling => {
      return e.clientY <= sibling.getBoundingClientRect().top + sibling.offsetHeight / 2;
    });

    if (nextSibling == null) {
      container.appendChild(draggingItem);
    } else {
      container.insertBefore(draggingItem, nextSibling);
    }
  });
}

// 화면 순서를 데이터 배열에 동기화
function saveNewOrder() {
  const activeList = document.getElementById('quest-list-active');
  const renderedIds = [...activeList.querySelectorAll('.quest-item')].map(item => 
    parseInt(item.getAttribute('data-id'))
  );

  const activeQuests = [];
  renderedIds.forEach(id => {
    const q = quests.find(item => item.id === id);
    if (q) activeQuests.push(q);
  });

  const completedQuests = quests.filter(q => q.done);
  quests = [...activeQuests, ...completedQuests];
}

// 퀘스트 리스트 화면에 그리기
function renderQuests() {
  const activeList = document.getElementById('quest-list-active');
  const completedList = document.getElementById('quest-list-completed');
  
  activeList.innerHTML = '';
  completedList.innerHTML = '';

  quests.forEach(quest => {
    const card = document.createElement('div');
    card.className = `quest-item ${quest.done ? 'completed' : ''}`;
    card.setAttribute('data-id', quest.id);
    
    // 진행중일 때만 목록 내 드래그 활성화
    if (!quest.done && !quest.isEditing) {
      card.setAttribute('draggable', 'true');
    }
    
    // 1. 텍스트 영역 출력 분기 (수정 모드 여부)
    let textSectionHTML = '';
    if (quest.isEditing) {
      textSectionHTML = `
        <div class="quest-text-block">
          <input type="text" class="quest-edit-input" id="input-edit-${quest.id}" value="${escapeHtml(quest.name)}">
        </div>
      `;
    } else {
      textSectionHTML = `
        <div class="quest-text-block">
          <span class="quest-name-text">${escapeHtml(quest.name)}</span>
        </div>
      `;
    }

    let actionButtonsHTML = '';
    let optionsMenuHTML = '';

    if (!quest.done) {
      // 2. [진행 중] 하단 간편 버튼 (완료 / 실패)
      if (!quest.isEditing) {
        actionButtonsHTML = `
          <div class="quest-action-row">
            <button class="quest-box-btn" onclick="toggleQuestStatus(${quest.id})">완료</button>
            <button class="quest-box-btn" onclick="failQuest(${quest.id})">실패</button>
          </div>
        `;
      }

      // 3. [진행 중] 더보기 메뉴 (수정 / 삭제)
      optionsMenuHTML = `
        <button class="quest-opt-trigger" onclick="toggleQuestMenu(event, ${quest.id})">◦◦◦</button>
        <div class="quest-opt-menu" id="opt-menu-${quest.id}">
          ${quest.isEditing ? 
            `<button class="quest-opt-item" onclick="saveQuestEdit(${quest.id})">저장</button>` : 
            `<button class="quest-opt-item" onclick="enableQuestEdit(${quest.id})">수정</button>`
          }
          <button class="quest-opt-item" onclick="deleteQuest(${quest.id})">삭제</button>
        </div>
      `;
    } else {
      // 4. [완료 상태] 하단 버튼은 깨끗하게 지우기
      actionButtonsHTML = '';

      // 5. [완료 상태] 더보기 메뉴 복구 및 변경 (완료 취소 / 삭제)
      optionsMenuHTML = `
        <button class="quest-opt-trigger" onclick="toggleQuestMenu(event, ${quest.id})">◦◦◦</button>
        <div class="quest-opt-menu" id="opt-menu-${quest.id}">
          <button class="quest-opt-item" onclick="toggleQuestStatus(${quest.id})">완료 취소</button>
          <button class="quest-opt-item" onclick="deleteQuest(${quest.id})">삭제</button>
        </div>
      `;
    }

    card.innerHTML = textSectionHTML + actionButtonsHTML + optionsMenuHTML;

    if (quest.done) {
      completedList.appendChild(card);
    } else {
      activeList.appendChild(card);
    }

    if (quest.isEditing) {
      const inputEl = document.getElementById(`input-edit-${quest.id}`);
      inputEl.focus();
      
      inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') saveQuestEdit(quest.id);
        if (e.key === 'Escape') { quest.isEditing = false; renderQuests(); }
      });
      
      inputEl.addEventListener('blur', () => {
        setTimeout(() => { saveQuestEdit(quest.id); }, 150);
      });
    }
  });

  initListDrag();
}

function addQuest() {
  quests.push({ id: nextQuestId++, name: '새 퀘스트 ' + (nextQuestId - 4), done: false, isEditing: false });
  renderQuests();
}

function enableQuestEdit(id) {
  closeAllQuestMenus();
  const quest = quests.find(q => q.id === id);
  if (quest) {
    quest.isEditing = true;
    renderQuests();
  }
}

function saveQuestEdit(id) {
  const quest = quests.find(q => q.id === id);
  const inputEl = document.getElementById(`input-edit-${id}`);
  if (quest && inputEl) {
    const updatedVal = inputEl.value.trim();
    if (updatedVal) quest.name = updatedVal;
    quest.isEditing = false;
    renderQuests();
  }
}

function failQuest(id) {
  quests = quests.filter(q => q.id !== id);
  renderQuests();
}

function deleteQuest(id) {
  closeAllQuestMenus();
  quests = quests.filter(q => q.id !== id);
  renderQuests();
}

function toggleQuestStatus(id) {
  closeAllQuestMenus();
  const quest = quests.find(q => q.id === id);
  if (quest) {
    quest.done = !quest.done;
    quest.isEditing = false;
  }
  renderQuests();
}

function toggleQuestMenu(e, id) {
  e.stopPropagation();
  const targetMenu = document.getElementById(`opt-menu-${id}`);
  if (!targetMenu) return;
  const isAlreadyShown = targetMenu.classList.contains('show');
  closeAllQuestMenus();
  if (!isAlreadyShown) targetMenu.classList.add('show');
}

function closeAllQuestMenus() {
  document.querySelectorAll('.quest-opt-menu').forEach(menu => menu.classList.remove('show'));
}

document.addEventListener('click', closeAllQuestMenus);

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}