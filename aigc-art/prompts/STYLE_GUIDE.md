# 活字大教堂 · 美术风格指导
# The Ironpress Cathedral — Art Style Reference for Prompt Writing

本文档是所有 AIGC art prompt 的上游参考。写新 prompt 时从这里取材，不要从零发明。

---

## 1. 世界观视觉身份

活字大教堂 = **罗曼式教堂的体量 × 哥特式铸铁装饰 × 维多利亚工业引擎**。整栋建筑就是一台巨型引擎。

### 建筑风格选择

| 取什么 | 从哪取 | 为什么 |
|---|---|---|
| 厚墙、圆拱、筒形穹窿、堡垒感 | **罗曼式** | 封闭、沉重、暗、压迫 |
| 镂空花纹、肋条装饰 | **哥特式**（仅装饰） | 铸铁上的精细花纹 |
| 穹顶（引擎核心层） | **拜占庭** | Abbey Mills 参考 |
| 铸铁、铆钉、管道、齿轮 | **维多利亚工业** | 材质和机械 |

**不用哥特式的**：尖拱结构、飞扶壁、大窗——这些追求光和高度，与我们要的暗和重相反。

### 融合规则

| 教堂元素 | 工业化变体 | prompt 写法 |
|---|---|---|
| 厚石柱 | 铸铁柱+铆钉 | `cast iron columns with Romanesque arcading` |
| 圆拱 | 铆接铁拱 | `riveted iron Romanesque round arches` |
| 筒形穹窿 | 铁板穹窿+管道 | `barrel vault of iron plates with copper pipes` |
| 壁龛 | 嵌入式熔炉/字盘格 | `wall alcoves that ARE furnace bays / type case grids` |
| 烛台 | 油灯/蒸汽灯 | `brass oil lamp fixtures on iron brackets` |
| 圣坛 | 排字台/打字机 | `lectern merged with letterpress type tray` |

**测试方法**：看一眼画面，如果能同时说出"这像教堂"和"这像工厂"，就对了。如果只能说出其中一个，就不对。

### 关键区别：不是"教堂里放了机器"

```
✗ 错误：一个罗曼式石头房间，中间放了一台印刷机
✓ 正确：你在一台引擎的内部，引擎的铸铁壁板上有罗曼式圆拱造型
```

墙壁不是"墙壁"——是引擎的外壳。柱子不是"柱子"——是引擎的结构件。每个建筑元素同时是一个机械部件。

---

## 2. 绝对禁止

以下元素永远不出现在活字大教堂的任何画面中：

### 环境
- sky, clouds, sun, moon, stars, sunset, sunrise
- trees, forest, grass, flowers, nature, landscape
- outdoor, open air, horizon line
- window showing outside (窗可以存在但只透出黑暗或对面的墙)

### 材质
- plastic, glass (现代玻璃), neon, LED, chrome
- 任何明显属于 20 世纪以后的材料

### 风格
- cute, kawaii, chibi, anime eyes, bright cheerful colors
- clean/sterile (这里是脏的、用旧的、油渍斑斑的)
- symmetrically perfect (手工制造的东西有不完美)

---

## 3. 材质词汇表

从 `docs/narrative-design.md` 意象池提取，按使用频率排序：

### 金属（最高频）
```
lead (铅) — 暗灰，沉重，键帽/铅字/字模的材质
brass (黄铜) — 温暖金色，框架/灯具/管件/齿轮
iron (铁) — 深灰到黑，柱子/拱门/铆钉/炉体
copper (铜) — 偏红的温暖色，管道/阀门/线路
steel (钢) — 冷蓝灰，精密机械件
```

### 有机材料
```
parchment/vellum (羊皮纸) — 米黄到棕，纸张/经卷
wax (蜡) — 深红(蜡封)/乳白(蜡烛)/琥珀(蜡油)
leather (皮革) — 深棕，装订/扣件/把手
wood (木) — 深色橡木，桌面/货架/框架
ink (墨) — 纯黑，溅墨/渍迹/字迹
oil (油) — 琥珀透明，机油/灯油/润滑
```

