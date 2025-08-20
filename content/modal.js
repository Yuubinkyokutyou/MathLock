class ChallengeModal {
  constructor() {
    this.modal = null;
    this.overlay = null;
    this.currentProblem = null;
    this.correctCount = 0;
    this.requiredCount = 3;
    this.url = '';
    this.problemProvider = new MathProblemProvider();
  }

  async init(url) {
    this.url = url;
    const settings = await this.getSettings();
    this.requiredCount = settings.problemConfig.requiredCount;
    
    const existingChallenge = await this.getCurrentChallenge();
    if (existingChallenge && existingChallenge.domain === this.getDomain()) {
      this.correctCount = existingChallenge.correctCount;
      this.currentProblem = existingChallenge.currentProblem;
    } else {
      this.correctCount = 0;
      await this.generateNewProblem();
    }
    
    this.createModal();
    this.show();
  }

  getDomain() {
    try {
      return new URL(this.url).hostname;
    } catch {
      return '';
    }
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting settings:', chrome.runtime.lastError);
          resolve(this.getDefaultSettings());
        } else if (response && response.settings) {
          resolve(response.settings);
        } else {
          resolve(this.getDefaultSettings());
        }
      });
    });
  }

  getDefaultSettings() {
    return {
      blacklist: [],
      whitelist: [],
      problemConfig: {
        requiredCount: 3,
        difficulty: 1,
        operations: {
          addition: true,
          subtraction: true,
          multiplication: true,
          division: true
        }
      },
      accessDuration: 15
    };
  }

  async getCurrentChallenge() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getCurrentChallenge' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting challenge:', chrome.runtime.lastError);
          resolve(null);
        } else if (response && response.challenge) {
          resolve(response.challenge);
        } else {
          resolve(null);
        }
      });
    });
  }

  async generateNewProblem() {
    const settings = await this.getSettings();
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'generateProblem',
        config: settings.problemConfig
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error generating problem:', chrome.runtime.lastError);
          // Generate a fallback problem locally
          this.currentProblem = this.generateFallbackProblem(settings.problemConfig);
        } else if (response && response.problem) {
          this.currentProblem = response.problem;
        } else {
          this.currentProblem = this.generateFallbackProblem(settings.problemConfig);
        }
        this.saveChallenge();
        resolve();
      });
    });
  }

  generateFallbackProblem(config) {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    return {
      question: `${num1} + ${num2} = ?`,
      answer: num1 + num2,
      operation: 'addition'
    };
  }

  async saveChallenge() {
    chrome.runtime.sendMessage({
      action: 'setCurrentChallenge',
      challenge: {
        domain: this.getDomain(),
        correctCount: this.correctCount,
        requiredCount: this.requiredCount,
        currentProblem: this.currentProblem
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error saving challenge:', chrome.runtime.lastError);
      }
    });
  }

  createModal() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'mathlock-overlay';
    
    this.modal = document.createElement('div');
    this.modal.className = 'mathlock-modal';
    
    this.modal.innerHTML = `
      <div class="mathlock-header">
        <h2>サイトアクセスチャレンジ</h2>
        <div class="mathlock-progress">
          進捗: ${this.getProgressDots()} (${this.correctCount}/${this.requiredCount}問正解)
        </div>
      </div>
      
      <div class="mathlock-body">
        <div class="mathlock-question-container">
          <label class="mathlock-label">問題:</label>
          <div class="mathlock-question">
            ${this.currentProblem.question}
          </div>
        </div>
        
        <div class="mathlock-answer-container">
          <label class="mathlock-label">解答:</label>
          <input type="number" class="mathlock-input" id="mathlock-answer" autofocus>
        </div>
        
        <div class="mathlock-message" id="mathlock-message"></div>
        
        <div class="mathlock-buttons">
          <button class="mathlock-btn mathlock-btn-primary" id="mathlock-submit">送信</button>
          <button class="mathlock-btn mathlock-btn-secondary" id="mathlock-back">前のページに戻る</button>
        </div>
      </div>
    `;
    
    this.overlay.appendChild(this.modal);
    
    this.attachEventListeners();
  }

  getProgressDots() {
    let dots = '';
    for (let i = 0; i < this.requiredCount; i++) {
      if (i < this.correctCount) {
        dots += '●';
      } else {
        dots += '○';
      }
    }
    return dots;
  }

  attachEventListeners() {
    const submitBtn = this.modal.querySelector('#mathlock-submit');
    const backBtn = this.modal.querySelector('#mathlock-back');
    const input = this.modal.querySelector('#mathlock-answer');
    
    submitBtn.addEventListener('click', () => this.handleSubmit());
    backBtn.addEventListener('click', () => this.handleBack());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSubmit();
      }
    });
  }

  async handleSubmit() {
    const input = this.modal.querySelector('#mathlock-answer');
    const messageDiv = this.modal.querySelector('#mathlock-message');
    const answer = input.value.trim();
    
    if (!answer) {
      this.showMessage('解答を入力してください', 'error');
      return;
    }
    
    const isCorrect = await this.validateAnswer(answer);
    
    if (isCorrect) {
      this.correctCount++;
      
      if (this.correctCount >= this.requiredCount) {
        await this.grantAccess();
        this.showMessage('全問正解！アクセスが許可されました', 'success');
        setTimeout(() => {
          this.hide();
          this.cleanup();
        }, 1500);
      } else {
        this.showMessage('正解！次の問題へ', 'success');
        await this.generateNewProblem();
        this.updateModal();
      }
    } else {
      this.correctCount = 0;
      this.showMessage('不正解です。最初からやり直してください', 'error');
      await this.generateNewProblem();
      this.updateModal();
    }
    
    input.value = '';
  }

  async validateAnswer(answer) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'validateAnswer',
        problem: this.currentProblem,
        answer: answer
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error validating answer:', chrome.runtime.lastError);
          // Fallback to local validation
          const parsedAnswer = parseInt(answer, 10);
          resolve(!isNaN(parsedAnswer) && parsedAnswer === this.currentProblem.answer);
        } else if (response && typeof response.isCorrect === 'boolean') {
          resolve(response.isCorrect);
        } else {
          // Fallback to local validation
          const parsedAnswer = parseInt(answer, 10);
          resolve(!isNaN(parsedAnswer) && parsedAnswer === this.currentProblem.answer);
        }
      });
    });
  }

  async grantAccess() {
    const settings = await this.getSettings();
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'grantTempAccess',
        url: this.url,
        duration: settings.accessDuration
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error granting access:', chrome.runtime.lastError);
        }
        chrome.runtime.sendMessage({ action: 'clearCurrentChallenge' }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error clearing challenge:', chrome.runtime.lastError);
          }
          resolve();
        });
      });
    });
  }

  updateModal() {
    const progressDiv = this.modal.querySelector('.mathlock-progress');
    const questionDiv = this.modal.querySelector('.mathlock-question');
    
    progressDiv.innerHTML = `進捗: ${this.getProgressDots()} (${this.correctCount}/${this.requiredCount}問正解)`;
    questionDiv.textContent = this.currentProblem.question;
    
    this.saveChallenge();
  }

  showMessage(message, type) {
    const messageDiv = this.modal.querySelector('#mathlock-message');
    messageDiv.textContent = message;
    messageDiv.className = `mathlock-message mathlock-message-${type}`;
    
    setTimeout(() => {
      messageDiv.textContent = '';
      messageDiv.className = 'mathlock-message';
    }, 3000);
  }

  handleBack() {
    window.history.back();
  }

  show() {
    if (this.overlay && document.body) {
      document.body.appendChild(this.overlay);
      const input = this.modal.querySelector('#mathlock-answer');
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    } else if (this.overlay && !document.body) {
      // Wait for body to be available
      const checkBody = setInterval(() => {
        if (document.body) {
          clearInterval(checkBody);
          document.body.appendChild(this.overlay);
          const input = this.modal.querySelector('#mathlock-answer');
          if (input) {
            setTimeout(() => input.focus(), 100);
          }
        }
      }, 10);
    }
  }

  hide() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }

  cleanup() {
    this.modal = null;
    this.overlay = null;
    this.currentProblem = null;
    this.correctCount = 0;
  }
}