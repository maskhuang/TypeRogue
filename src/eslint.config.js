// ESLint flat config — Stories 59.1 (M-1) + 59.2 (C-4)
// 本配置承载两条架构硬规则，不引入 typescript-eslint/recommended，
// 以便架构违反能被清晰地从噪音中识别出来。
// 后续 story 会追加新的 config object（flat config 用 config object，不是 legacy "overrides"）。
//
// Flat config gotcha: 多个 config object 同时匹配同一个文件时，相同 rule name 的配置
// 会被**后者整体替换**（不是合并）。因此凡属于 core/systems 的文件，必须在唯一那一个
// 覆盖它的 rules 对象里**同时**写上 M-1 和 C-4 两套 pattern —— 拆两个 block 会导致
// 后写的 block 把先写的 block 完全覆盖掉。
//
// 回归保护: `tests/unit/architecture/eslint-rules.test.ts` 用 ESLint API 对本文件的
// 所有硬规则做 fixture 回归，任何对本文件的重构若破坏合并都会触发该测试失败。

import tseslint from 'typescript-eslint';
import globals from 'globals';

// ===== M-1 pattern 与消息 =====
const M1_IMPORT_PATTERN = {
  group: ['pixi.js', '@pixi/*'],
  message:
    '架构规则 M-1: core/ 和 systems/ 不得依赖 PixiJS — 为 Godot 移植保留隔离（见 docs/game-architecture.md §Migration Target）',
};
const M1_SYNTAX_RULES = [
  {
    selector: "ImportExpression[source.value=/^(pixi\\.js|@pixi\\/.+)$/]",
    message:
      '架构规则 M-1: core/ 和 systems/ 不得动态 import PixiJS（见 docs/game-architecture.md §Migration Target）',
  },
  {
    selector:
      "CallExpression[callee.name='require'][arguments.0.value=/^(pixi\\.js|@pixi\\/.+)$/]",
    message:
      '架构规则 M-1: core/ 和 systems/ 不得 require PixiJS（见 docs/game-architecture.md §Migration Target）',
  },
];

// ===== C-4 pattern 与消息 =====
// Pattern 覆盖：裸包名 `aigc-art`、带子路径 `aigc-art/...`、嵌套 `**/aigc-art/**`、
// 相对路径 `../aigc-art/...`（picomatch 对 `../` 前缀的处理由 **/aigc-art/** 兜底）、
// 以及 TS path alias `@aigc-art`（前瞻性兜底，即使当前 tsconfig 无此 alias）。
const C4_IMPORT_PATTERN = {
  group: [
    '**/aigc-art',
    '**/aigc-art/**',
    'aigc-art',
    'aigc-art/**',
    '@aigc-art',
    '@aigc-art/**',
  ],
  message:
    '架构规则 C-4: src/ 不得引用 aigc-art/ — AIGC 是构建期工具链，不是运行时依赖（见 docs/game-architecture.md §AIGC Content Pipeline）',
};
// Regex 与 M-1 对称：锚定首尾，避免误伤 `my-aigc-art-tool` / `./aigc-art-helper` 等合法命名。
// 匹配允许的形式：裸 `aigc-art`、带子路径 `aigc-art/...`、相对路径 `../aigc-art/...`、alias `@aigc-art`。
const C4_PATH_REGEX_LITERAL =
  '/^((\\.{0,2}\\/)+)?(@?aigc-art)(\\/.*)?$/';
const C4_SYNTAX_RULES = [
  {
    selector: `ImportExpression[source.value=${C4_PATH_REGEX_LITERAL}]`,
    message:
      '架构规则 C-4: src/ 不得动态 import aigc-art/（见 docs/game-architecture.md §AIGC Content Pipeline）',
  },
  {
    selector: `CallExpression[callee.name='require'][arguments.0.value=${C4_PATH_REGEX_LITERAL}]`,
    message:
      '架构规则 C-4: src/ 不得 require aigc-art/（见 docs/game-architecture.md §AIGC Content Pipeline）',
  },
];