### 矿物
```
obsidian (黑曜石) — 纯黑+微光裂纹，引擎核心层专用
brick (砖) — 暗红，铸字坊墙面
stone (石) — 冷灰，收容廊/走廊
```

---

## 4. 光源规则

**绝无自然光。** 所有光源都是人造的/机器产生的。

| 光源 | 色温 | 出现层级 | prompt 写法 |
|---|---|---|---|
| 熔炉/坩埚 | 红橙 (hot) | L1-4 铸字坊 | `molten orange-red glow from crucibles` |
| 油灯 | 温黄 (warm amber) | L5 抄写室 | `warm amber pools from brass oil lamps` |
| 蜡烛 | 暖白 (warm) | L6 收容廊 | `faint warm candlelight, flickering` |
| 蒸汽反光 | 冷蓝+暖铜 | L7-10 机械层 | `cool steel-blue from steam, warm brass reflections` |
| 引擎自发光 | 单点暖光 | L11-12 核心 | `single faint warm glow from the engine heart` |

**共同点**：光源是孤立的池状光，周围是深暗。不要均匀打光。

---

## 5. 层级色彩锚点

每个层级有一个主色调和一个辅助色调（从 resurrect-32 取）：

| 层级 | 主色 | 辅色 | resurrect-32 参考 |
|---|---|---|---|
| L1-4 铸字坊 | 红橙 (熔铅) | 暗铁灰 | `#fb6b1d` + `#3a4466` |
| L5 抄写室 | 琥珀黄 (油灯) | 纸白/棕 | `#f9c22b` + `#ab947a` |
| L6 收容廊 | 冷灰 (石) | 蜡封红 | `#757161` + `#ae2334` |
| L7-10 机械层 | 铜金 (黄铜) | 钢蓝 | `#e6904e` + `#4d9be6` |
| L11-12 核心 | 深黑 | 单点暖光 | `#1a1a2e` + `#f9c22b` |

**规则**：主色占画面 60-70%，辅色占 20-30%，高光/点缀 <10%。

---

## 6. 资产类型 × Prompt 模板

不同资产类型不能共用同一个 shared_positive。以下是按类型分的基础片段：

### 6a. 角色/Sprite
```yaml
shared_positive_sprite: |
  Retro Pixel, pixel art, 16-bit retro game sprite,
  clean silhouette, 1px black outline,
  limited palette 32 colors from resurrect-32,
  centered composition, transparent background,
  crisp pixels, no anti-aliasing, no gradient shading,
  side view, flat shading with 1 highlight tone
```

### 6b. 场景/背景
```yaml
shared_positive_scene: |
  Retro Pixel, pixel art, 16-bit,
  FULLY ENCLOSED INTERIOR, underground cathedral,
  NO sky NO outdoor NO windows showing outside,
  gothic industrial architecture fusion,
  limited palette 32 colors from resurrect-32,
  crisp pixels, no anti-aliasing, flat shading,
  wide aspect ratio 16:9, frontal symmetric composition,
  strong color accent against dark background
```

### 6c. 纹理/UI面板
```yaml
shared_positive_texture: |
  Retro Pixel, pixel art,
  seamless tileable texture, game ui panel material,
  top-down flat view, surface pattern,
  limited palette 32 colors from resurrect-32,
  crisp pixels, no anti-aliasing, flat shading
```

### 6d. 道具/物件
```yaml
shared_positive_prop: |
  Retro Pixel, pixel art, single game prop object,
  gothic industrial aesthetic,
  lead and brass materials, aged and well-used,
  centered on transparent background,
  limited palette 32 colors from resurrect-32,
  crisp pixels, no anti-aliasing, flat shading
```

### 6e. 特效/VFX
```yaml
shared_positive_fx: |
  Retro Pixel, pixel art, single frame vfx,
  centered burst on transparent background,
  limited palette 32 colors from resurrect-32,
  crisp pixels, no anti-aliasing
```

