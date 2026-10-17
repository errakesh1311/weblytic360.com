/**
 * Identifies traffic that originates from AI assistants and AI search engines.
 *
 * Two distinct signals are captured:
 *   - "referral"  a human clicked a citation inside an AI assistant answer
 *   - "crawler"   an AI bot fetched the page to train on or to cite it
 */

const AI_REFERRERS = [
  { match: /(^|\.)chatgpt\.com$/i, source: 'ChatGPT', vendor: 'OpenAI' },
  { match: /(^|\.)chat\.openai\.com$/i, source: 'ChatGPT', vendor: 'OpenAI' },
  { match: /(^|\.)openai\.com$/i, source: 'OpenAI', vendor: 'OpenAI' },
  { match: /(^|\.)perplexity\.ai$/i, source: 'Perplexity', vendor: 'Perplexity' },
  { match: /(^|\.)claude\.ai$/i, source: 'Claude', vendor: 'Anthropic' },
  { match: /(^|\.)anthropic\.com$/i, source: 'Claude', vendor: 'Anthropic' },
  { match: /(^|\.)gemini\.google\.com$/i, source: 'Gemini', vendor: 'Google' },
  { match: /(^|\.)bard\.google\.com$/i, source: 'Gemini', vendor: 'Google' },
  { match: /(^|\.)copilot\.microsoft\.com$/i, source: 'Copilot', vendor: 'Microsoft' },
  { match: /(^|\.)bing\.com$/i, source: 'Bing Chat', vendor: 'Microsoft', onlyWithParam: true },
  { match: /(^|\.)you\.com$/i, source: 'You.com', vendor: 'You.com' },
  { match: /(^|\.)poe\.com$/i, source: 'Poe', vendor: 'Quora' },
  { match: /(^|\.)phind\.com$/i, source: 'Phind', vendor: 'Phind' },
  { match: /(^|\.)mistral\.ai$/i, source: 'Le Chat', vendor: 'Mistral' },
  { match: /(^|\.)deepseek\.com$/i, source: 'DeepSeek', vendor: 'DeepSeek' },
  { match: /(^|\.)grok\.com$/i, source: 'Grok', vendor: 'xAI' },
  { match: /(^|\.)x\.ai$/i, source: 'Grok', vendor: 'xAI' },
];

const AI_CRAWLERS = [
  { match: /GPTBot/i, source: 'GPTBot', vendor: 'OpenAI' },
  { match: /OAI-SearchBot/i, source: 'OAI-SearchBot', vendor: 'OpenAI' },
  { match: /ChatGPT-User/i, source: 'ChatGPT-User', vendor: 'OpenAI' },
  { match: /ClaudeBot/i, source: 'ClaudeBot', vendor: 'Anthropic' },
  { match: /Claude-Web/i, source: 'Claude-Web', vendor: 'Anthropic' },
  { match: /anthropic-ai/i, source: 'Anthropic AI', vendor: 'Anthropic' },
  { match: /PerplexityBot/i, source: 'PerplexityBot', vendor: 'Perplexity' },
  { match: /Perplexity-User/i, source: 'Perplexity-User', vendor: 'Perplexity' },
  { match: /Google-Extended/i, source: 'Google-Extended', vendor: 'Google' },
  { match: /GoogleOther/i, source: 'GoogleOther', vendor: 'Google' },
  { match: /Applebot-Extended/i, source: 'Applebot-Extended', vendor: 'Apple' },
  { match: /Bytespider/i, source: 'Bytespider', vendor: 'ByteDance' },
  { match: /CCBot/i, source: 'CCBot', vendor: 'Common Crawl' },
  { match: /Amazonbot/i, source: 'Amazonbot', vendor: 'Amazon' },
  { match: /meta-externalagent/i, source: 'Meta AI', vendor: 'Meta' },
  { match: /FacebookBot/i, source: 'Meta AI', vendor: 'Meta' },
  { match: /cohere-ai/i, source: 'Cohere', vendor: 'Cohere' },
  { match: /DuckAssistBot/i, source: 'DuckAssist', vendor: 'DuckDuckGo' },
  { match: /YouBot/i, source: 'YouBot', vendor: 'You.com' },
  { match: /MistralAI-User/i, source: 'Mistral', vendor: 'Mistral' },
];

/**
 * Classifies a referrer hostname as an AI assistant referral.
 * Returns null when the host is not a known AI surface.
 */
function classifyReferrer(host, fullReferrer = '') {
  if (!host) return null;

  for (const entry of AI_REFERRERS) {
    if (!entry.match.test(host)) continue;

    // Bing only counts when the chat surface is indicated in the URL,
    // otherwise it is ordinary web search.
    if (entry.onlyWithParam && !/[?&](form=[^&]*chat|showconv)/i.test(fullReferrer)) {
      return null;
    }

    return { source: entry.source, vendor: entry.vendor, kind: 'referral' };
  }

  return null;
}

/** Classifies a user-agent string as a known AI crawler. */
function classifyCrawler(userAgent = '') {
  if (!userAgent) return null;

  for (const entry of AI_CRAWLERS) {
    if (entry.match.test(userAgent)) {
      return { source: entry.source, vendor: entry.vendor, kind: 'crawler' };
    }
  }

  return null;
}

/**
 * Full classification for an incoming hit.
 * Crawlers take precedence because they never carry a referrer.
 */
function classify({ referrerHost, referrer, userAgent }) {
  return classifyCrawler(userAgent) || classifyReferrer(referrerHost, referrer);
}

module.exports = {
  classify,
  classifyReferrer,
  classifyCrawler,
  AI_REFERRERS,
  AI_CRAWLERS,
};
