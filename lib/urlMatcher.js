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

  isValidRegex(pattern) {
    try {
      new RegExp(pattern);
      return true;
    } catch (error) {
      return false;
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

  clearCache() {
    this.cache.clear();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = URLMatcher;
}