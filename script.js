function toggleMenu() {
  const menu = document.getElementById('systemMenu');
  menu.classList.toggle('translate-y-full');
}

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleTimerBtn');
  const leftFrame = document.getElementById('leftFrame');
  const leftViewport = document.getElementById('leftViewport');
  const gameWorld = document.getElementById('gameWorld');
  const timerPanel = document.getElementById('timerPanel');
  const timerDisplay = document.getElementById('timerDisplay');
  const playTimeDisplay = document.getElementById('playTimeDisplay');
  const startTimerBtn = document.getElementById('startTimerBtn');
  const resetTimeBtn = document.getElementById('resetTimeBtn');
  const glitchBand = document.getElementById('glitchBand');
  const failScreen = document.getElementById('failScreen');
  const successScreen = document.getElementById('successScreen');
  const dimOverlay = document.getElementById('dimOverlay');
  const dialogPortrait = document.getElementById('dialogPortrait');
  const dialogContainer = document.getElementById('dialogContainer');
  const dialogText = document.getElementById('dialogText');
  const presetBtns = document.querySelectorAll('.presetBtn');

  let isTimerOpen = false;
  let timerRunning = false;
  let timerPaused = false;
  let isLocked = false;
  let timerInterval = null;
  let totalSeconds = 60;
  let isApplyingMask = false;
  let noSignalInterval = null;
  let transitionBusy = false;

  const DIGIT_POSITIONS = [0, 1, 3, 4, 6, 7];

  function formatTime(seconds) {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }

  function totalSecondsFromDigits(digits) {
    const h = Number(`${digits[0]}${digits[1]}`) || 0;
    const m = Number(`${digits[2]}${digits[3]}`) || 0;
    const s = Number(`${digits[4]}${digits[5]}`) || 0;
    return (h * 3600) + (m * 60) + s;
  }

  function digitsToFormattedValue(digits) {
    return `${digits[0]}${digits[1]}:${digits[2]}${digits[3]}:${digits[4]}${digits[5]}`;
  }

  function charPosToDigitIndexForInsert(pos) {
    if (pos <= 0) return 0;
    if (pos === 1) return 1;
    if (pos <= 3) return 2;
    if (pos === 4) return 3;
    if (pos <= 6) return 4;
    return 5;
  }

  function charPosToDigitIndexForBackspace(pos) {
    switch (pos) {
      case 0: return 0;
      case 1: return 0;
      case 2: return 1;
      case 3: return 1;
      case 4: return 2;
      case 5: return 3;
      case 6: return 3;
      case 7: return 4;
      case 8: return 5;
      default: return 5;
    }
  }

  function charPosToDigitIndexForDelete(pos) {
    if (pos <= 0) return 0;
    if (pos === 1) return 1;
    if (pos === 2) return 2;
    if (pos === 3) return 2;
    if (pos === 4) return 3;
    if (pos === 5) return 4;
    if (pos === 6) return 4;
    return 5;
  }

  function digitIndexToCharPos(index) {
    const clamped = Math.max(0, Math.min(5, index));
    return DIGIT_POSITIONS[clamped];
  }

  function nextCharPosAfterDigitIndex(index) {
    if (index >= 5) return 8;
    return DIGIT_POSITIONS[index + 1];
  }

  function selectedDigitIndices(start, end) {
    const indices = [];
    DIGIT_POSITIONS.forEach((charPos, digitIndex) => {
      if (charPos >= start && charPos < end) {
        indices.push(digitIndex);
      }
    });
    return indices;
  }

  function applyDigitsAndUpdate(digits, caretCharPos = null) {
    totalSeconds = totalSecondsFromDigits(digits);

    isApplyingMask = true;
    const formatted = digitsToFormattedValue(digits);
    timerDisplay.value = formatted;
    playTimeDisplay.innerText = formatted;
    isApplyingMask = false;

    if (caretCharPos !== null) {
      requestAnimationFrame(() => {
        try {
          timerDisplay.setSelectionRange(caretCharPos, caretCharPos);
        } catch (_) {}
      });
    }
  }

  function updateDisplays() {
    const formatted = formatTime(totalSeconds);
    isApplyingMask = true;
    timerDisplay.value = formatted;
    playTimeDisplay.innerText = formatted;
    isApplyingMask = false;
  }

  function setDefaultDialogue() {
    dialogPortrait.classList.remove('hidden');
    dialogContainer.classList.remove('justify-center', 'items-center');
    dialogContainer.classList.add('justify-between');
    dialogText.className = 'text-sm lg:text-base ml-[1vw]';
    dialogText.innerHTML = `
      대화 내용이 들어가는 자리입니다.<br>
      초상화는 좌측에, 화살표는 우측 하단에 위치합니다.
    `;
  }

  function setNoSignalDialogue() {
    dialogPortrait.classList.add('hidden');
    dialogContainer.classList.remove('justify-between');
    dialogContainer.classList.add('justify-center', 'items-center');
    dialogText.className = 'text-red-500 text-center text-2xl lg:text-4xl font-bold tracking-[0.4em] w-full ml-0';
    dialogText.innerHTML = 'NO SIGNAL';
  }

  function startNoSignalLoop() {
    stopNoSignalLoop();
    noSignalInterval = setInterval(() => {
      if (!isTimerOpen || isLocked) return;
      glitchBand.classList.add('active', 'animate-tracking');
      dialogText.classList.add('animate-noSignal', 'opacity-70');
      setTimeout(() => {
        glitchBand.classList.remove('animate-tracking', 'active');
        dialogText.classList.remove('animate-noSignal', 'opacity-70');
      }, 240);
    }, 3900);
  }

  function stopNoSignalLoop() {
    if (noSignalInterval) {
      clearInterval(noSignalInterval);
      noSignalInterval = null;
    }
  }

  function runLeftGlitchTransition(nextState) {
    if (transitionBusy) return;
    transitionBusy = true;

    leftFrame.classList.add('animate-glitch');
    leftViewport.classList.add('animate-glitch');
    glitchBand.classList.add('active', 'animate-tracking');

    setTimeout(() => {
      if (typeof nextState === 'function') nextState();
    }, 300);

    setTimeout(() => {
      leftFrame.classList.remove('animate-glitch');
      leftViewport.classList.remove('animate-glitch');
      glitchBand.classList.remove('animate-tracking', 'active');
      transitionBusy = false;
    }, 650);
  }

  function showOverlay(type) {
    isLocked = true;
    stopNoSignalLoop();
    dimOverlay.classList.remove('hidden');
    dimOverlay.classList.add('pointer-events-auto');
    startTimerBtn.classList.add('opacity-30');

    if (type === 'success') {
      successScreen.classList.remove('hidden');
      successScreen.classList.add('flex');
    } else {
      failScreen.classList.remove('hidden');
      failScreen.classList.add('flex');
    }
  }

  function hideOverlay() {
    dimOverlay.classList.add('hidden');
    dimOverlay.classList.remove('pointer-events-auto');
    startTimerBtn.classList.remove('opacity-30');

    failScreen.classList.add('hidden');
    failScreen.classList.remove('flex');

    successScreen.classList.add('hidden');
    successScreen.classList.remove('flex');

    isLocked = false;
  }

  function resetToDefault() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerPaused = false;
    stopNoSignalLoop();

    totalSeconds = 60;
    updateDisplays();

    startTimerBtn.innerText = '시작';

    hideOverlay();

    timerPanel.classList.add('hidden');
    timerPanel.classList.remove('flex');

    gameWorld.classList.remove('hidden');

    isTimerOpen = false;
    toggleBtn.innerText = '▶';

    setDefaultDialogue();
  }

  function startTimer() {
    timerRunning = true;
    timerPaused = false;

    startTimerBtn.innerText = '포기할래요.';

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      if (timerPaused) return;

      if (totalSeconds > 0) {
        totalSeconds--;
        updateDisplays();
      }

      if (totalSeconds <= 0) {
        totalSeconds = 0;
        updateDisplays();

        clearInterval(timerInterval);
        timerInterval = null;

        timerRunning = false;
        timerPaused = false;

        startTimerBtn.innerText = '시작';
        showOverlay('success');
      }
    }, 1000);
  }

  function getCurrentDigits() {
    return timerDisplay.value.replace(/:/g, '').split('');
  }

  function commitMaskEdit(newDigits, caretDigitIndex = 0, moveAfter = false) {
    const caretPos = moveAfter ? nextCharPosAfterDigitIndex(caretDigitIndex) : digitIndexToCharPos(caretDigitIndex);
    applyDigitsAndUpdate(newDigits, caretPos);
  }

  function handleMaskedInsert(text) {
    const digits = getCurrentDigits();
    const dataDigits = (text || '').replace(/\D/g, '');
    if (!dataDigits.length) return;

    const start = timerDisplay.selectionStart ?? 0;
    const end = timerDisplay.selectionEnd ?? start;
    const selected = start !== end ? selectedDigitIndices(start, end) : [];

    let targetIndex = selected.length ? selected[0] : charPosToDigitIndexForInsert(start);
    let lastWrittenIndex = targetIndex;

    for (const ch of dataDigits) {
      digits[targetIndex] = ch;
      lastWrittenIndex = targetIndex;
      if (targetIndex < 5) {
        targetIndex++;
      }
    }

    commitMaskEdit(digits, lastWrittenIndex, true);
  }

  function handleMaskedDelete(kind) {
    const digits = getCurrentDigits();
    const start = timerDisplay.selectionStart ?? 0;
    const end = timerDisplay.selectionEnd ?? start;
    const selected = start !== end ? selectedDigitIndices(start, end) : [];

    let caretCharPos = 0;

    if (selected.length) {
      for (const idx of selected) {
        digits[idx] = '0';
      }
      caretCharPos = digitIndexToCharPos(selected[0]);
    } else {
      const idx = kind === 'backspace'
        ? charPosToDigitIndexForBackspace(start)
        : charPosToDigitIndexForDelete(start);

      digits[idx] = '0';
      caretCharPos = digitIndexToCharPos(idx);
    }

    totalSeconds = totalSecondsFromDigits(digits);
    isApplyingMask = true;
    const formatted = digitsToFormattedValue(digits);
    timerDisplay.value = formatted;
    playTimeDisplay.innerText = formatted;
    isApplyingMask = false;

    requestAnimationFrame(() => {
      try {
        timerDisplay.setSelectionRange(caretCharPos, caretCharPos);
      } catch (_) {}
    });
  }

  updateDisplays();

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isLocked) return;
      totalSeconds = Number(btn.dataset.time);
      updateDisplays();
    });
  });

  timerDisplay.addEventListener('beforeinput', (e) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }

    if (e.inputType === 'insertText' || e.inputType === 'insertFromPaste') {
      e.preventDefault();
      handleMaskedInsert(e.data || '');
      return;
    }

    if (e.inputType === 'deleteContentBackward') {
      e.preventDefault();
      handleMaskedDelete('backspace');
      return;
    }

    if (e.inputType === 'deleteContentForward') {
      e.preventDefault();
      handleMaskedDelete('delete');
      return;
    }
  });

  timerDisplay.addEventListener('keydown', (e) => {
    if (isLocked) {
      e.preventDefault();
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      handleMaskedDelete('backspace');
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      handleMaskedDelete('delete');
      return;
    }
  });

  timerDisplay.addEventListener('input', () => {
    if (isLocked || isApplyingMask) return;
    const digits = timerDisplay.value.replace(/:/g, '').replace(/\D/g, '').split('');
    if (digits.length !== 6) {
      const current = getCurrentDigits();
      totalSeconds = totalSecondsFromDigits(current);
      updateDisplays();
      return;
    }
    applyDigitsAndUpdate(digits, timerDisplay.selectionStart ?? 0);
  });

  resetTimeBtn.addEventListener('click', () => {
    if (isLocked) return;
    totalSeconds = 0;
    updateDisplays();
    requestAnimationFrame(() => {
      try {
        timerDisplay.setSelectionRange(0, 0);
      } catch (_) {}
    });
  });

  startTimerBtn.addEventListener('click', () => {
    if (isLocked) return;

    if (!timerRunning) {
      startTimer();
      return;
    }

    clearInterval(timerInterval);
    timerInterval = null;

    timerRunning = false;
    timerPaused = false;

    totalSeconds = 60;
    updateDisplays();

    startTimerBtn.innerText = '시작';

    showOverlay('fail');
  });

  toggleBtn.addEventListener('click', () => {
    if (isLocked || transitionBusy) return;

    const open = !isTimerOpen;

    runLeftGlitchTransition(() => {
      isTimerOpen = open;

      if (isTimerOpen) {
        gameWorld.classList.add('hidden');

        timerPanel.classList.remove('hidden');
        timerPanel.classList.add('flex');

        setNoSignalDialogue();
        startNoSignalLoop();

        if (timerRunning) {
          timerPaused = false;
          toggleBtn.innerText = '⏸';
        } else {
          toggleBtn.innerText = '▶';
        }

      } else {
        stopNoSignalLoop();
        gameWorld.classList.remove('hidden');

        timerPanel.classList.add('hidden');
        timerPanel.classList.remove('flex');

        setDefaultDialogue();

        if (timerRunning) {
          timerPaused = true;
          toggleBtn.innerText = '▶';
        } else {
          toggleBtn.innerText = '▶';
        }
      }
    });
  });

  failScreen.addEventListener('click', resetToDefault);
  successScreen.addEventListener('click', resetToDefault);
});