---

## 7. 印刷机视觉参考 · 古腾堡印刷机 (Gutenberg Press)

战斗远景的主体是**古腾堡式螺旋压印机**的工业哥特变体。

### 原型结构与 Prompt 关键词

```
古腾堡印刷机部件（prompt 中使用这些英文词）：

        ┌───┐
        │screw│ ← screw mechanism (压力螺杆)
    ┌───┴───┴───┐
    │ crossbeam  │ ← crossbeam (横梁)
    │            │
    ├────────────┤
    │  platen    │ ← platen (压版，螺杆下方的平板)
    │ ┌────────┐ │
    │ │type bed│ │ ← type bed / chase (字盘，可滑动)
    │ └────────┘ │
    │            │
    └─┤        ├─┘
      │upright │   ← uprights / pillars (立柱)
      │        │
    ══╧════════╧══ ← base frame (底座)
          ←lever   ← lever / pull bar (操作杠杆)
```

prompt 中描述印刷机时必须包含：
```
Gutenberg printing press,
heavy screw press with two thick uprights and crossbeam,
large central screw mechanism at top, flat platen below,
sliding type bed with arranged lead type slugs visible,
```

### 工业哥特变体

游戏中不是木制原型——是**铁铸的教堂尺度放大版**：

| 古腾堡原型 | 活字大教堂变体 | prompt 写法 |
|---|---|---|
| 木质框架 | 铸铁+黄铜框架 | `cast iron frame with brass fittings` |
| 人力螺杆 | 蒸汽/齿轮驱动 | `steam-driven screw mechanism` |
| 桌面尺寸 | 占据教堂中殿 | `cathedral-scale press filling the chamber` |
| 木质立柱 | 铁质哥特尖柱 | `iron uprights shaped like gothic pillars` |
| 手动杠杆 | 活塞/飞轮驱动 | `piston-driven lever mechanism` |
| 手动上墨 | 管道供墨 | `ink fed through copper pipes` |

### 层级 = 引擎的纵向剖面

整栋建筑是一台巨型引擎，外形参考古腾堡印刷机。每层不是"一个房间里有台机器"——你在机器的**内部**，墙壁天花板地板都是机器的组成部分。

```
玩家从外壳向引擎心脏下行：

L1-4  ═══ 外壳/进料口 ═══   熔铅炉嵌在铁壁里，铅字被铸造送入
L5    ═══ 分拣机构   ═══   墙壁就是字盘格——数百个铁格存放铅字
L6    ═══ 锁版机构   ═══   墙壁是密封的铸版框，红蜡封+铁锁
L7-10 ═══ 驱动机构   ═══   墙壁就是齿轮——齿轮后面还是齿轮
L11-12 ══ 螺杆+压版  ═══   穹顶下降的巨型螺杆，底部压版发光
```

| 层级 | 引擎部件 | 你看到的 | 光源 |
|---|---|---|---|
| L1-4 | 外壳/进料 | 铸铁外壳板+嵌入式熔炉+冷却架 | 熔铅橙光（唯一有火的层） |
| L5 | 分拣机构 | 墙面=字盘格，黄铜导轨，排字台 | 油灯琥珀光 |
| L6 | 锁版机构 | 墙面=密封铸版框，蜡封+铁栅+铁锁 | 蜡烛微光 |
| L7-10 | 驱动机构 | 墙面=齿轮阵列，活塞穿过地板天花板 | 加热黄铜+蒸汽蓝光 |
| L11-12 | 螺杆+压版 | 穹顶→巨型螺杆→底部压版发暖光 | 仅压版的微光 |

---

## 8. 使用痕迹（Patina）

所有物件都有使用痕迹——这个世界没有新东西。

```
oil stains (油渍) — 机械件表面
wax drips (蜡滴) — 蜡烛附近
ink marks (墨迹) — 纸面/桌面
soot (煤灰) — 铸字坊区域
patina (铜绿) — 黄铜表面
wear marks (磨损) — 频繁接触的地方（键帽、把手、台阶）
rust (铁锈) — 铁件边缘
```

