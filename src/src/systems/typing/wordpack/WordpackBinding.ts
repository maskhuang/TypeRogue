// Story 59.5 — WordpackBinding
//
// 生命周期:
//   Meta   → 持有 Registry + 解锁列表
//   Run    → 开始时 bind(pack)，结束时 unbind()
//   Battle → 只读 current()
//
// 单一绑定：一次只能有一个 active pack。bind() 已绑定时报错而非静默覆盖，
// 防止 Run 内途误调用。

import type { Wordpack } from './types'

export class WordpackBinding {
  private active: Wordpack | null = null

  bind(pack: Wordpack): void {
    if (this.active !== null) {
      throw new Error(
        `WordpackBinding.bind: already bound to '${this.active.id}'; call unbind() first`,
      )
    }
    this.active = pack
  }

  current(): Wordpack | null {
    return this.active
  }

  unbind(): void {
    this.active = null
  }

  isBound(): boolean {
    return this.active !== null
  }
}
