document.addEventListener('DOMContentLoaded', async () => {
  await updateStatus();
  attachEventListeners();
});

async function updateStatus() {
  try {
    const settings = await getSettings();
    
    document.getElementById('blacklist-count').textContent = `${settings.blacklist.length}件`;
    document.getElementById('whitelist-count').textContent = `${settings.whitelist.length}件`;
    document.getElementById('problem-count').textContent = `${settings.problemConfig.requiredCount}問`;
    document.getElementById('difficulty').textContent = `レベル${settings.problemConfig.difficulty}`;
  } catch (error) {
    console.error('Error updating status:', error);
  }
}

async function getSettings() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response.settings);
      }
    });
  });
}

function attachEventListeners() {
  document.getElementById('add-current-domain').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        const url = new URL(tab.url);
        const domain = url.hostname;
        const pattern = createPatternForDomain(domain);
        
        const settings = await getSettings();
        const alreadyExists = settings.blacklist.some(item => item.pattern === pattern);
        
        if (!alreadyExists) {
          await addToBlacklist(pattern);
          await updateStatus();
          showMessage(`${domain}をブロックリストに追加しました`);
        } else {
          showMessage('このドメインは既にブロックリストに存在します');
        }
      }
    } catch (error) {
      console.error('Error adding domain:', error);
      showMessage('ドメインの追加に失敗しました');
    }
  });
  
  document.getElementById('clear-temp-access').addEventListener('click', async () => {
    try {
      await chrome.storage.local.set({ tempAccess: {} });
      showMessage('一時アクセスをクリアしました');
    } catch (error) {
      console.error('Error clearing temp access:', error);
      showMessage('クリアに失敗しました');
    }
  });
  
  document.getElementById('open-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

function createPatternForDomain(domain) {
  const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `^https?://([^/]*\\.)?${escapedDomain}(/.*)?$`;
}

async function addToBlacklist(pattern) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'saveSettings',
      settings: null
    }, async () => {
      const settings = await getSettings();
      settings.blacklist.push({
        id: Date.now().toString(),
        pattern: pattern,
        enabled: true,
        createdAt: Date.now()
      });
      
      chrome.runtime.sendMessage({
        action: 'saveSettings',
        settings: settings
      }, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error('Failed to save settings'));
        }
      });
    });
  });
}

function showMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #4a5568;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 1000;
    animation: slideUp 0.3s ease-out;
  `;
  messageDiv.textContent = message;
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.style.animation = 'slideUp 0.3s ease-out reverse';
    setTimeout(() => {
      messageDiv.remove();
      style.remove();
    }, 300);
  }, 2000);
}