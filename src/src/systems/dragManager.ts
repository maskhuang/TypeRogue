// ============================================
// 打字肉鸽 - 拖拽管理器 (Epic 17.4)
// ============================================
// 统一拖拽系统：买、卖、绑定、调整全部拖拽

// === 类型定义 ===
export interface DragPayload {
  type: 'shop-item' | 'skill-inventory' | 'skill-key' | 'word';
  itemIndex?: number;
  skillId?: string;
  sourceKey?: string;
  word?: string;
  wordIndex?: number;
  cost?: number;
  label: string;    // 显示在幽灵元素中
  icon: string;     // emoji/icon
}

export interface DropZone {
  element: HTMLElement;
  type: 'key-slot' | 'sell-zone' | 'word-deck' | 'skill-inventory';
  key?: string;
  accepts: (payload: DragPayload) => boolean;
  onDrop: (payload: DragPayload) => void;
}

// === 常量 ===
const DRAG_THRESHOLD = 5; // 最小移动距离才启动拖拽

// === DragManager 类 ===
class DragManager {
  private dropZones: DropZone[] = [];
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private payload: DragPayload | null = null;
  private ghost: HTMLElement | null = null;
  private sourceElement: HTMLElement | null = null;
  private currentDropTarget: DropZone | null = null;
  private active = false;

  // 绑定的事件处理器（用于移除）
  private boundMouseDown: ((e: MouseEvent) => void) | null = null;
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundMouseUp: ((e: MouseEvent) => void) | null = null;
  private boundTouchStart: ((e: TouchEvent) => void) | null = null;
  private boundTouchMove: ((e: TouchEvent) => void) | null = null;
  private boundTouchEnd: ((e: TouchEvent) => void) | null = null;

