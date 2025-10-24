class MathGame {
    constructor() {
        this.currentLevel = 1;
        this.score = 0;
        this.streak = 0;
        this.currentQuestion = null;
        this.timer = null;
        this.timeLeft = 60;
        this.correctAnswers = 0;
        this.totalQuestions = 0;
        this.questionsPerLevel = 10;
        this.currentCategory = '';
        this.questionCount = 0;
        this.isPaused = false;
        this.answerHistory = [];
        
        this.initializeElements();
        this.bindEvents();
        this.loadProgress();
    }

    initializeElements() {
        // 獲取DOM元素
        this.levelSelect = document.getElementById('level-select');
        this.gameArea = document.getElementById('game-area');
        this.levelComplete = document.getElementById('level-complete');
        
        this.currentLevelEl = document.getElementById('current-level');
        this.scoreEl = document.getElementById('score');
        this.streakEl = document.getElementById('streak');
        
        this.num1El = document.getElementById('num1');
        this.operatorEl = document.getElementById('operator');
        this.num2El = document.getElementById('num2');
        this.answerEl = document.getElementById('answer');
        
        this.submitBtn = document.getElementById('submit-btn');
        this.skipBtn = document.getElementById('skip-btn');
        this.backBtn = document.getElementById('back-btn');
        this.nextBtn = document.getElementById('next-btn');
        
        this.feedback = document.getElementById('feedback');
        this.feedbackText = document.getElementById('feedback-text');
        
        this.timerFill = document.getElementById('timer-fill');
        this.timeLeftEl = document.getElementById('time-left');
        
        this.correctCountEl = document.getElementById('correct-count');
        this.totalCountEl = document.getElementById('total-count');
        this.accuracyEl = document.getElementById('accuracy');
        
        this.nextLevelBtn = document.getElementById('next-level-btn');
        this.retryBtn = document.getElementById('retry-btn');
        this.menuBtn = document.getElementById('menu-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resumeBtn = document.getElementById('resume-btn');
        this.backToMultModeBtn = document.getElementById('back-to-mult-mode');
        
        // 安全地創建結束練習按鈕
        this.finishBtn = document.createElement('button');
        this.finishBtn.textContent = '結束練習';
        this.finishBtn.className = 'btn btn-success';
        this.finishBtn.style.marginLeft = '12px';
        this.finishBtn.addEventListener('click', () => this.showHistoryModal());
        
        // 安全地插入到 controls 區塊
        const controls = document.querySelector('.controls');
        if (controls) {
            controls.appendChild(this.finishBtn);
        }
        
        // 建立歷史 modal
        this.createHistoryModal();
    }

    bindEvents() {
        // 關卡選擇事件
        document.querySelectorAll('.category').forEach(category => {
            category.addEventListener('click', (e) => {
                this.currentCategory = e.currentTarget.dataset.category;
                this.startLevel();
            });
        });
        
        // 全屏卡片選擇事件
        document.querySelectorAll('.fullscreen-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.currentCategory = e.currentTarget.dataset.category;
                this.startLevel();
            });
        });

        // 遊戲控制事件 - 添加空值檢查
        if (this.submitBtn) this.submitBtn.addEventListener('click', () => this.checkAnswer());
        if (this.skipBtn) this.skipBtn.addEventListener('click', () => this.skipQuestion());
        if (this.backBtn) this.backBtn.addEventListener('click', () => this.showLevelSelect());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.nextQuestion());

        // 答案輸入事件
        if (this.answerEl) {
            this.answerEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.checkAnswer();
                }
            });
        }

        // 關卡完成事件
        if (this.nextLevelBtn) this.nextLevelBtn.addEventListener('click', () => this.nextLevel());
        if (this.retryBtn) this.retryBtn.addEventListener('click', () => this.retryLevel());
        if (this.menuBtn) this.menuBtn.addEventListener('click', () => this.showLevelSelect());

        if(this.pauseBtn && this.resumeBtn) {
            this.pauseBtn.addEventListener('click', () => this.pauseTimer());
            this.resumeBtn.addEventListener('click', () => this.resumeTimer());
        }
        if(this.backToMultModeBtn) {
            this.backToMultModeBtn.addEventListener('click', () => {
                if (this.gameArea) this.gameArea.classList.add('hidden');
                // 顯示選擇要練習的乘數 modal
                const modal = document.getElementById('choose-mult-table-select');
                if(modal) {
                    modal.classList.remove('hidden');
                } else if(window.startMultiplicationPractice) {
                    window.startMultiplicationPractice('choose');
                }
            });
        }
    }

    loadProgress() {
        const savedProgress = localStorage.getItem('mathGameProgress');
        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            this.currentLevel = progress.currentLevel || 1;
            this.score = progress.score || 0;
            this.updateProgressDisplay();
        }
    }

    saveProgress() {
        const progress = {
            currentLevel: this.currentLevel,
            score: this.score,
            timestamp: Date.now()
        };
        localStorage.setItem('mathGameProgress', JSON.stringify(progress));
    }

    updateProgressDisplay() {
        if (this.currentLevelEl) this.currentLevelEl.textContent = this.currentLevel;
        if (this.scoreEl) this.scoreEl.textContent = this.score;
        if (this.streakEl) this.streakEl.textContent = this.streak;
        this.updateQuestionNumber();
    }

    updateQuestionNumber() {
        const qNum = document.getElementById('current-question');
        if (qNum) qNum.textContent = this.questionCount + 1;
    }

    startLevel() {
        this.hideAllScreens();
        this.gameArea.classList.remove('hidden');
        this.gameArea.classList.add('fade-in');
        this.correctAnswers = 0;
        this.totalQuestions = 0;
        this.questionCount = 0;
        this.answerHistory = [];
        this.isPaused = false;
        if(this.pauseBtn && this.resumeBtn) {
            this.pauseBtn.style.display = '';
            this.resumeBtn.style.display = 'none';
        }
        // 顯示header關卡
        if(this.currentLevelEl && this.currentLevelEl.parentNode) this.currentLevelEl.parentNode.style.display = '';
        if(this.backToMultModeBtn) this.backToMultModeBtn.classList.add('hidden');
        this.generateQuestion();
        this.startTimer();
        this.answerEl.focus();
    }

    generateQuestion() {
        let question;
        // 其他練習
        question = this.createQuestion();
        this.currentQuestion = question;
        this.num1El.textContent = question.num1;
        this.operatorEl.textContent = question.operator;
        this.num2El.textContent = question.num2;
        this.answerEl.value = '';
        this.totalQuestions++;
        this.questionCount++;
        this.answerEl.focus();
    }

    createQuestion() {
        let question;
        switch (this.currentCategory) {
            case 'addition-subtraction-100':
                question = this.createAdditionSubtraction100();
                break;
            case 'addition-subtraction-1000':
                question = this.createAdditionSubtraction1000();
                break;
            case 'multiplication-division-ones':
                question = this.createMultiplicationDivisionOnes();
                break;
            case 'multiplication-division-tens':
                question = this.createMultiplicationDivisionTens();
                break;
            case 'mixed-ones':
                question = this.createMixedOnes();
                break;
            case 'mixed-tens':
                question = this.createMixedTens();
                break;
            case 'mixed-hundreds':
                question = this.createMixedHundreds();
                break;
            default:
                question = this.createAdditionQuestion(1, 9);
        }
        return question;
    }

    // 百位數內相加減，總數不超過100
    createAdditionSubtraction100() {
        const questionTypes = ['addition', 'subtraction'];
        const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        
        if (type === 'addition') {
            // 生成兩個數，使總和不超過100
            const maxNum = 50; // 確保兩個數相加不超過100
            const num1 = Math.floor(Math.random() * maxNum) + 1;
            const num2 = Math.floor(Math.random() * (100 - num1)) + 1;
            return {
                num1,
                num2,
                operator: '+',
                answer: num1 + num2
            };
        } else {
            // 減法：確保結果為正數
            const num1 = Math.floor(Math.random() * 100) + 1;
            const num2 = Math.floor(Math.random() * num1) + 1;
            return {
                num1,
                num2,
                operator: '-',
                answer: num1 - num2
            };
        }
    }

    // 千位數內相加減，總數不超過1000
    createAdditionSubtraction1000() {
        const questionTypes = ['addition', 'subtraction'];
        const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        
        if (type === 'addition') {
            // 生成兩個數，使總和不超過1000
            const maxNum = 500; // 確保兩個數相加不超過1000
            const num1 = Math.floor(Math.random() * maxNum) + 1;
            const num2 = Math.floor(Math.random() * (1000 - num1)) + 1;
            return {
                num1,
                num2,
                operator: '+',
                answer: num1 + num2
            };
        } else {
            // 減法：確保結果為正數
            const num1 = Math.floor(Math.random() * 1000) + 1;
            const num2 = Math.floor(Math.random() * num1) + 1;
            return {
                num1,
                num2,
                operator: '-',
                answer: num1 - num2
            };
        }
    }

    // 個位數乘除
    createMultiplicationDivisionOnes() {
        const questionTypes = ['multiplication', 'division'];
        const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        if (type === 'multiplication') {
            const num1 = Math.floor(Math.random() * 9) + 1;
            const num2 = Math.floor(Math.random() * 9) + 1;
            return {
                num1,
                num2,
                operator: '×',
                answer: num1 * num2
            };
        } else {
            // 除法：確保整數
            const result = Math.floor(Math.random() * 9) + 1;
            const num2 = Math.floor(Math.random() * 9) + 1;
            const num1 = result * num2;
            return {
                num1,
                num2,
                operator: '÷',
                answer: result
            };
        }
    }

    // 十位數相乘除
    createMultiplicationDivisionTens() {
        const questionTypes = ['multiplication', 'division'];
        const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        
        if (type === 'multiplication') {
            // 十位數乘法：10-99之間的數
            const num1 = Math.floor(Math.random() * 90) + 10; // 10-99
            const num2 = Math.floor(Math.random() * 90) + 10; // 10-99
            return {
                num1,
                num2,
                operator: '×',
                answer: num1 * num2
            };
        } else {
            // 除法：確保結果是整數
            const result = Math.floor(Math.random() * 90) + 10; // 10-99
            const num2 = Math.floor(Math.random() * 90) + 10; // 10-99
            const num1 = result * num2;
            return {
                num1,
                num2,
                operator: '÷',
                answer: result
            };
        }
    }

    // 個位數四則運算
    createMixedOnes() {
        const questionTypes = ['addition', 'subtraction', 'multiplication', 'division'];
        const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        
        switch (type) {
            case 'addition':
                return this.createAdditionQuestion(1, 9);
            case 'subtraction':
                return this.createSubtractionQuestion(1, 9);
            case 'multiplication':
                return this.createMultiplicationQuestion(1, 9);
            case 'division':
                return this.createDivisionQuestion(1, 9);
        }
    }

    // 十位數四則運算
    createMixedTens() {
        const questionTypes = ['addition', 'subtraction', 'multiplication', 'division'];
        const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        
        switch (type) {
            case 'addition':
                return this.createAdditionQuestion(10, 99);
            case 'subtraction':
                return this.createSubtractionQuestion(10, 99);
            case 'multiplication':
                return this.createMultiplicationQuestion(10, 99);
            case 'division':
                return this.createDivisionQuestion(10, 99);
        }
    }

    // 百位數四則運算
    createMixedHundreds() {
        const questionTypes = ['addition', 'subtraction', 'multiplication', 'division'];
        const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];
        
        switch (type) {
            case 'addition':
                return this.createAdditionQuestion(100, 999);
            case 'subtraction':
                return this.createSubtractionQuestion(100, 999);
            case 'multiplication':
                return this.createMultiplicationQuestion(100, 999);
            case 'division':
                return this.createDivisionQuestion(100, 999);
        }
    }

    createAdditionQuestion(min, max) {
        const num1 = Math.floor(Math.random() * (max - min + 1)) + min;
        const num2 = Math.floor(Math.random() * (max - min + 1)) + min;
        return {
            num1,
            num2,
            operator: '+',
            answer: num1 + num2
        };
    }

    createSubtractionQuestion(min, max) {
        const num1 = Math.floor(Math.random() * (max - min + 1)) + min;
        const num2 = Math.floor(Math.random() * (num1 - min + 1)) + min;
        return {
            num1,
            num2,
            operator: '-',
            answer: num1 - num2
        };
    }

    createMultiplicationQuestion(min, max) {
        const num1 = Math.floor(Math.random() * (max - min + 1)) + min;
        const num2 = Math.floor(Math.random() * (max - min + 1)) + min;
        return {
            num1,
            num2,
            operator: '×',
            answer: num1 * num2
        };
    }

    createDivisionQuestion(min, max) {
        const result = Math.floor(Math.random() * (max - min + 1)) + min;
        const num2 = Math.floor(Math.random() * (max - min + 1)) + min;
        const num1 = result * num2;
        return {
            num1,
            num2,
            operator: '÷',
            answer: result
        };
    }

    checkAnswer() {
        const userAnswer = parseInt(this.answerEl.value);
        const correctAnswer = this.currentQuestion.answer;
        if (isNaN(userAnswer)) {
            this.showFeedback('請輸入一個有效的數字！', 'incorrect');
            return;
        }
        this.stopTimer();
        let isCorrect = false;
        if (userAnswer === correctAnswer) {
            this.correctAnswers++;
            this.streak++;
            this.score += 1;
            isCorrect = true;
            this.showFeedback(`正確！🎉 答案：${correctAnswer}`, 'correct');
        } else {
            this.streak = 0;
            this.showFeedback(`錯誤！正確答案是：${correctAnswer}`, 'incorrect');
        }
        // 記錄答題狀態
        this.answerHistory.push({
            question: `${this.currentQuestion.num1} ${this.currentQuestion.operator} ${this.currentQuestion.num2}`,
            userAnswer: userAnswer,
            correctAnswer: correctAnswer,
            isCorrect: isCorrect
        });
        this.questionCount++;
        this.updateProgressDisplay();
        this.saveProgress();
        this.updateQuestionNumber();
        // 自動切換到下一題
        setTimeout(() => {
            this.nextQuestion();
        }, 600);
    }

    skipQuestion() {
        this.stopTimer();
        this.streak = 0;
        this.showFeedback(`跳過！正確答案是：${this.currentQuestion.answer}`, 'incorrect');
    }

    showFeedback(message, type) {
        this.feedbackText.textContent = message;
        this.feedback.className = `feedback ${type}`;
        this.feedback.classList.remove('hidden');
        this.feedback.classList.add('bounce');
    }

    nextQuestion() {
        this.feedback.classList.add('hidden');
        if (this.questionCount >= this.questionsPerLevel) {
            this.completeLevel();
        } else {
            this.generateQuestion();
            this.startTimer();
            this.updateQuestionNumber();
        }
    }

    completeLevel() {
        this.hideAllScreens();
        this.levelComplete.classList.remove('hidden');
        this.levelComplete.classList.add('fade-in');
        let accuracy = 0;
        accuracy = Math.round((this.correctAnswers / this.totalQuestions) * 100);
        this.correctCountEl.textContent = this.correctAnswers;
        this.totalCountEl.textContent = this.totalQuestions;
        this.accuracyEl.textContent = `${accuracy}%`;
        this.levelComplete.querySelector('h2').textContent = '🎉 練習完成！';
        if (accuracy >= 80) {
            this.score += 50;
            this.updateProgressDisplay();
            this.saveProgress();
        }
        // 顯示完成時的對錯題目
        this.showHistoryModal();
    }

    nextLevel() {
        if (this.currentLevel < 100) {
            this.currentLevel++;
            this.startLevel();
        } else {
            this.showLevelSelect();
        }
    }

    retryLevel() {
        this.startLevel();
    }

    showLevelSelect() {
        this.hideAllScreens();
        this.levelSelect.classList.remove('hidden');
        this.levelSelect.classList.add('fade-in');
        // 歸零題號、得分、連續正確
        this.questionCount = 0;
        this.score = 0;
        this.streak = 0;
        this.updateProgressDisplay();
    }

    hideAllScreens() {
        this.levelSelect.classList.add('hidden');
        this.gameArea.classList.add('hidden');
        this.levelComplete.classList.add('hidden');
    }

    startTimer() {
        this.timeLeft = 60;
        this.updateTimer();
        this.isPaused = false;
        if(this.pauseBtn && this.resumeBtn) {
            this.pauseBtn.style.display = '';
            this.resumeBtn.style.display = 'none';
        }
        this.timer = setInterval(() => {
            if(this.isPaused) return;
            this.timeLeft--;
            this.updateTimer();
            if (this.timeLeft <= 0) {
                this.stopTimer();
                this.skipQuestion();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    updateTimer() {
        this.timeLeftEl.textContent = this.timeLeft;
        const percentage = (this.timeLeft / 60) * 100;
        this.timerFill.style.width = `${percentage}%`;
        
        // 根據剩餘時間改變顏色
        if (this.timeLeft <= 10) {
            this.timerFill.style.background = 'linear-gradient(45deg, #ef4444, #dc2626)';
        } else if (this.timeLeft <= 20) {
            this.timerFill.style.background = 'linear-gradient(45deg, #f59e0b, #d97706)';
        } else {
            this.timerFill.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4)';
        }
    }

    pauseTimer() {
        this.isPaused = true;
        if(this.pauseBtn && this.resumeBtn) {
            this.pauseBtn.style.display = 'none';
            this.resumeBtn.style.display = '';
        }
        this.answerEl.disabled = true;
    }

    resumeTimer() {
        this.isPaused = false;
        if(this.pauseBtn && this.resumeBtn) {
            this.pauseBtn.style.display = '';
            this.resumeBtn.style.display = 'none';
        }
        this.answerEl.disabled = false;
    }

    createHistoryModal() {
        // 建立 modal 結構
        this.historyModal = document.createElement('div');
        this.historyModal.id = 'history-modal';
        this.historyModal.style.cssText = 'display:none; position:fixed; z-index:2000; left:0; top:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4);';
        const modalContent = document.createElement('div');
        modalContent.style.cssText = 'background:#fff; border-radius:16px; max-width:420px; margin:5vh auto; padding:24px; box-shadow:0 8px 32px #0002; position:relative; top:0; left:0; right:0;';
        modalContent.innerHTML = `
            <h3 style="margin-bottom:16px; color:#1e3c72;">本次練習答題記錄</h3>
            <div id="history-list" style="max-height:220px; overflow-y:auto; margin-bottom:12px;"></div>
            <button id="close-history-modal" class="btn btn-secondary" style="margin-top:18px; width:100%;">關閉</button>
        `;
        this.historyModal.appendChild(modalContent);
        document.body.appendChild(this.historyModal);
        document.getElementById('close-history-modal').onclick = () => {
            this.historyModal.style.display = 'none';
        };
    }

    showHistoryModal() {
        // 產生對錯題目列表（無刪除按鈕）
        const list = this.answerHistory.map((item, idx) =>
            `<div style="margin-bottom:8px; color:${item.isCorrect ? '#16a34a' : '#dc2626'};\">
                ${idx + 1}. ${item.question} = <b>${item.userAnswer}</b> ${item.isCorrect ? '✔️' : `❌（正確：${item.correctAnswer}）`}
            </div>`
        ).join('');
        document.getElementById('history-list').innerHTML = list || '<div style="color:#888;">尚無答題記錄</div>';
        this.historyModal.style.display = 'block';
    }
}

// 當頁面加載完成後初始化遊戲
document.addEventListener('DOMContentLoaded', () => {
    // 每次載入時將得分歸零
    localStorage.setItem('mathGameProgress', JSON.stringify({ currentLevel: 1, score: 0, timestamp: Date.now() }));
    window.mathGame = new MathGame();
});

// 添加一些音效和視覺效果
function playSound(type) {
    // 這裡可以添加音效，如果需要
    console.log(`播放${type}音效`);
}

// 添加鍵盤快捷鍵
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // ESC鍵返回選單
        const game = window.mathGame;
        if (game && game.gameArea && !game.gameArea.classList.contains('hidden')) {
            game.showLevelSelect();
        }
    }
}); 