// Class definitions must come first in Service Worker

class StorageManager {
  constructor() {
    this.defaultSettings = {
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

  async getSettings() {
    try {
      const result = await chrome.storage.sync.get('settings');
      return result.settings || this.defaultSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
      return this.defaultSettings;
    }
  }

  async saveSettings(settings) {
    try {
      await chrome.storage.sync.set({ settings });
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }

  async getBlacklist() {
    const settings = await this.getSettings();
    return settings.blacklist.filter(item => item.enabled);
  }

  async getWhitelist() {
    const settings = await this.getSettings();
    return settings.whitelist.filter(item => item.enabled);
  }

  async addToBlacklist(pattern) {
    const settings = await this.getSettings();
    const newItem = {
      id: Date.now().toString(),
      pattern: pattern,
      enabled: true,
      createdAt: Date.now()
    };
    settings.blacklist.push(newItem);
    await this.saveSettings(settings);
    return newItem;
  }

  async addToWhitelist(pattern) {
    const settings = await this.getSettings();
    const newItem = {
      id: Date.now().toString(),
      pattern: pattern,
      enabled: true,
      createdAt: Date.now()
    };
    settings.whitelist.push(newItem);
    await this.saveSettings(settings);
    return newItem;
  }

  async getTempAccess(domain) {
    const result = await chrome.storage.local.get('tempAccess');
    const tempAccess = result.tempAccess || {};
    const access = tempAccess[domain];
    
    if (!access) return false;
    
    if (Date.now() > access.until) {
      delete tempAccess[domain];
      await chrome.storage.local.set({ tempAccess });
      return false;
    }
    
    return true;
  }

  async grantTempAccess(domain, durationMinutes) {
    const result = await chrome.storage.local.get('tempAccess');
    const tempAccess = result.tempAccess || {};
    
    tempAccess[domain] = {
      until: Date.now() + (durationMinutes * 60 * 1000)
    };
    
    await chrome.storage.local.set({ tempAccess });
  }

  async clearTempAccess(domain) {
    const result = await chrome.storage.local.get('tempAccess');
    const tempAccess = result.tempAccess || {};
    
    if (tempAccess[domain]) {
      delete tempAccess[domain];
      await chrome.storage.local.set({ tempAccess });
    }
  }

  async getCurrentChallenge() {
    const result = await chrome.storage.session.get('currentChallenge');
    return result.currentChallenge || null;
  }

  async setCurrentChallenge(challenge) {
    await chrome.storage.session.set({ currentChallenge: challenge });
  }

  async clearCurrentChallenge() {
    await chrome.storage.session.remove('currentChallenge');
  }

  async updateChallengeProgress(correctCount) {
    const challenge = await this.getCurrentChallenge();
    if (challenge) {
      challenge.correctCount = correctCount;
      await this.setCurrentChallenge(challenge);
    }
  }
}

class URLMatcher {
  constructor() {
    this.cache = new Map();
    this.cacheMaxSize = 1000;
  }

  getDomainFromURL(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      console.error('Invalid URL:', url);
      return null;
    }
  }

  matchesPattern(url, pattern) {
    const cacheKey = `${url}::${pattern}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const regex = new RegExp(pattern);
      const result = regex.test(url);
      
      if (this.cache.size >= this.cacheMaxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
      
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Invalid regex pattern:', pattern, error);
      return false;
    }
  }

  async shouldBlockURL(url, storageManager) {
    const blacklist = await storageManager.getBlacklist();
    const whitelist = await storageManager.getWhitelist();
    
    for (const item of whitelist) {
      if (this.matchesPattern(url, item.pattern)) {
        return false;
      }
    }
    
    for (const item of blacklist) {
      if (this.matchesPattern(url, item.pattern)) {
        const domain = this.getDomainFromURL(url);
        if (domain) {
          const hasAccess = await storageManager.getTempAccess(domain);
          if (hasAccess) {
            return false;
          }
        }
        return true;
      }
    }
    
    return false;
  }

  createPatternForDomain(domain) {
    const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return `^https?://([^/]*\\.)?${escapedDomain}(/.*)?$`;
  }

  createPatternForURL(url) {
    const escapedURL = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return `^${escapedURL}$`;
  }
}

class ProblemProvider {
  generateProblem(config) {
    throw new Error('generateProblem must be implemented by subclass');
  }
  
  validateAnswer(problem, userAnswer) {
    throw new Error('validateAnswer must be implemented by subclass');
  }
  
  formatQuestion(problem) {
    throw new Error('formatQuestion must be implemented by subclass');
  }
}

class MathProblemProvider extends ProblemProvider {
  generateProblem(config) {
    const { difficulty, operations } = config;
    const enabledOperations = this.getEnabledOperations(operations);
    
    if (enabledOperations.length === 0) {
      throw new Error('At least one operation must be enabled');
    }
    
    const operation = enabledOperations[Math.floor(Math.random() * enabledOperations.length)];
    const range = this.getRangeByDifficulty(difficulty);
    
    let num1, num2, answer;
    
    switch (operation) {
      case 'addition':
        num1 = this.getRandomNumber(range.min, range.max);
        num2 = this.getRandomNumber(range.min, range.max);
        answer = num1 + num2;
        return {
          question: `${num1} + ${num2} = ?`,
          answer: answer,
          operation: 'addition'
        };
        
      case 'subtraction':
        num1 = this.getRandomNumber(range.min, range.max);
        num2 = this.getRandomNumber(range.min, Math.min(num1, range.max));
        answer = num1 - num2;
        return {
          question: `${num1} - ${num2} = ?`,
          answer: answer,
          operation: 'subtraction'
        };
        
      case 'multiplication':
        const multRange = this.getMultiplicationRange(difficulty);
        num1 = this.getRandomNumber(multRange.min, multRange.max);
        num2 = this.getRandomNumber(multRange.min, multRange.max);
        answer = num1 * num2;
        return {
          question: `${num1} × ${num2} = ?`,
          answer: answer,
          operation: 'multiplication'
        };
        
      case 'division':
        const divRange = this.getDivisionRange(difficulty);
        num2 = this.getRandomNumber(divRange.min, divRange.max);
        answer = this.getRandomNumber(divRange.min, divRange.max);
        num1 = num2 * answer;
        return {
          question: `${num1} ÷ ${num2} = ?`,
          answer: answer,
          operation: 'division'
        };
    }
  }
  
  validateAnswer(problem, userAnswer) {
    const parsedAnswer = parseInt(userAnswer, 10);
    if (isNaN(parsedAnswer)) {
      return false;
    }
    return problem.answer === parsedAnswer;
  }
  
  formatQuestion(problem) {
    return problem.question;
  }
  
  getEnabledOperations(operations) {
    const enabled = [];
    if (operations.addition) enabled.push('addition');
    if (operations.subtraction) enabled.push('subtraction');
    if (operations.multiplication) enabled.push('multiplication');
    if (operations.division) enabled.push('division');
    return enabled;
  }
  
  getRangeByDifficulty(difficulty) {
    switch (difficulty) {
      case 1:
        return { min: 1, max: 9 };
      case 2:
        return { min: 10, max: 99 };
      case 3:
        return { min: 100, max: 999 };
      default:
        return { min: 1, max: 9 };
    }
  }
  
  getMultiplicationRange(difficulty) {
    switch (difficulty) {
      case 1:
        return { min: 1, max: 9 };
      case 2:
        return { min: 2, max: 20 };
      case 3:
        return { min: 10, max: 50 };
      default:
        return { min: 1, max: 9 };
    }
  }
  
  getDivisionRange(difficulty) {
    switch (difficulty) {
      case 1:
        return { min: 1, max: 9 };
      case 2:
        return { min: 2, max: 15 };
      case 3:
        return { min: 5, max: 25 };
      default:
        return { min: 1, max: 9 };
    }
  }
  
  getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

// Initialize instances after class definitions
const storageManager = new StorageManager();
const urlMatcher = new URLMatcher();

chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenus();
});

function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'addDomainToBlacklist',
      title: 'このドメインをブロックリストに追加',
      contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
    });
    
    chrome.contextMenus.create({
      id: 'addURLToBlacklist',
      title: 'このURLをブロックリストに追加',
      contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
    });
    
    chrome.contextMenus.create({
      id: 'addURLToWhitelist',
      title: 'このURLをホワイトリストに追加',
      contexts: ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio']
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.linkUrl || info.pageUrl || tab.url;
  
  if (!url) {
    console.error('No URL available');
    return;
  }
  
  switch (info.menuItemId) {
    case 'addDomainToBlacklist':
      const domain = urlMatcher.getDomainFromURL(url);
      if (domain) {
        const pattern = urlMatcher.createPatternForDomain(domain);
        await storageManager.addToBlacklist(pattern);
        showNotification('ドメインをブロックリストに追加', `${domain}をブロックリストに追加しました`);
      }
      break;
      
    case 'addURLToBlacklist':
      const urlPattern = urlMatcher.createPatternForURL(url);
      await storageManager.addToBlacklist(urlPattern);
      showNotification('URLをブロックリストに追加', 'URLをブロックリストに追加しました');
      break;
      
    case 'addURLToWhitelist':
      const whitelistPattern = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await storageManager.addToWhitelist(`^${whitelistPattern}.*`);
      showNotification('URLをホワイトリストに追加', 'URLをホワイトリストに追加しました');
      break;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      const result = await handleMessage(request, sender);
      sendResponse(result);
    } catch (error) {
      console.error('Error in message handler:', error);
      sendResponse({ error: error.message || 'Unknown error occurred' });
    }
  })();
  return true;
});