// ===== 目标文件 glob =====
const C4_TARGET_FILES = [
  'src/**/*.{ts,tsx,mts,cts}',
  'main/**/*.{ts,tsx,mts,cts}',
  'shared/**/*.{ts,tsx,mts,cts}',
  'tests/**/*.{ts,tsx,mts,cts}',
];
const M1_SOURCE_FILES = [
  'src/core/**/*.{ts,tsx,mts,cts}',
  'src/systems/**/*.{ts,tsx,mts,cts}',
];
const M1_TEST_FILES = [
  'tests/unit/core/**/*.{ts,tsx,mts,cts}',
  'tests/unit/systems/**/*.{ts,tsx,mts,cts}',
];

// ===== 规则对象 =====
// C-4 only：对 core/systems 之外的普通 src/main/shared 代码
const c4OnlyRules = {
  'no-restricted-imports': ['error', { patterns: [C4_IMPORT_PATTERN] }],
  'no-restricted-syntax': ['error', ...C4_SYNTAX_RULES],
};
// M-1 + C-4 合并：对 core/systems 的生产与测试代码，必须同时承载两套规则
// （flat config 不会合并同一 rule name 的数组项，所以必须手工合并）
const m1PlusC4Rules = {
  'no-restricted-imports': [
    'error',
    { patterns: [M1_IMPORT_PATTERN, C4_IMPORT_PATTERN] },
  ],
  'no-restricted-syntax': [
    'error',
    ...M1_SYNTAX_RULES,
    ...C4_SYNTAX_RULES,
  ],
};

// ===== languageOptions 公共片段 =====
const BASE_LANGUAGE_OPTIONS = {
  parser: tseslint.parser,
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
};

// 共用的 plugin + linterOptions —— 注册 typescript-eslint plugin 但不启用任何规则，
// 使历史代码里已有的 `eslint-disable-next-line @typescript-eslint/*` 指令不会报 "rule not found"。
const SHARED_PLUGIN_BLOCK = {
  plugins: {
    '@typescript-eslint': tseslint.plugin,
  },
  linterOptions: {
    reportUnusedDisableDirectives: 'off',
  },
};

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-electron/**',
      'dist-web/**',
      'release/**',
      'node_modules/**',
      '**/*.d.ts',
      'eslint.config.js',
    ],
  },
  // ----- 环境 A: renderer + tests（浏览器 + node globals） -----
  // src/ 是 PixiJS renderer + Vitest 测试，两者均跑在 JSDOM/Node 混合环境
  {
    files: [
      'src/**/*.{ts,tsx,mts,cts}',
      'tests/**/*.{ts,tsx,mts,cts}',
    ],
    languageOptions: {
      ...BASE_LANGUAGE_OPTIONS,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    ...SHARED_PLUGIN_BLOCK,
    rules: {},
  },
  // ----- 环境 B: Electron main process（仅 node globals） -----
  // Electron main 是纯 Node 环境，没有 window/document/navigator
  {
    files: ['main/**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      ...BASE_LANGUAGE_OPTIONS,
      globals: {
        ...globals.node,
      },
    },
    ...SHARED_PLUGIN_BLOCK,
    rules: {},
  },
  // ----- 环境 C: shared 通用类型/常量（仅 node globals，无浏览器耦合） -----
  {
    files: ['shared/**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      ...BASE_LANGUAGE_OPTIONS,
      globals: {
        ...globals.node,
      },
    },
    ...SHARED_PLUGIN_BLOCK,
    rules: {},
  },
  // ===== 架构规则 C-4（广义运行时代码） =====
  // 拦截 src/ + main/ + shared/ + tests/ 对 aigc-art/ 的任何引用（static / dynamic / require）。
  {
    files: C4_TARGET_FILES,
    rules: c4OnlyRules,
  },
  // ===== 架构规则 M-1 + C-4（core/systems 生产代码） =====
  // 必须合并两套 pattern，否则 flat config 会用本 block 的 rules 整体覆盖上一 block 的 C-4。
  {
    files: M1_SOURCE_FILES,
    rules: m1PlusC4Rules,
  },
  // ===== 架构规则 M-1 + C-4（core/systems 测试代码） =====
  // 同上：避免有人用 mock 把 pixi / aigc-art 依赖悄悄引入测试假设。
  {
    files: M1_TEST_FILES,
    rules: m1PlusC4Rules,
  },
);
