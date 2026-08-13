// 音頻管理模組 - 純自動生成版本
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.speechSynthesis = null;
        this.isInitialized = false;
        this.volume = 1.0;
        this.init();
    }

    init() {
        try {
            // 初始化 Web Audio API
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                this.audioContext = new (AudioContext || webkitAudioContext)();
            }

            // 檢查 Speech Synthesis API
            if ('speechSynthesis' in window) {
                this.speechSynthesis = window.speechSynthesis;
            }

            this.isInitialized = true;
            console.log('Audio manager initialized');
            console.log('Speech Synthesis:', this.speechSynthesis ? 'Available' : 'Not available');
            console.log('Web Audio API:', this.audioContext ? 'Available' : 'Not available');
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }

    // 播放英文單詞 - 主要方法
    async speakEnglish(text) {
        try {
            // 方法1: 嘗試使用 Speech Synthesis
            if (this.speechSynthesis) {
                return await this.speakWithSynthesis(text);
            }
            
            // 方法2: 嘗試使用 TTS API
            if (await this.speakWithTTS(text)) {
                return;
            }
            
            // 方法3: 生成簡單音調提示
            await this.generateTonePrompt();
            
        } catch (error) {
            console.warn('All speech methods failed:', error);
            // 最後的備用方案：生成提示音
            await this.generateTonePrompt();
        }
    }

    // 使用 Speech Synthesis
    async speakWithSynthesis(text) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.speechSynthesis) {
                    reject(new Error('Speech Synthesis not available'));
                    return;
                }

                // 停止當前播放
                this.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                utterance.rate = 0.8;
                utterance.pitch = 1;
                utterance.volume = this.volume;

                utterance.onend = () => {
                    console.log('Speech synthesis completed:', text);
                    resolve();
                };
                utterance.onerror = (error) => {
                    console.warn('Speech synthesis error:', error);
                    reject(error);
                };

                this.speechSynthesis.speak(utterance);
            } catch (error) {
                reject(error);
            }
        });
    }

    // 使用 TTS API (如果可用)
    async speakWithTTS(text) {
        try {
            // 檢查是否有 TTS 插件或橋接
            if (typeof Android !== 'undefined' && Android.tts) {
                Android.tts.speak(text, 0, null, null);
                return true;
            }
            
            // 檢查其他可能的 TTS 接口
            if (window.tts && window.tts.speak) {
                window.tts.speak(text);
                return true;
            }
            
            return false;
        } catch (error) {
            console.warn('TTS API failed:', error);
            return false;
        }
    }

    // 確保 AudioContext 已啟動（處理 suspended 狀態）
    async ensureAudioContextReady() {
        try {
            if (!this.audioContext) return false;
            
            // 檢查 AudioContext 狀態，如果是 suspended 則 resume
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            return this.audioContext.state === 'running';
        } catch (error) {
            console.warn('Failed to resume audio context:', error);
            return false;
        }
    }

    // 生成音調提示
    async generateTonePrompt() {
        try {
            if (!this.audioContext) return;
            
            // 確保 AudioContext 已啟動
            await this.ensureAudioContextReady();
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
            
        } catch (error) {
            console.warn('Failed to generate tone:', error);
        }
    }

    // 播放中文單詞
    async speakChinese(text) {
        try {
            // 嘗試 Speech Synthesis
            if (this.speechSynthesis) {
                return await this.speakChineseWithSynthesis(text);
            }
            
            // 生成提示音
            await this.generateTonePrompt();
            
        } catch (error) {
            console.warn('Chinese speech failed:', error);
            await this.generateTonePrompt();
        }
    }

    // 使用 Speech Synthesis 播放中文
    async speakChineseWithSynthesis(text) {
        return new Promise((resolve, reject) => {
            try {
                this.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'zh-TW';
                utterance.rate = 0.8;
                utterance.pitch = 1;
                utterance.volume = this.volume;

                utterance.onend = () => resolve();
                utterance.onerror = (error) => reject(error);

                this.speechSynthesis.speak(utterance);
            } catch (error) {
                reject(error);
            }
        });
    }

    // 播放結果音效
    async playResultSound(isCorrect) {
        try {
            // 生成不同的提示音
            await this.generateResultTone(isCorrect);
        } catch (error) {
            console.warn('Result sound failed:', error);
            await this.generateResultTone(isCorrect);
        }
    }

    // 生成結果提示音
    async generateResultTone(isCorrect) {
        try {
            if (!this.audioContext) return;
            
            // 確保 AudioContext 已啟動
            await this.ensureAudioContextReady();
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            if (isCorrect) {
                // 正確音效：上升音調
                oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.2);
            } else {
                // 錯誤音效：下降音調
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime + 0.2);
            }
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
            
        } catch (error) {
            console.warn('Failed to generate result tone:', error);
        }
    }

    // 播放完成音效
    async playCompletionSound() {
        try {
            // 生成完成提示音
            await this.generateCompletionTone();
        } catch (error) {
            console.warn('Completion sound failed:', error);
            await this.generateCompletionTone();
        }
    }

    // 生成完成提示音
    async generateCompletionTone() {
        try {
            if (!this.audioContext) return;
            
            // 確保 AudioContext 已啟動
            await this.ensureAudioContextReady();
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 完成音效：歡快的音調序列
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.2);
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime + 0.3);
            oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime + 0.4);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
            
        } catch (error) {
            console.warn('Failed to generate completion tone:', error);
        }
    }

    // 設置音量
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    // 停止所有音頻
    stop() {
        try {
            if (this.speechSynthesis) {
                this.speechSynthesis.cancel();
            }
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = new (AudioContext || webkitAudioContext)();
            }
        } catch (error) {
            console.warn('Failed to stop audio:', error);
        }
    }

    // 測試音頻功能
    async testAudio() {
        try {
            console.log('=== Audio Manager Test ===');
            console.log('Speech Synthesis:', this.speechSynthesis ? '✅ Available' : '❌ Not available');
            console.log('Web Audio API:', this.audioContext ? '✅ Available' : '❌ Not available');
            console.log('Is Initialized:', this.isInitialized ? '✅ Yes' : '❌ No');
            
            if (this.isInitialized) {
                console.log('Testing English speech...');
                await this.speakEnglish('hello');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Audio test failed:', error);
            return false;
        }
    }

    // 獲取系統狀態
    getSystemStatus() {
        return {
            isInitialized: this.isInitialized,
            speechSynthesis: !!this.speechSynthesis,
            audioContext: !!this.audioContext,
            volume: this.volume
        };
    }
}

// 全局實例
window.audioManager = new AudioManager();

// 不自動測試音頻，避免自動播放聲音
// 音頻將在用戶點擊按鈕時由用戶交互觸發 