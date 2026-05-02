// ============================================
// 一次性"任意键跳过"工具，用于 act 过渡 / boss 入场 / 关卡公告 / 结算 teletype
// ============================================
// 共享原语：installSkipListener() 装一次 keydown trap，返回 controller。
// 调用方在每个 await 前用 controller.sleep(ms) 替代裸 setTimeout，
// 在循环 / 打字 tick 里 check controller.skipped 决定是否瞬间快进。
// 完成后 controller.dispose() 卸载监听。

export interface SkipController {
  /** 是否已被按键标记为跳过（一旦 true 永远 true，直到 dispose） */
  readonly skipped: boolean;
  /** 跳过感知的 sleep —— 已 skipped 立即 resolve；sleep 中 skipped 也立即 resolve */
  sleep(ms: number): Promise<void>;
  /** 注册一次性 skip 回调；已 skipped 时立即同步触发，否则 skip 时调用一次 */
  onSkip(cb: () => void): void;
  /** 卸载 keydown 监听；caller 必须在动画结束 / 异常 finally 调一次 */
  dispose(): void;
}

/**
 * 装一次性"任意非修饰键 → 跳过"的 keydown 监听。capture 阶段 attach，
 * 避免被战斗 / 终端等下游 typing handler 先吞掉。修饰键（Shift/Ctrl/Alt/Meta）
 * 单独按下时不算跳过，避免误触。
 */
export function installSkipListener(): SkipController {
  let skipped = false;
  const pendingResolvers: Array<() => void> = [];
  const skipCallbacks: Array<() => void> = [];

  const onKey = (e: KeyboardEvent): void => {
    if (skipped) return;
    if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
    skipped = true;
    document.removeEventListener('keydown', onKey, true);
    while (pendingResolvers.length) {
      const r = pendingResolvers.shift();
      if (r) r();
    }
    while (skipCallbacks.length) {
      const cb = skipCallbacks.shift();
      if (cb) {
        try { cb(); } catch { /* swallow — 单 cb 报错不应连累其他 */ }
      }
    }
  };
  document.addEventListener('keydown', onKey, true);

  return {
    get skipped(): boolean { return skipped; },
    sleep(ms: number): Promise<void> {
      if (skipped) return Promise.resolve();
      return new Promise(resolve => {
        let resolved = false;
        const finish = (): void => {
          if (resolved) return;
          resolved = true;
          resolve();
        };
        pendingResolvers.push(finish);
        setTimeout(finish, ms);
      });
    },
    onSkip(cb: () => void): void {
      if (skipped) { try { cb(); } catch { /* swallow */ } return; }
      skipCallbacks.push(cb);
    },
    dispose(): void {
      document.removeEventListener('keydown', onKey, true);
    },
  };
}
