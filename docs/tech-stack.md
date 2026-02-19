# 打字肉鸽 - 技术栈方案

## 选定方案: 纯 Web

### 技术选型

| 层面 | 技术 | 说明 |
|------|------|------|
| 语言 | TypeScript | 类型安全，重构友好 |
| 构建 | Vite | 快速 HMR，零配置 |
| 样式 | CSS + CSS Variables | 原型已验证，无需框架 |
| 动画 | CSS Animations + JS | 原型已验证效果 |
| 音频 | Web Audio API / Howler.js | 原型用 Web Audio，可升级 |
| 状态 | 原生 (单一状态对象) | 简单游戏无需 Redux 等 |
| 存档 | LocalStorage | 轻量持久化 |

### 项目结构

```
src/
├── index.html
├── main.ts              # 入口
├── style.css            # 全局样式
│
├── core/                # 核心系统
│   ├── state.ts         # 游戏状态
│   ├── constants.ts     # 常量定义
│   └── types.ts         # 类型定义
│
├── systems/             # 游戏系统
│   ├── battle.ts        # 战斗逻辑
│   ├── skills.ts        # 技能系统
│   ├── words.ts         # 词库系统
│   ├── relics.ts        # 遗物系统
│   ├── shop.ts          # 商店系统
│   └── scoring.ts       # 分数计算
│
├── ui/                  # UI 渲染
│   ├── screens.ts       # 屏幕切换
│   ├── battle-ui.ts     # 战斗界面
│   ├── shop-ui.ts       # 商店界面
│   └── hud.ts           # HUD 更新
│
├── effects/             # 特效系统
│   ├── juice.ts         # Juice 动画
│   ├── particles.ts     # 粒子效果
│   ├── sound.ts         # 音效
│   └── shake.ts         # 震动效果
│
├── data/                # 数据定义
│   ├── skills.ts        # 技能数据
│   ├── relics.ts        # 遗物数据
│   ├── words.ts         # 词库数据
│   └── levels.ts        # 关卡配置
│
└── utils/               # 工具函数
    ├── keyboard.ts      # 键盘相邻关系
    ├── random.ts        # 随机工具
    └── storage.ts       # 存档工具
```

### 开发命令

```bash
# 初始化项目
npm create vite@latest typing-roguelike -- --template vanilla-ts

# 开发
npm run dev

# 构建
npm run build

# 预览
npm run preview
```

### 迁移计划

1. **Phase 1**: 搭建项目骨架
   - 创建 Vite 项目
   - 设置 TypeScript 配置
   - 迁移 HTML/CSS

2. **Phase 2**: 拆分模块
   - 将 game.js 拆分为多个模块
   - 添加类型定义
   - 保持功能不变

3. **Phase 3**: 功能迭代
   - 添加新技能/遗物
   - 音效系统升级
   - 数值平衡

### 部署选项

| 平台 | 说明 |
|------|------|
| GitHub Pages | 免费，适合分享测试 |
| Vercel | 免费，自动部署 |
| itch.io | 游戏平台，可获取玩家反馈 |
| 自有服务器 | 完全控制 |

### 性能考虑

- 目标: 60fps 稳定
- 粒子数量限制: <100 同屏
- 动画使用 CSS transform (GPU 加速)
- 避免频繁 DOM 操作 (使用 innerHTML 批量更新)

### 兼容性目标

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+
- 移动端浏览器 (后期适配)
