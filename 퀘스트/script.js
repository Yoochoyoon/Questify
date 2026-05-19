const questTitle = document.getElementById('questTitle');   
const questType = document.getElementById('questType');     
const questLevel = document.getElementById('questLevel');   
const createBtn = document.getElementById('createBtn');     
const questList = document.getElementById('questList');     

const tabOnGoing = document.getElementById('tabOnGoing');
const tabClear = document.getElementById('tabClear');
const tabFail = document.getElementById('tabFail');

let currentTab = '진행중';


createBtn.addEventListener('click', function() {

    const titleValue = questTitle.value;
    const typeValue = questType.value;
    const levelValue = questLevel.value;

    if (titleValue.trim() == "") {
        alert("퀘스트 이름을 입력하세요");
        return;
    }

    console.log("입력된 이름:", titleValue);
    console.log("선택된 종류:", typeValue);
    console.log("선택된 난이도:", levelValue);

    const newCard = document.createElement('div');
    newCard.classList.add('quest-card');

    newCard.innerHTML = `
    <h4>${titleValue}</h4>
    <p>종류: ${typeValue} | 난이도: ${levelValue}</p>
    <button class="complete-btn">완료</button>
    <button class="fail-btn">실패</button>
    `;

    questList.appendChild(newCard);

    const completeBtn = newCard.querySelector('.complete-btn');
    const failBtn = newCard.querySelector('.fail-btn');

    completeBtn.addEventListener('click', function() {
        alert(`'${titleValue}' 퀘스트를 완료했습니다`);
        newCard.classList.add('clear-state');
        refreshQuests();
    });

    failBtn.addEventListener('click', function() {
        alert(`'${titleValue}' 퀘스트를 실패했습니다`);
        newCard.classList.add('fail-state');
        refreshQuests();
    });

    questTitle.value = "";
});


function refreshQuests() {
    const allCards = document.querySelectorAll('.quest-card');
    
    allCards.forEach(function(card) {
        const isClear = card.classList.contains('clear-state');
        const isFail = card.classList.contains('fail-state');
        const isGoing = !isClear && !isFail;

        if (currentTab === '진행중' && isGoing) {
            card.style.display = 'block';           
        }
        else if (currentTab === '클리어' && isClear) {
            card.style.display = 'block';
        }
        else if (currentTab === '실패' && isFail) {
            card.style.display = 'block';
        }
        else {
            card.style.display = 'none';
        }
    });
}


tabOnGoing.addEventListener('click', function(){
    currentTab = '진행중';
    refreshQuests();
});

tabClear.addEventListener('click', function(){
    currentTab = '클리어';
    refreshQuests();
});

tabFail.addEventListener('click', function(){
    currentTab = '실패';
    refreshQuests();
});