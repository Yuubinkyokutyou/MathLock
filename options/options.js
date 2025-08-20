let currentSettings = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  attachEventListeners();
  updateUI();
});

async function loadSettings() {
  currentSettings = await getSettings();
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      resolve(response.settings);
    });
  });
}

async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'saveSettings', settings }, (response) => {
      resolve(response.success);
    });
  });
}

function attachEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTab(e.target.dataset.tab);
    });
  });
  
  const requiredCountSlider = document.getElementById('required-count');
  requiredCountSlider.addEventListener('input', (e) => {
    document.getElementById('required-count-value').textContent = `${e.target.value}問`;
    currentSettings.problemConfig.requiredCount = parseInt(e.target.value);
  });
  
  document.getElementById('access-duration').addEventListener('input', (e) => {
    currentSettings.accessDuration = parseInt(e.target.value);
  });
  
  document.querySelectorAll('input[name="difficulty"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentSettings.problemConfig.difficulty = parseInt(e.target.value);
    });
  });
  
  document.getElementById('op-addition').addEventListener('change', (e) => {
    currentSettings.problemConfig.operations.addition = e.target.checked;
  });
  
  document.getElementById('op-subtraction').addEventListener('change', (e) => {
    currentSettings.problemConfig.operations.subtraction = e.target.checked;
  });
  
  document.getElementById('op-multiplication').addEventListener('change', (e) => {
    currentSettings.problemConfig.operations.multiplication = e.target.checked;
  });
  
  document.getElementById('op-division').addEventListener('change', (e) => {
    currentSettings.problemConfig.operations.division = e.target.checked;
  });
  
  document.getElementById('blacklist-add').addEventListener('click', () => {
    const input = document.getElementById('blacklist-input');
    const pattern = input.value.trim();
    if (pattern && isValidRegex(pattern)) {
      addToBlacklist(pattern);
      input.value = '';
    } else {
      showToast('無効な正規表現パターンです', 'error');
    }
  });
  
  document.getElementById('whitelist-add').addEventListener('click', () => {
    const input = document.getElementById('whitelist-input');
    const pattern = input.value.trim();
    if (pattern && isValidRegex(pattern)) {
      addToWhitelist(pattern);
      input.value = '';
    } else {
      showToast('無効な正規表現パターンです', 'error');
    }
  });
  
  document.getElementById('save-settings').addEventListener('click', async () => {
    const operations = currentSettings.problemConfig.operations;
    if (!operations.addition && !operations.subtraction && 
        !operations.multiplication && !operations.division) {
      showToast('少なくとも1つの演算を選択してください', 'error');
      return;
    }
    
    const success = await saveSettings(currentSettings);
    if (success) {
      showToast('設定を保存しました', 'success');
    } else {
      showToast('設定の保存に失敗しました', 'error');
    }
  });
  
  document.getElementById('reset-settings').addEventListener('click', async () => {
    if (confirm('本当に初期設定に戻しますか？')) {
      currentSettings = {
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
      
      const success = await saveSettings(currentSettings);
      if (success) {
        updateUI();
        showToast('初期設定に戻しました', 'success');
      }
    }
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(tabName).classList.add('active');
}

function updateUI() {
  document.getElementById('required-count').value = currentSettings.problemConfig.requiredCount;
  document.getElementById('required-count-value').textContent = `${currentSettings.problemConfig.requiredCount}問`;
  document.getElementById('access-duration').value = currentSettings.accessDuration;
  
  document.querySelector(`input[name="difficulty"][value="${currentSettings.problemConfig.difficulty}"]`).checked = true;
  
  document.getElementById('op-addition').checked = currentSettings.problemConfig.operations.addition;
  document.getElementById('op-subtraction').checked = currentSettings.problemConfig.operations.subtraction;
  document.getElementById('op-multiplication').checked = currentSettings.problemConfig.operations.multiplication;
  document.getElementById('op-division').checked = currentSettings.problemConfig.operations.division;
  
  renderBlacklist();
  renderWhitelist();
}

function renderBlacklist() {
  const container = document.getElementById('blacklist-items');
  container.innerHTML = '';
  
  if (currentSettings.blacklist.length === 0) {
    container.innerHTML = '<div class="empty-state">ブラックリストは空です</div>';
    return;
  }
  
  currentSettings.blacklist.forEach(item => {
    const element = createListItem(item, 'blacklist');
    container.appendChild(element);
  });
}

function renderWhitelist() {
  const container = document.getElementById('whitelist-items');
  container.innerHTML = '';
  
  if (currentSettings.whitelist.length === 0) {
    container.innerHTML = '<div class="empty-state">ホワイトリストは空です</div>';
    return;
  }
  
  currentSettings.whitelist.forEach(item => {
    const element = createListItem(item, 'whitelist');
    container.appendChild(element);
  });
}

function createListItem(item, listType) {
  const div = document.createElement('div');
  div.className = 'list-item';
  
  div.innerHTML = `
    <div class="list-item-content">
      <label class="list-item-toggle">
        <input type="checkbox" ${item.enabled ? 'checked' : ''}>
        <span>${item.enabled ? '有効' : '無効'}</span>
      </label>
      <span class="list-item-pattern">${escapeHtml(item.pattern)}</span>
    </div>
    <div class="list-item-actions">
      <button class="list-item-btn delete">削除</button>
    </div>
  `;
  
  const checkbox = div.querySelector('input[type="checkbox"]');
  checkbox.addEventListener('change', (e) => {
    item.enabled = e.target.checked;
    div.querySelector('.list-item-toggle span').textContent = item.enabled ? '有効' : '無効';
  });
  
  const deleteBtn = div.querySelector('.delete');
  deleteBtn.addEventListener('click', () => {
    if (confirm('このパターンを削除しますか？')) {
      if (listType === 'blacklist') {
        currentSettings.blacklist = currentSettings.blacklist.filter(i => i.id !== item.id);
        renderBlacklist();
      } else {
        currentSettings.whitelist = currentSettings.whitelist.filter(i => i.id !== item.id);
        renderWhitelist();
      }
    }
  });
  
  return div;
}

function addToBlacklist(pattern) {
  const newItem = {
    id: Date.now().toString(),
    pattern: pattern,
    enabled: true,
    createdAt: Date.now()
  };
  currentSettings.blacklist.push(newItem);
  renderBlacklist();
}

function addToWhitelist(pattern) {
  const newItem = {
    id: Date.now().toString(),
    pattern: pattern,
    enabled: true,
    createdAt: Date.now()
  };
  currentSettings.whitelist.push(newItem);
  renderWhitelist();
}

function isValidRegex(pattern) {
  try {
    new RegExp(pattern);
    return true;
  } catch (e) {
    return false;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}