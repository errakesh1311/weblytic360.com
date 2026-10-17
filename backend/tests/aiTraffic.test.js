const test = require('node:test');
const assert = require('node:assert');

const { classify, classifyReferrer, classifyCrawler } = require('../src/services/aiTraffic');

test('classifyReferrer recognises AI assistant hosts', () => {
  assert.deepStrictEqual(classifyReferrer('chatgpt.com'), {
    source: 'ChatGPT',
    vendor: 'OpenAI',
    kind: 'referral',
  });

  assert.strictEqual(classifyReferrer('www.perplexity.ai').source, 'Perplexity');
  assert.strictEqual(classifyReferrer('gemini.google.com').vendor, 'Google');
});

test('classifyReferrer ignores ordinary search and unknown hosts', () => {
  assert.strictEqual(classifyReferrer('google.com'), null);
  assert.strictEqual(classifyReferrer('news.ycombinator.com'), null);
  assert.strictEqual(classifyReferrer(''), null);
});

test('classifyReferrer only counts Bing when the chat surface is indicated', () => {
  assert.strictEqual(classifyReferrer('bing.com', 'https://bing.com/search?q=weblytic'), null);
  assert.strictEqual(
    classifyReferrer('bing.com', 'https://bing.com/search?q=weblytic&form=NEWCHAT')?.source,
    'Bing Chat'
  );
});

test('a lookalike domain is not mistaken for the real assistant', () => {
  assert.strictEqual(classifyReferrer('notchatgpt.com'), null);
  assert.strictEqual(classifyReferrer('chatgpt.com.evil.example'), null);
});

test('classifyCrawler recognises known AI bots', () => {
  assert.strictEqual(
    classifyCrawler('Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)').source,
    'GPTBot'
  );
  assert.strictEqual(classifyCrawler('ClaudeBot/1.0').vendor, 'Anthropic');
  assert.strictEqual(classifyCrawler('PerplexityBot/1.0').kind, 'crawler');
  assert.strictEqual(classifyCrawler('Mozilla/5.0 Chrome/120 Safari/537.36'), null);
});

test('classify prefers the crawler signal over any referrer', () => {
  const result = classify({
    userAgent: 'ClaudeBot/1.0',
    referrerHost: 'chatgpt.com',
    referrer: 'https://chatgpt.com/',
  });

  assert.strictEqual(result.source, 'ClaudeBot');
  assert.strictEqual(result.kind, 'crawler');
});

test('classify returns null for ordinary human traffic', () => {
  assert.strictEqual(
    classify({ userAgent: 'Mozilla/5.0 Chrome/120', referrerHost: 'google.com' }),
    null
  );
});
