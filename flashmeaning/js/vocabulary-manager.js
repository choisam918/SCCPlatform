// 詞彙管理模組
class VocabularyManager {
    constructor() {
        this.words = [];
        this.categories = [];
        this.difficulties = ['easy', 'medium', 'hard'];
        this.loadWords();
    }

    // 載入詞彙數據
    loadWords() {
        const savedWords = localStorage.getItem('vocabulary_words');
        if (savedWords) {
            try {
                const data = JSON.parse(savedWords);
                this.words = data.words || data; // 兼容舊格式
                this.categories = data.categories || this.extractCategories();
            } catch (error) {
                console.error('載入詞彙數據失敗:', error);
                this.loadDefaultWords();
            }
        } else {
            this.loadDefaultWords();
        }
    }

    // 載入預設詞彙
    loadDefaultWords() {
        this.words = [
            { chinese: '蘋果', english: 'apple', category: '水果', difficulty: 'easy' },
            { chinese: '書', english: 'book', category: '學習用品', difficulty: 'easy' },
            { chinese: '汽車', english: 'car', category: '交通工具', difficulty: 'easy' },
            { chinese: '狗', english: 'dog', category: '動物', difficulty: 'easy' },
            { chinese: '房子', english: 'house', category: '建築', difficulty: 'easy' },
            { chinese: '貓', english: 'cat', category: '動物', difficulty: 'easy' },
            { chinese: '鳥', english: 'bird', category: '動物', difficulty: 'easy' },
            { chinese: '花', english: 'flower', category: '植物', difficulty: 'easy' },
            { chinese: '樹', english: 'tree', category: '植物', difficulty: 'easy' },
            { chinese: '水', english: 'water', category: '自然', difficulty: 'easy' }
        ];
        this.categories = this.extractCategories();
    }

    // 提取分類
    extractCategories() {
        const categories = [...new Set(this.words.map(word => word.category))];
        return categories.filter(category => category);
    }

    // 儲存詞彙
    saveWords() {
        const data = {
            words: this.words,
            categories: this.categories,
            difficulties: this.difficulties,
            lastUpdated: new Date().toISOString().split('T')[0],
            version: '1.0'
        };
        localStorage.setItem('vocabulary_words', JSON.stringify(data));
    }

    // 新增詞彙
    addWord(chinese, english, category = '一般', difficulty = 'easy') {
        const newWord = { chinese, english, category, difficulty };
        this.words.push(newWord);
        if (!this.categories.includes(category)) {
            this.categories.push(category);
        }
        this.saveWords();
        return newWord;
    }

    // 批量新增詞彙
    addBatchWords(batchText) {
        const lines = batchText.split('\n').filter(line => line.trim());
        let addedCount = 0;
        let errorCount = 0;

        for (const line of lines) {
            const parts = line.split(',').map(part => part.trim());
            if (parts.length >= 2 && parts[0] && parts[1]) {
                const category = parts[2] || '一般';
                const difficulty = parts[3] || 'easy';
                this.addWord(parts[0], parts[1], category, difficulty);
                addedCount++;
            } else {
                errorCount++;
            }
        }

        return { addedCount, errorCount };
    }

    // 編輯詞彙
    editWord(index, chinese, english, category, difficulty) {
        if (index >= 0 && index < this.words.length) {
            this.words[index] = { chinese, english, category, difficulty };
            if (!this.categories.includes(category)) {
                this.categories.push(category);
            }
            this.saveWords();
            return true;
        }
        return false;
    }

    // 刪除詞彙
    deleteWord(index) {
        if (index >= 0 && index < this.words.length) {
            this.words.splice(index, 1);
            this.categories = this.extractCategories();
            this.saveWords();
            return true;
        }
        return false;
    }

    // 獲取所有詞彙
    getAllWords() {
        return this.words;
    }

    // 根據分類獲取詞彙
    getWordsByCategory(category) {
        return this.words.filter(word => word.category === category);
    }

    // 根據難度獲取詞彙
    getWordsByDifficulty(difficulty) {
        return this.words.filter(word => word.difficulty === difficulty);
    }

    // 獲取隨機詞彙
    getRandomWords(count = 10) {
        const shuffled = [...this.words].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, this.words.length));
    }

    // 搜尋詞彙
    searchWords(query) {
        const lowerQuery = query.toLowerCase();
        return this.words.filter(word => 
            word.chinese.toLowerCase().includes(lowerQuery) ||
            word.english.toLowerCase().includes(lowerQuery)
        );
    }

    // 獲取統計信息
    getStats() {
        const totalWords = this.words.length;
        const categoryStats = {};
        const difficultyStats = {};

        this.words.forEach(word => {
            categoryStats[word.category] = (categoryStats[word.category] || 0) + 1;
            difficultyStats[word.difficulty] = (difficultyStats[word.difficulty] || 0) + 1;
        });

        return {
            totalWords,
            categoryStats,
            difficultyStats,
            categories: this.categories,
            difficulties: this.difficulties
        };
    }

    // 匯出數據
    exportData() {
        return {
            words: this.words,
            categories: this.categories,
            difficulties: this.difficulties,
            lastUpdated: new Date().toISOString().split('T')[0],
            version: '1.0'
        };
    }

    // 匯入數據
    importData(data) {
        try {
            if (data.words && Array.isArray(data.words)) {
                this.words = data.words;
                this.categories = data.categories || this.extractCategories();
                this.saveWords();
                return true;
            }
            return false;
        } catch (error) {
            console.error('匯入數據失敗:', error);
            return false;
        }
    }

    // 重置數據
    resetData() {
        this.loadDefaultWords();
        this.saveWords();
    }
}

// 學習進度管理
class ProgressManager {
    constructor() {
        this.progress = this.loadProgress();
    }

    loadProgress() {
        const saved = localStorage.getItem('learning_progress');
        return saved ? JSON.parse(saved) : {};
    }

    saveProgress() {
        localStorage.setItem('learning_progress', JSON.stringify(this.progress));
    }

    updateProgress(wordId, isCorrect) {
        if (!this.progress[wordId]) {
            this.progress[wordId] = { correct: 0, incorrect: 0, lastPracticed: null };
        }
        
        if (isCorrect) {
            this.progress[wordId].correct++;
        } else {
            this.progress[wordId].incorrect++;
        }
        
        this.progress[wordId].lastPracticed = new Date().toISOString();
        this.saveProgress();
    }

    getWordProgress(wordId) {
        return this.progress[wordId] || { correct: 0, incorrect: 0, lastPracticed: null };
    }

    getAccuracy(wordId) {
        const progress = this.getWordProgress(wordId);
        const total = progress.correct + progress.incorrect;
        return total > 0 ? (progress.correct / total) * 100 : 0;
    }

    getWeakWords(vocabularyManager, threshold = 0.7) {
        return vocabularyManager.words.filter(word => {
            const accuracy = this.getAccuracy(word.chinese);
            return accuracy < threshold * 100;
        });
    }
}

// 全局實例
window.vocabularyManager = new VocabularyManager();
window.progressManager = new ProgressManager(); 