async function handleMessage(request, sender) {
  try {
    switch (request.action) {
      case 'checkURL':
        const shouldBlock = await urlMatcher.shouldBlockURL(request.url, storageManager);
        return { shouldBlock };
        
      case 'getSettings':
        const settings = await storageManager.getSettings();
        return { settings };
        
      case 'saveSettings':
        const success = await storageManager.saveSettings(request.settings);
        return { success };
        
      case 'generateProblem':
        const problemProvider = new MathProblemProvider();
        const problem = problemProvider.generateProblem(request.config);
        return { problem };
        
      case 'validateAnswer':
        const validator = new MathProblemProvider();
        const isCorrect = validator.validateAnswer(request.problem, request.answer);
        return { isCorrect };
        
      case 'grantTempAccess':
        const domain = urlMatcher.getDomainFromURL(request.url);
        if (domain) {
          await storageManager.grantTempAccess(domain, request.duration);
          return { success: true };
        } else {
          return { success: false };
        }
        
      case 'clearTempAccess':
        const clearDomain = urlMatcher.getDomainFromURL(request.url);
        if (clearDomain) {
          await storageManager.clearTempAccess(clearDomain);
          return { success: true };
        } else {
          return { success: false };
        }
        
      case 'getCurrentChallenge':
        const challenge = await storageManager.getCurrentChallenge();
        return { challenge };
        
      case 'setCurrentChallenge':
        await storageManager.setCurrentChallenge(request.challenge);
        return { success: true };
        
      case 'clearCurrentChallenge':
        await storageManager.clearCurrentChallenge();
        return { success: true };
        
      case 'updateChallengeProgress':
        await storageManager.updateChallengeProgress(request.correctCount);
        return { success: true };
        
      default:
        return { error: 'Unknown action: ' + request.action };
    }
  } catch (error) {
    console.error('Error handling message:', error);
    throw error;
  }
}

function showNotification(title, message) {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: title,
      message: message
    });
  }
}

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  
  const shouldBlock = await urlMatcher.shouldBlockURL(details.url, storageManager);
  
  if (shouldBlock) {
    chrome.tabs.sendMessage(details.tabId, {
      action: 'showChallenge',
      url: details.url
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending showChallenge message:', chrome.runtime.lastError);
      }
    });
  }
});