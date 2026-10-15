# QUESTIFY DESIGN SYSTEM (v0.4)

## 1. Color

- primary: #91775D
- primary-dark: #634E41
- primary-darker: #372F29

- accent: #F8CF2D
- danger: #B22634
- success: #54DA16

- background: #FFFFFF
- surface: #F3F4F6

---

## 2. Spacing

- base: 8px
- sm: 4px
- md: 8px
- lg: 16px

---

## 3. Typography

- font: JejuGothic

- title: text-lg ~ text-xl
- body: text-xs ~ text-sm
- small: text-[10px]

- weight:
  - regular: 400
  - bold: 700

- text-stroke:
  - sm: 1.2px black
  - md: 2px black
  - lg: 5px black

---

## 4. Border & Radius

- border:
  - base: 2px solid black
  - strong: 3~4px solid black

- radius:
  - sm: rounded
  - md: rounded-lg
  - pill: rounded-full

---

## 5. Shadow & Effect

- pressed:
  - active: scale-95
  - active: translate-y-[1px]

---

## 6. Core Pattern (공통 구조)

### Card

- border + radius + background
- 내부 요소를 담는 기본 컨테이너

---

### ProgressBar

- container (border + radius)
- background (dark layer)
- shadow layer (상단 하이라이트)
- fill (width: % 기반)
- highlight (ellipse)

👉 Daily Goal / Level 공통 사용

---

### Action Button

- flex center
- border + radius
- inset shadow (입체감)
- Highlight Ellipse 포함

#### variants
- primary / accent / danger

---

### Highlight Ellipse

- position: absolute
- shape: ellipse
- background: rgba(255,255,255,0.1~0.2)
- pointer-events: none

---

### Overlay Layer

- position: absolute
- inset: 0
- pointer-events: none

👉 completed / modal / dim 등에 사용

---

## 7. Components

---

### Daily Goal Gauge

- ProgressBar 사용
- color: blue (#2EADE3)
- label: center

---

### Player HUD (Level Card)

- Card 사용
- 내부:
  - name
  - level text
  - ProgressBar (success)

---

### QuestCard

- Card 기반
- layout: flex / between / center

#### 상태

- default
  - primary-dark

- completed
  - primary-darker
  - inset shadow only
  - text opacity 감소

#### Completed Overlay

- Overlay Layer 사용
- text:
  - CLEAR
  - rotate / scale / opacity 적용

---

### Add Quest Button

- Action Button 변형
- 중앙 정렬
- opacity 낮음

#### Plus Icon
- 가로 div
- 세로 div

---

### Bottom Tab Button

- Card + Action Button 혼합 구조

#### 구성
- icon
- text
- bottom highlight ellipse

#### 상태

- active
  - 밝은 배경
  - icon 100%

- inactive
  - 어두운 배경
  - icon opacity 감소

---

### Timer

- SVG 기반

#### 구조
- outer circle
- progress path

---

### Modal

- Overlay Layer + Card 조합

#### Container
- background: #F8EFE6
- border: 5px solid black
- radius: 20px

#### 내부
- input box
- content area
- Action Button (large)

---

### Floating Timer Button

- Action Button (circle variant)

---

### Tag (Subject)

- small pill 형태
- background: #47647C

---

### Close Button

- circle + X
- red background
- inner highlight

---

## 8. Layout System

---

### App Frame

- flex
- 좌측: 60%
- 우측: 40%

---

### Game Screen

- position: relative
- overflow hidden

#### 포함
- Daily Goal
- Player HUD
- Character
- Speech Bubble

---

### Quest Panel

- flex column

#### 구조
- header
- scroll content
- bottom tabs (fixed)

---

## 9. Interaction Rules

- hover:
  - brightness 증가

- active:
  - scale + translate

- disabled:
  - opacity 감소
  - pointer-events none

---

## 10. State System

- default
- hover
- active
- disabled
- completed

👉 모든 컴포넌트 공통 적용

---

## 11. 핵심 구조 요약

👉 전체 UI는 아래 5개로 구성됨

1. Card
2. ProgressBar
3. Action Button
4. Highlight Ellipse
5. Overlay Layer

## 12. Component Mapping (HTML 기준)

### AppFrame
- root container
- flex layout

---

### LeftPanel (#left-panel)

- GameScreen (#game-screen)
- TimerScreen (#timer-screen)
- ModalOverlay (#modal-overlay)

---

### GameScreen

- Daily Goal
- Player HUD
- Character (#draggable-character)

---

### TimerScreen

- overlay screen
- Timer Display
- Preset Buttons
- Control Buttons

---

### ModalOverlay

- Create Modal (#create-modal)
- Solve Modal (#solve-modal)

---

### RightPanel (#right-panel-wrapper)

- Quest Panel (#panel-quest)
- Storage Panel (#panel-storage)

---

### Quest Panel

- Quest List (scroll)
- Add Button (+)
- QuestCard (반복)

---

### Storage Panel

- Problem List
- Tag (Subject)
- Action Button (다시풀기)

---

### Bottom Tabs

- tab-quest
- tab-storage

---

### Floating Timer Button (#open-timer-btn)

- circle button
- Timer entry point


👉 새로운 UI는 “새로 만들지 말고 조합”
:::

---

# ✅ 뭐가 정리됐냐 (핵심)

### 1. ProgressBar 중복 제거 ✅
- Daily Goal / Level → Core로 이동

### 2. Button 통합 ✅
- 성공/실패/모달/탭 → Action Button

### 3. Overlay 통합 ✅
- CLEAR / Modal / Dim → 하나로

### 4. Layout 중복 제거 ✅
- Frame / Panel / Screen 합침

### 5. 상태 시스템 통합 ✅
- 따로따로 쓰던 상태 → 하나로

---