  /** 初始化全局拖拽监听 */
  init(): void {
    if (this.active) return;
    this.active = true;

    this.boundMouseDown = (e: MouseEvent) => this.onPointerDown(e.clientX, e.clientY, e.target as HTMLElement, e);
    this.boundMouseMove = (e: MouseEvent) => this.onPointerMove(e.clientX, e.clientY);
    this.boundMouseUp = () => this.onPointerUp();
    this.boundTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      this.onPointerDown(t.clientX, t.clientY, e.target as HTMLElement, e);
    };
    this.boundTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      this.onPointerMove(t.clientX, t.clientY);
      if (this.isDragging) e.preventDefault();
    };
    this.boundTouchEnd = () => this.onPointerUp();

    document.addEventListener('mousedown', this.boundMouseDown);
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    document.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    document.addEventListener('touchend', this.boundTouchEnd);
  }

  /** 销毁全局监听 */
  destroy(): void {
    if (!this.active) return;
    this.active = false;
    this.cancel();

    if (this.boundMouseDown) document.removeEventListener('mousedown', this.boundMouseDown);
    if (this.boundMouseMove) document.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundMouseUp) document.removeEventListener('mouseup', this.boundMouseUp);
    if (this.boundTouchStart) document.removeEventListener('touchstart', this.boundTouchStart);
    if (this.boundTouchMove) document.removeEventListener('touchmove', this.boundTouchMove);
    if (this.boundTouchEnd) document.removeEventListener('touchend', this.boundTouchEnd);

    this.boundMouseDown = null;
    this.boundMouseMove = null;
    this.boundMouseUp = null;
    this.boundTouchStart = null;
    this.boundTouchMove = null;
    this.boundTouchEnd = null;

    this.clearDropZones();
  }

  /** 注册放置区 */
  registerDropZone(zone: DropZone): void {
    this.dropZones.push(zone);
  }

  /** 清除所有放置区 */
  clearDropZones(): void {
    this.dropZones = [];
  }

  /** 检查当前是否在拖拽中 */
  get dragging(): boolean {
    return this.isDragging;
  }

  // === 内部方法 ===

  private onPointerDown(x: number, y: number, target: HTMLElement, _event: MouseEvent | TouchEvent): void {
    // 查找最近的可拖拽元素
    const draggable = target.closest('[data-drag-type]') as HTMLElement;
    if (!draggable) return;

    // 不拦截锁定按钮和卖出按钮的点击
    if (target.closest('.lock-toggle') || target.closest('.inv-sell')) return;

    const dragType = draggable.dataset.dragType as DragPayload['type'];
    if (!dragType) return;

    this.startX = x;
    this.startY = y;
    this.sourceElement = draggable;

    // 构建 payload
    this.payload = this.buildPayload(draggable, dragType);
    // 不在此处 preventDefault — 让非拖拽的点击正常触发原生 click 事件
  }

  private onPointerMove(x: number, y: number): void {
    if (!this.payload) return;

    if (!this.isDragging) {
      // 检查是否超过阈值
      const dx = x - this.startX;
      const dy = y - this.startY;
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

      // 启动拖拽
      this.isDragging = true;
      this.createGhost(this.payload);
      if (this.sourceElement) this.sourceElement.classList.add('dragging');

      // 拖拽启动后抑制随之而来的 click 事件，防止拖拽结束时误触 onclick
      this.suppressNextClick();

      // 显示卖出区
      const sellZone = document.getElementById('sell-zone');
      if (sellZone) sellZone.classList.add('active');
    }

    // 移动幽灵
    if (this.ghost) {
      this.ghost.style.left = `${x}px`;
      this.ghost.style.top = `${y}px`;
    }

    // 检测放置区
    this.updateDropTarget(x, y);
  }

  private onPointerUp(): void {
    if (this.isDragging && this.currentDropTarget && this.payload) {
      // 执行放置
      this.currentDropTarget.onDrop(this.payload);
    }
    // 非拖拽点击：不手动触发 .click()，让浏览器原生 click 事件正常触发

    this.cancel();
  }

  private cancel(): void {
    // 清理幽灵
    if (this.ghost) {
      this.ghost.remove();
      this.ghost = null;
    }

    // 恢复源元素样式
    if (this.sourceElement) {
      this.sourceElement.classList.remove('dragging');
      this.sourceElement = null;
    }

    // 清理放置区高亮
    this.clearHighlights();

    // 隐藏卖出区
    const sellZone = document.getElementById('sell-zone');
    if (sellZone) {
      sellZone.classList.remove('active');
      sellZone.classList.remove('drag-over');
    }

    this.isDragging = false;
    this.payload = null;
    this.currentDropTarget = null;
  }

  private buildPayload(el: HTMLElement, type: DragPayload['type']): DragPayload | null {
    switch (type) {
      case 'shop-item': {
        const index = parseInt(el.dataset.shopIndex || '-1', 10);
        if (index < 0) return null;
        const label = el.querySelector('.reward-name')?.textContent || '商品';
        const icon = el.querySelector('.reward-icon')?.textContent || '📦';
        const costText = el.querySelector('.reward-cost')?.textContent || '';
        const cost = parseInt(costText.replace(/[^0-9]/g, '') || '0', 10);
        return { type, itemIndex: index, label, icon, cost };
      }
      case 'skill-inventory': {
        const skillId = el.dataset.skillId || '';
        if (!skillId) return null;
        const label = el.querySelector('.inv-name')?.textContent || skillId;
        const icon = el.querySelector('.inv-icon')?.textContent || '⚡';
        return { type, skillId, label, icon };
      }
      case 'skill-key': {
        const key = el.dataset.key || '';
        const skillId = el.dataset.boundSkill || '';
        if (!key || !skillId) return null;
        const icon = el.querySelector('.key-skill')?.textContent || '⚡';
        return { type, sourceKey: key, skillId, label: `[${key.toUpperCase()}]`, icon };
      }
      default:
        return null;
    }
  }

  private createGhost(payload: DragPayload): void {
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'drag-ghost-icon';
    iconSpan.textContent = payload.icon;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'drag-ghost-label';
    labelSpan.textContent = payload.label;

    ghost.appendChild(iconSpan);
    ghost.appendChild(labelSpan);
    ghost.style.position = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '10000';
    document.body.appendChild(ghost);
    this.ghost = ghost;
  }

  private updateDropTarget(x: number, y: number): void {
    let found: DropZone | null = null;

    for (const zone of this.dropZones) {
      const rect = zone.element.getBoundingClientRect();
      const hit = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

      if (hit && this.payload && zone.accepts(this.payload)) {
        found = zone;
        break;
      }
    }

    // 更新高亮
    if (found !== this.currentDropTarget) {
      if (this.currentDropTarget) {
        this.currentDropTarget.element.classList.remove('drop-zone-highlight');
        this.currentDropTarget.element.classList.remove('drag-over');
      }
      if (found) {
        found.element.classList.add('drop-zone-highlight');
        found.element.classList.add('drag-over');
      }
      this.currentDropTarget = found;
    }
  }

  /** 拖拽启动后，抑制紧随其后的一次 click 事件（capture phase） */
  private suppressNextClick(): void {
    const handler = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      document.removeEventListener('click', handler, true);
    };
    document.addEventListener('click', handler, true);
  }

  private clearHighlights(): void {
    for (const zone of this.dropZones) {
      zone.element.classList.remove('drop-zone-highlight');
      zone.element.classList.remove('drag-over');
    }
  }
}

// 单例导出
export const dragManager = new DragManager();