**规则**：新生成的图如果看起来"太干净了"，需要在后处理中加入 patina。

---

## 9. Prompt 写作检查清单

写完一个新 prompt 后，逐条检查：

- [ ] 用了正确的 shared_positive 片段（sprite/scene/texture/prop/fx）？
- [ ] negative 里排除了天空/户外/自然元素？
- [ ] 指定了光源类型和色温（不是"明亮的"而是"oil lamp warm amber"）？
- [ ] 有色彩锚点（主色+辅色从层级表取）？
- [ ] 描述了融合细节（不是"教堂+工厂"而是"iron gothic arches with bolted joints"）？
- [ ] 提到了使用痕迹（oil stains, wax drips, wear marks）？
- [ ] 没有用被禁止的元素？
- [ ] 对纹理类资产：确认用了 texture 片段而非 sprite 片段？

---

## 10. 真实建筑参考

活字大教堂的视觉不是凭空发明——有真实建筑本身就是教堂×工业融合体。

### 核心参考（prompt 中可直接引用）

| 参考 | 年代 | 特征 | 适用层级 |
|---|---|---|---|
| **Crossness Pumping Station** | 1865 伦敦 | 铸铁哥特镂空柱+彩绘铁拱+蒸汽泵=教堂比例的机械殿堂 | L7-10 机械层 |
| **Abbey Mills Pumping Station** | 1868 伦敦 | 拜占庭穹顶+地下蒸汽锅炉+飞轮="修道院磨坊" | L11-12 核心 |
| **Sloss Furnaces** | 1882 阿拉巴马 | 废弃高炉群+粗铸铁+砖墙+煤灰+红橙炉光 | L1-4 铸字坊 |
| **Plantin-Moretus Museum** | 16C 安特卫普 | 原装排字架+古腾堡印刷机+木质工坊+油灯 | L5 抄写室 |
| **Romanesque undercroft** | 中世纪 | 低肋拱+粗石柱+无窗+烛光+封闭厚重 | L6 收容廊 |

### Prompt 中引用方式

```yaml
# 直接引用建筑名（Flux 模型认识这些建筑）：
pose_hint: |
  interior inspired by Crossness Pumping Station,
  ornate Victorian cast iron columns with gothic tracery,
  ...

# 或描述其特征而不点名：
pose_hint: |
  ornate cast iron columns with decorative gothic piercing,
  painted iron arched ceiling like a Victorian engine house,
  ...
```

### 层级×参考矩阵

| 层级 | 建筑基底 | 工业叠加 | 融合关键词 |
|---|---|---|---|
| L1-4 | Romanesque crypt | Sloss Furnaces | `low stone vault with blast furnace and crucibles` |
| L5 | Monastic scriptorium | Plantin-Moretus workshop | `wood-beamed ceiling with type cases and oil lamps` |
| L6 | Gothic cathedral nave | Bank vault / armory | `tall stone arches with iron-grated sealed cabinets` |
| L7-10 | **Crossness Pumping Station** | Victorian steam engine | `ornate cast iron gothic columns housing steam machinery` |
| L11-12 | **Abbey Mills** domed hall | Original Gutenberg press | `domed obsidian chamber with the primordial press` |

---

## 11. 参考游戏的视觉基调

可在 prompt 中引用（模型认识这些游戏的风格）：

| 游戏 | 可借鉴的方面 | 不借鉴的方面 |
|---|---|---|
| Darkest Dungeon | 暗色调+压迫感+手绘质感 | 它不是像素风 |
| Loop Hero | 像素风+有限色板+怀旧感 | 太明亮太可爱 |
| Papers Please | 官僚压抑感+制度化色调 | 太现代 |
| Blasphemous | 哥特宗教美学+像素风 | 太血腥太裸露 |
| Inscription (by Daniel Mullins) | 纸面+桌面+暗色+卡牌质感 | 3D 而非像素 |
