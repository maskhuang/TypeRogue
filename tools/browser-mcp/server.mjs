#!/usr/bin/env node
// ============================================
// TypeRogue Browser MCP Server
// ============================================
// 提供浏览器交互能力：截图、点击、打字、执行 JS、等待元素
// 用于 AI 自动化游戏交互和构筑截图

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const SCREENSHOT_DIR = resolve('screenshots');
if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });

let browser = null;
let page = null;

// ==========================================
// Browser lifecycle
// ==========================================

async function ensureBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({ headless: false, args: ['--window-size=960,680'] });
    const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
    page = await ctx.newPage();
  }
  return page;
}

async function getPage() {
  if (!page || page.isClosed()) {
    return ensureBrowser();
  }
  return page;
}

// ==========================================
// MCP Server
// ==========================================

const server = new McpServer({
  name: 'typerogue-browser',
  version: '1.0.0',
});

// --- Tool: launch ---
server.tool(
  'browser_launch',
  'Launch browser and navigate to game URL',
  { url: z.string().default('http://localhost:3000').describe('Game URL') },
  async ({ url }) => {
    const p = await ensureBrowser();
    await p.goto(url, { waitUntil: 'networkidle' });
    return { content: [{ type: 'text', text: `Browser launched at ${url}` }] };
  }
);

// --- Tool: screenshot ---
server.tool(
  'browser_screenshot',
  'Take a screenshot of the current page (or a specific element)',
  {
    selector: z.string().optional().describe('CSS selector to screenshot (omit for full page)'),
    name: z.string().default('screenshot').describe('Filename (without extension)'),
  },
  async ({ selector, name }) => {
    const p = await getPage();
    const filename = `${name}-${Date.now()}.png`;
    const filepath = join(SCREENSHOT_DIR, filename);

    if (selector) {
      const el = await p.$(selector);
      if (!el) return { content: [{ type: 'text', text: `Element not found: ${selector}` }] };
      await el.screenshot({ path: filepath });
    } else {
      await p.screenshot({ path: filepath });
    }

    // Return as base64 image
    const buf = readFileSync(filepath);
    return {
      content: [
        { type: 'text', text: `Screenshot saved: ${filepath}` },
        { type: 'image', data: buf.toString('base64'), mimeType: 'image/png' },
      ],
    };
  }
);

// --- Tool: click ---
server.tool(
  'browser_click',
  'Click an element on the page',
  {
    selector: z.string().describe('CSS selector to click'),
    delay: z.number().default(0).describe('Delay after click (ms)'),
  },
  async ({ selector, delay }) => {
    const p = await getPage();
    try {
      await p.click(selector, { timeout: 5000 });
      if (delay > 0) await p.waitForTimeout(delay);
      return { content: [{ type: 'text', text: `Clicked: ${selector}` }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Click failed: ${e.message}` }] };
    }
  }
);

// --- Tool: type_keys ---
server.tool(
  'browser_type',
  'Type text character by character (simulates keyboard input for the typing game)',
  {
    text: z.string().describe('Text to type'),
    delay: z.number().default(80).describe('Delay between keystrokes (ms)'),
  },
  async ({ text, delay }) => {
    const p = await getPage();
    for (const char of text) {
      await p.keyboard.press(char === ' ' ? 'Space' : char);
      if (delay > 0) await p.waitForTimeout(delay);
    }
    return { content: [{ type: 'text', text: `Typed: "${text}" (${text.length} chars, ${delay}ms delay)` }] };
  }
);

// --- Tool: press_key ---
server.tool(
  'browser_press',
  'Press a single key (Enter, Escape, ArrowUp, etc.)',
  { key: z.string().describe('Key name (e.g. Enter, Escape, Tab, ArrowUp)') },
  async ({ key }) => {
    const p = await getPage();
    await p.keyboard.press(key);
    return { content: [{ type: 'text', text: `Pressed: ${key}` }] };
  }
);

// --- Tool: evaluate ---
server.tool(
  'browser_evaluate',
  'Execute JavaScript in the page context and return the result',
  { script: z.string().describe('JavaScript code to evaluate') },
  async ({ script }) => {
    const p = await getPage();
    try {
      const result = await p.evaluate(script);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) ?? 'undefined' }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Eval error: ${e.message}` }] };
    }
  }
);

// --- Tool: wait ---
server.tool(
  'browser_wait',
  'Wait for a selector to appear or a fixed time',
  {
    selector: z.string().optional().describe('CSS selector to wait for'),
    timeout: z.number().default(3000).describe('Max wait time (ms)'),
  },
  async ({ selector, timeout }) => {
    const p = await getPage();
    try {
      if (selector) {
        await p.waitForSelector(selector, { timeout });
        return { content: [{ type: 'text', text: `Found: ${selector}` }] };
      } else {
        await p.waitForTimeout(timeout);
        return { content: [{ type: 'text', text: `Waited ${timeout}ms` }] };
      }
    } catch (e) {
      return { content: [{ type: 'text', text: `Wait failed: ${e.message}` }] };
    }
  }
);

// --- Tool: get_text ---
server.tool(
  'browser_get_text',
  'Get text content of an element',
  { selector: z.string().describe('CSS selector') },
  async ({ selector }) => {
    const p = await getPage();
    try {
      const text = await p.$eval(selector, el => el.textContent?.trim() ?? '');
      return { content: [{ type: 'text', text }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Not found: ${selector}` }] };
    }
  }
);

// --- Tool: get_state ---
server.tool(
  'browser_get_state',
  'Get current game state summary (score, combo, gold, level, skills, relics)',
  {},
  async () => {
    const p = await getPage();
    try {
      const state = await p.evaluate(() => {
        // Access game state from window (requires exposing it)
        const s = window.__debugState?.();
        if (s) return s;
        // Fallback: read from DOM
        const getText = (id) => document.getElementById(id)?.textContent?.trim() ?? '';
        return {
          score: getText('score-count'),
          target: getText('target-score'),
          combo: getText('combo-count'),
          timer: getText('timer-display'),
          level: getText('level-label'),
          gold: getText('shop-gold'),
          phase: document.querySelector('.screen[style*="flex"]')?.id ?? 'unknown',
        };
      });
      return { content: [{ type: 'text', text: JSON.stringify(state, null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `State error: ${e.message}` }] };
    }
  }
);

// --- Tool: drag ---
server.tool(
  'browser_drag',
  'Drag an element to another element (for skill binding)',
  {
    from: z.string().describe('CSS selector of drag source'),
    to: z.string().describe('CSS selector of drop target'),
  },
  async ({ from, to }) => {
    const p = await getPage();
    try {
      const fromEl = await p.$(from);
      const toEl = await p.$(to);
      if (!fromEl || !toEl) return { content: [{ type: 'text', text: `Element not found` }] };

      const fromBox = await fromEl.boundingBox();
      const toBox = await toEl.boundingBox();
      if (!fromBox || !toBox) return { content: [{ type: 'text', text: `Cannot get bounding box` }] };

      await p.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
      await p.mouse.down();
      await p.waitForTimeout(100);
      await p.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 10 });
      await p.waitForTimeout(100);
      await p.mouse.up();

      return { content: [{ type: 'text', text: `Dragged ${from} → ${to}` }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Drag failed: ${e.message}` }] };
    }
  }
);

// --- Tool: close ---
server.tool(
  'browser_close',
  'Close the browser',
  {},
  async () => {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
    }
    return { content: [{ type: 'text', text: 'Browser closed' }] };
  }
);

// ==========================================
// Start server
// ==========================================

const transport = new StdioServerTransport();
await server.connect(transport);
