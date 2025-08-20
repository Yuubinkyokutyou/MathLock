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

  async updateSettings(updates) {
    const currentSettings = await this.getSettings();
    const newSettings = { ...currentSettings, ...updates };
    return await this.saveSettings(newSettings);
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

  async removeFromBlacklist(id) {
    const settings = await this.getSettings();
    settings.blacklist = settings.blacklist.filter(item => item.id !== id);
    await this.saveSettings(settings);
  }

  async removeFromWhitelist(id) {
    const settings = await this.getSettings();
    settings.whitelist = settings.whitelist.filter(item => item.id !== id);
    await this.saveSettings(settings);
  }

  async toggleBlacklistItem(id) {
    const settings = await this.getSettings();
    const item = settings.blacklist.find(item => item.id === id);
    if (item) {
      item.enabled = !item.enabled;
      await this.saveSettings(settings);
    }
  }

  async toggleWhitelistItem(id) {
    const settings = await this.getSettings();
    const item = settings.whitelist.find(item => item.id === id);
    if (item) {
      item.enabled = !item.enabled;
      await this.saveSettings(settings);
    }
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

  async clearAllTempAccess() {
    await chrome.storage.local.set({ tempAccess: {} });
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}