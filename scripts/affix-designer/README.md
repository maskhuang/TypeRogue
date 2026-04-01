# AI 词条批量设计工作流

全自动流水线：AI 设计词条 → AI 评审 → 写 BMAD epic/story → `claude -p` 逐个实现 → 代码评审 → commit → 等待人工 push。

## 快速开始

```bash
cd scripts/affix-designer && npm install
export ANTHROPIC_API_KEY=sk-ant-...

node run.mjs                           # 全自动：设计 3 个词条 + 实现 + 评审 + commit
node run.mjs --count 5                 # 批量 5 个
node run.mjs --category rhythm         # 只设计节奏型
node run.mjs --theme "防御/生存"       # 按主题
node run.mjs --design-only             # 只设计不实现
node run.mjs --no-bmad                 # 跳过 BMAD，只生成代码到 output/
```

## 完整流程

```
run.mjs 全自动执行：

  Phase 1    AI 设计词条 (Claude API)
  Phase 2    AI 对抗性评审 + 子系统评估 (Claude API)
  Phase 2b   AI 设计子系统遗物 (Claude API, 条件分支)
  ─────────────────────────────────────────────
  Phase 3a   写 Epic           → docs/epics.md
  Phase 3b   更新 sprint-status → docs/stories/sprint-status.yaml
  Phase 3c   创建 story 文件    → docs/stories/*.md
  Phase 3d   逐个实现 story    → claude -p (dev-story)
  Phase 3e   代码评审          → claude -p (code-review)
  Phase 3f   git commit        → 自动提交

人工：
  评审 commit → git push origin main
```

## 选项

| 选项 | 说明 |
|------|------|
| `-n, --count N` | 词条数量 (默认 3) |
| `-c, --category` | 限定类别 |
| `-t, --theme` | 设计主题 |
| `--design-only` | 只设计 |
| `--skip-review` | 跳过评审 |
| `--no-subsystem` | 跳过子系统评估 |
| `--no-bmad` | 不走 BMAD，只生成代码到 output/ |
| `--from-file PATH` | 从已有设计继续 |
| `-m, --model` | Claude 模型 (默认 sonnet) |
