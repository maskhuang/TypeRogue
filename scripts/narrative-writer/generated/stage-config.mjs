// Auto-derived from docs/narrative-design.md v4.1 (LOCKED 2026-05-04) + Cycle 词典
// (DAY/BATCH/CYCLE/A · feedback_ui_label_vocabulary.md)
//
// v3.1 → v4.1 校准：
//   - "月初/月中/月底/月度考核" → BATCH 1-4 段（v4.1 词典）
//   - "主任突袭" / "月度考核官" 移除——v4.1 公司 = C1 整体性 character（D14 v2 + D21：no specific decision-maker / banal evil 没有 villain face）
//   - cycles 重命名："文字工匠 / 异体抄录员" 替换为 v4.1 5 工种阶梯（recorder/proofreader/reviser/author/assimilated）
//   - hook 重写——去掉"你已经..."第二人称叙事腔（§6.6 玩家无 inner monologue）；改为 V1 boilerplate 第三方观察腔

export const STAGE_CONFIG = {
  // 单 BATCH = 4 幕（与 narrative-design §3 一致）
  "acts": [
    {
      "act": "I · BATCH 早期",
      "stages": "1-4",
      "semantic": "标准词单；同事还在工位；走廊安静",
      "density": "最稀（一关一句 V1 / V5 flavor）"
    },
    {
      "act": "II · BATCH 中段 (Elite)",
      "stages": "5",
      "semantic": "中期抽查 — DPCA 复审节点（公告 + cameo 短句，无 specific persona）",
      "density": "对比节奏：压力"
    },
    {
      "act": "II · BATCH 中段 (Ritual)",
      "stages": "6",
      "semantic": "茶水间内训 — 附注台 / 流程 6（V1 通知 + V5 守则节录）",
      "density": "对比节奏：松懈"
    },
    {
      "act": "III · BATCH 末倒计时",
      "stages": "7-11",
      "semantic": "考核临近；词单变难 / 变怪；同事开始请假 / 消失（C2 peer ghost 退场）",
      "density": "略密 — 消失暗示分布到 V2 同事便条 / 走廊广播 / 桌面留言"
    },
    {
      "act": "IV · BATCH 末考核",
      "stages": "12 (Boss)",
      "semantic": "本批次结算节点。通过 → 进入下 BATCH；失败 → 转岗通知（无 face / no persona · D21 banal evil）",
      "density": "最密（V1 公告 + V6 boss tooltip 反身闭合 attribution）"
    }
  ],
  // 多 CYCLE 弧（v4.1 5 阶梯 / 章节映射）
  "cycles": [
    {
      "cycle": "1",
      "stage": "Ch.1 · recorder（录入员）",
      "unlock": "default",
      "hook": "员工 [工号] 入职 BATCH 1。本工位标准词单。无附注流程。"
    },
    {
      "cycle": "2",
      "stage": "Ch.2 · proofreader（校对者）",
      "unlock": "recorder_clear_ch1",
      "hook": "守则 §044 affirmation：校对者经手词条须复核录入员标记。（denial→affirmation flip · §4.1）"
    },
    {
      "cycle": "3",
      "stage": "Ch.3 · reviser（修改者）",
      "unlock": "proofreader_clear_ch2",
      "hook": "守则 §087 affirmation：修改者经手词条出现非标准结尾时，归入特殊勤务流程。（C2 同事退场加速）"
    },
    {
      "cycle": "4-5",
      "stage": "Ch.4 · author（作者）",
      "unlock": "reviser_clear_ch3",
      "hook": "守则 §122 affirmation：作者工位 typing buffer 显示候选词条；选择哪一项进入下批生效。本工位无创作流程。（V3 anomaly dictation 强化 / V5 退化 / Project Nim L4 reveal 窗口）"
    },
    {
      "cycle": "6+",
      "stage": "Ch.5 · assimilated（文本一部分 / Endless）",
      "unlock": "all_classes_clear",
      "hook": "守则 §144 静默消失（V5 完全退场）。字符级缓变启用。V6 反身闭合 attribution = 玩家以前 endless 工号。（D32 双 voice 同事件最高兑现）"
    }
  ]
}
