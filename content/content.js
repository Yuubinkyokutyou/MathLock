let challengeModal = null;
let isProcessing = false;

async function checkAndBlockPage() {
  if (isProcessing) return;
  isProcessing = true;
  
  const currentURL = window.location.href;
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkURL',
      url: currentURL
    });
    
    if (response && response.shouldBlock) {
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
  } catch (error) {
    console.error('Error checking URL:', error);
  } finally {
    isProcessing = false;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showChallenge') {
    checkAndBlockPage();
  }
  return true;
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