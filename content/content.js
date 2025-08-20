let challengeModal = null;
let isProcessing = false;

async function checkAndBlockPage() {
  if (isProcessing) return;
  isProcessing = true;
  
  const currentURL = window.location.href;
  
  try {
    if (!chrome.runtime || !chrome.runtime.id) {
      console.warn('Extension context invalidated');
      isProcessing = false;
      return;
    }
    
    const response = await chrome.runtime.sendMessage({
      action: 'checkURL',
      url: currentURL
    }).catch(error => {
      if (error.message?.includes('Extension context invalidated')) {
        console.warn('Extension reloaded or updated, skipping check');
        return null;
      }
      throw error;
    });
    
    if (response) {
      if (response.error) {
        console.error('Background script error:', response.error);
      } else if (response.shouldBlock) {
        if (!challengeModal) {
          challengeModal = new ChallengeModal();
          await challengeModal.init(currentURL);
        }
      } else {
        if (challengeModal) {
          challengeModal.hide();
          challengeModal.cleanup();
          challengeModal = null;
        }
      }
    }
  } catch (error) {
    console.error('Error checking URL:', error);
    if (challengeModal) {
      challengeModal.hide();
      challengeModal.cleanup();
      challengeModal = null;
    }
  } finally {
    isProcessing = false;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showChallenge') {
    checkAndBlockPage().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      console.error('Error in showChallenge handler:', error);
      sendResponse({ error: error.message });
    });
    return true;
  }
});

let lastURL = window.location.href;
let observer = null;

function setupObserver() {
  if (!observer && document.body) {
    observer = new MutationObserver(() => {
      if (window.location.href !== lastURL) {
        lastURL = window.location.href;
        checkAndBlockPage();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupObserver();
    checkAndBlockPage();
  });
} else {
  setupObserver();
  checkAndBlockPage();
}

window.addEventListener('popstate', checkAndBlockPage);
window.addEventListener('hashchange', checkAndBlockPage);

let navigationCheckTimeout;
document.addEventListener('click', (e) => {
  clearTimeout(navigationCheckTimeout);
  navigationCheckTimeout = setTimeout(() => {
    if (window.location.href !== lastURL) {
      lastURL = window.location.href;
      checkAndBlockPage();
    }
  }, 100);
});