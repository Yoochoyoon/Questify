# triangle-toggle — 일일퀘스트 폴더 세모(▶) 토글

담당: 김한
내용: 기존 드래그 핸들 `≡`(바 3개) → 세모(▶) 교체. 펼치면 90° 회전(▼).
변경 파일: `index.html`(2곳), `style.css`(1곳 추가)

조장님: 최신 index.html / style.css 에 아래 3개를 적용해 주세요.

---

## ① index.html — 세모 마크업 교체

`renderTodoList()` 안, 드래그 핸들/+버튼 생성 부분.

### 찾기
```javascript
if (!isLogView) { innerHTML += `<span class="drag-handle" style="cursor:grab;">≡</span>`; innerHTML += `<button class="folder-add-btn" onclick="handleAddSubtask(event, ${item.id})">+</button>`; } else { if (item.subtasks && item.subtasks.length > 0) { innerHTML += `<span style="margin-right:8px; color:gray; font-size:18px;">${item.isExpanded ? '-' : '+'}</span>`; } }
```

### 교체
```javascript
if (!isLogView) {
  // ≡(바 3개) → 세모(▶). 펼침이면 .expanded 로 90° 회전(▼)
  innerHTML += `<span class="drag-handle fold-triangle${item.isExpanded ? ' expanded' : ''}" style="cursor:grab;">▶</span>`;
  innerHTML += `<button class="folder-add-btn" onclick="handleAddSubtask(event, ${item.id})">+</button>`;
} else {
  if (item.subtasks && item.subtasks.length > 0) {
    // 로그 뷰의 +/- 도 세모로 통일
    innerHTML += `<span class="fold-triangle${item.isExpanded ? ' expanded' : ''}" style="margin-right:8px; color:gray;">▶</span>`;
  }
}
```

---

## ② index.html — 클릭 시 회전 애니메이션

`window.onCardClick`, `window.onLogCardClick` 두 함수 교체.

### 찾기
```javascript
    window.onCardClick = function(e, id) { if (isDraggingTodoItem) return; const item = todoList.find(t => t.id === id); if (!item) return; if (item.isEditing) return; if (item.subtasks && item.subtasks.length > 0) { item.isExpanded = !item.isExpanded; renderAll(); } };
```

### 교체
```javascript
    window.onCardClick = function(e, id) {
      if (isDraggingTodoItem) return;
      const item = todoList.find(t => t.id === id);
      if (!item || item.isEditing) return;
      if (item.subtasks && item.subtasks.length > 0) {
        item.isExpanded = !item.isExpanded;
        // 세모를 먼저 회전시킨 뒤 목록 갱신
        const tri = e.currentTarget.querySelector('.fold-triangle');
        if (tri) { tri.classList.toggle('expanded', item.isExpanded); setTimeout(renderAll, 200); }
        else renderAll();
      }
    };
```

### 찾기
```javascript
    window.onLogCardClick = function(e, id) { const item = todoList.find(t => t.id === id); if (!item) return; if (item.subtasks && item.subtasks.length > 0) { item.isExpanded = !item.isExpanded; renderAll(); } };
```

### 교체
```javascript
    window.onLogCardClick = function(e, id) {
      const item = todoList.find(t => t.id === id);
      if (!item) return;
      if (item.subtasks && item.subtasks.length > 0) {
        item.isExpanded = !item.isExpanded;
        const tri = e.currentTarget.querySelector('.fold-triangle');
        if (tri) { tri.classList.toggle('expanded', item.isExpanded); setTimeout(renderAll, 200); }
        else renderAll();
      }
    };
```

---

## ③ style.css — 세모 회전 스타일 추가 (맨 아래)

```css
/* 일일퀘스트 폴더 토글 세모 아이콘 */
.fold-triangle {
  display: inline-block;
  margin-right: 8px;
  font-size: 12px;
  transition: transform 0.2s ease;   /* 회전 애니메이션 */
  transform: rotate(0deg);           /* 접힘: ▶ */
  user-select: none;
}
.fold-triangle.expanded {
  transform: rotate(90deg);          /* 펼침: ▼ */
}
```

---

동작: 세모 누르면 0.2초 회전 후 하위 항목이 펼쳐짐.

확인 요청:
- 하위 항목 없는 단일 퀘스트에도 ▶ 표시됨(드래그 핸들 겸용). 폴더에만 띄우려면 ①에 `subtasks` 조건 추가.
- 세모가 드래그 핸들 겸하므로 드래그/클릭 충돌 없는지 확인.
