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
  sellPrice?: number;  // 拖到卖出区时显示的售价
  label: string;    // 显示在幽灵元素中
  icon: string;     // emoji/icon
  shapeId?: string;       // Story 40.5: 多格技能形状 ID
  rotation?: number;      // Story 40.5: 形状旋转态
  shapePreviewHtml?: string; // Story 40.5: 预渲染的形状预览 HTML
  rarity?: number;        // 供拖拽期间旋转重渲染预览用
}

export interface DropZone {
  element: HTMLElement;
  // 'disposal' = 工作台回收槽，自管 DOM（dragManager 不覆写其 textContent，区别于 legacy 'sell-zone'）
  type: 'key-slot' | 'sell-zone' | 'word-deck' | 'skill-inventory' | 'disposal';
  key?: string;
  accepts: (payload: DragPayload) => boolean;
  onDrop: (payload: DragPayload) => void;
  onDragEnter?: (payload: DragPayload) => void;
  onDragLeave?: (payload: DragPayload) => void;
}

import { t } from '../demo/demo-i18n';
import { getShapeRotationCount } from '../data/skillShapes';

// 形状预览渲染器（由 shop.ts 注入，避免循环依赖）
let _shapePreviewRenderer: ((shapeId: string, rotation: number, rarity: number) => string) | null = null;
export function registerShapePreviewRenderer(fn: (shapeId: string, rotation: number, rarity: number) => string): void {
  _shapePreviewRenderer = fn;
}

// === 常量 ===
const DRAG_THRESHOLD = 5; // 最小移动距离才启动拖拽
const EDGE_ZONE = 40;     // 距容器边缘多少 px 开始自动滚动
const SCROLL_SPEED = 8;   // 每帧滚动像素

// === DragManager 类 ===
class DragManager {
  private dropZones: DropZone[] = [];
  private isDragging = false;
  private pickedUp = false; // 点击拾取模式：无需按住，鼠标跟随
  private startX = 0;
  private startY = 0;
  private payload: DragPayload | null = null;
  private ghost: HTMLElement | null = null;
  private sourceElement: HTMLElement | null = null;
  private currentDropTarget: DropZone | null = null;
  private active = false;
  private _onDragStart: ((payload: DragPayload) => void) | null = null;
  private _onDragEnd: ((payload: DragPayload) => void) | null = null;
  private scrollRaf = 0;
  private scrollDir = 0; // -1 up, +1 down, 0 stop

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

    this.boundMouseDown = (e: MouseEvent) => {
      // 右键在 pickedUp 模式下用于旋转，跳过放置逻辑
      if (e.button !== 0) return;
      this.onPointerDown(e.clientX, e.clientY, e.target as HTMLElement, e);
    };
    this.boundMouseMove = (e: MouseEvent) => {
      // pickedUp 模式：总是跟随鼠标移动（无需按住）
      if (this.pickedUp) {
        this.updateGhostPosition(e.clientX, e.clientY);
        return;
      }
      this.onPointerMove(e.clientX, e.clientY);
    };
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
    document.addEventListener('contextmenu', (e: MouseEvent) => {
      if (this.pickedUp && this.payload?.shapeId && this.payload.shapeId !== 'monomino') {
        e.preventDefault();
        this.rotatePickupShape(e.shiftKey);
      }
    });
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

  /** 检查当前是否在拖拽中（含点击拾取模式） */
  get dragging(): boolean {
    return this.isDragging || this.pickedUp;
  }

  /** Story 60.17: 返回当前拖拽中 payload（null = 无拖拽）— 拖拽 hover 预览 tooltip 用 */
  get currentPayload(): DragPayload | null {
    return this.payload;
  }

  /** 注册拖拽开始/结束全局回调 */
  set onDragStart(cb: ((payload: DragPayload) => void) | null) { this._onDragStart = cb; }
  set onDragEnd(cb: ((payload: DragPayload) => void) | null) { this._onDragEnd = cb; }

  // === 内部方法 ===

  private onPointerDown(x: number, y: number, target: HTMLElement, _event: MouseEvent | TouchEvent): void {
    // 不拦截锁定按钮的点击
    if (target.closest('.lock-toggle')) return;

    // pickedUp 模式下：这次 mousedown 是"放置"操作
    if (this.pickedUp && this.payload) {
      this.updateDropTarget(x, y);
      if (this.currentDropTarget) {
        this.currentDropTarget.onDrop(this.payload);
      } else {
        // 无有效目标 → 返回备战席
        this.returnToBench();
      }
      this.cancel();
      this.suppressNextClick();
      return;
    }

    // 查找最近的可拖拽元素
    const draggable = target.closest('[data-drag-type]') as HTMLElement;
    if (!draggable) return;

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
      // 通知拖拽开始：清理 tooltip 和高亮
      document.dispatchEvent(new CustomEvent('drag:start'));

      // 拖拽启动后抑制随之而来的 click 事件，防止拖拽结束时误触 onclick
      this.suppressNextClick();

      // 显示卖出区
      const sellZone = document.getElementById('sell-zone');
      if (sellZone) sellZone.classList.add('active');

      if (this._onDragStart) this._onDragStart(this.payload);
    }

    // 移动幽灵
    if (this.ghost) {
      this.ghost.style.left = `${x}px`;
      this.ghost.style.top = `${y}px`;
    }

    // 检测放置区
    this.updateDropTarget(x, y);

    // 自动滚动：指针靠近 #build-manager 上下边缘时滚动
    this.updateAutoScroll(y);
  }

  private onPointerUp(): void {
    if (this.isDragging) {
      // hold-drag 释放：在当前目标放置
      if (this.currentDropTarget && this.payload) {
        this.currentDropTarget.onDrop(this.payload);
      }
      this.cancel();
      return;
    }
    // 未达阈值：进入 pickedUp 模式（点击拾取）— 商店商品跳过，保留原生点击购买
    if (this.payload && !this.pickedUp && this.payload.type !== 'shop-item') {
      this.pickedUp = true;
      this.createGhost(this.payload);
      this.updateGhostPosition(this.startX, this.startY);
      if (this.sourceElement) this.sourceElement.classList.add('dragging');
      document.dispatchEvent(new CustomEvent('drag:start'));
      const sellZone = document.getElementById('sell-zone');
      if (sellZone) sellZone.classList.add('active');
      if (this._onDragStart) this._onDragStart(this.payload);
      this.suppressNextClick();
      return;
    }
    // 既不是 drag 也不是 pickup：清理
    if (!this.pickedUp) this.cancel();
  }

  private updateGhostPosition(x: number, y: number): void {
    if (this.ghost) {
      this.ghost.style.left = `${x}px`;
      this.ghost.style.top = `${y}px`;
    }
    this.updateDropTarget(x, y);
    this.updateAutoScroll(y);
  }

  /** 拾取模式下旋转多格技能形状 */
  private rotatePickupShape(shiftKey: boolean): void {
    if (!this.payload?.shapeId || !_shapePreviewRenderer) return;
    const maxRot = getShapeRotationCount(this.payload.shapeId);
    if (maxRot <= 1) return;
    const cur = this.payload.rotation ?? 0;
    const step = shiftKey ? maxRot - 1 : 1;
    const next = (cur + step) % maxRot;
    this.payload.rotation = next;
    const rarity = this.payload.rarity ?? 0;
    const newHtml = _shapePreviewRenderer(this.payload.shapeId, next, rarity);
    this.payload.shapePreviewHtml = newHtml;
    // 更新幽灵内的形状预览
    if (this.ghost) {
      const shapeDiv = this.ghost.querySelector('.drag-ghost-shape');
      if (shapeDiv) {
        shapeDiv.innerHTML = newHtml;
      } else if (newHtml) {
        const newShapeDiv = document.createElement('div');
        newShapeDiv.className = 'drag-ghost-shape';
        newShapeDiv.innerHTML = newHtml;
        this.ghost.appendChild(newShapeDiv);
      }
    }
    // 触发当前 drop target 的 onDragEnter，让范围预览按新 rotation 立即重算 —
    // 否则玩家空中右键旋转后必须挪鼠标才会刷新键盘 outline
    if (this.currentDropTarget?.onDragEnter && this.payload) {
      this.currentDropTarget.onDragEnter(this.payload);
    }
  }

  /** 将当前 payload 返回到备战席 */
  private returnToBench(): void {
    if (!this.payload) return;
    const bench = this.dropZones.find(z => z.type === 'skill-inventory');
    if (bench && bench.accepts(this.payload)) {
      bench.onDrop(this.payload);
    }
  }

  private cancel(): void {
    this.stopAutoScroll();

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

    // 触发离开回调
    if (this.currentDropTarget?.onDragLeave && this.payload) {
      this.currentDropTarget.onDragLeave(this.payload);
    }

    // 全局拖拽结束回调
    if (this._onDragEnd && this.payload) {
      this._onDragEnd(this.payload);
    }

    // 清理放置区高亮
    this.clearHighlights();

    // 隐藏卖出区并还原文本
    const sellZone = document.getElementById('sell-zone');
    if (sellZone) {
      sellZone.classList.remove('active');
      sellZone.classList.remove('drag-over');
      sellZone.textContent = t('shop.sell_zone');
    }

    this.isDragging = false;
    this.pickedUp = false;
    this.payload = null;
    this.currentDropTarget = null;
  }

  private buildPayload(el: HTMLElement, type: DragPayload['type']): DragPayload | null {
    switch (type) {
      case 'shop-item': {
        const index = parseInt(el.dataset.shopIndex || '-1', 10);
        if (index < 0) return null;
        const label = el.querySelector('.reward-name')?.textContent || 'Item';
        const icon = el.querySelector('.reward-icon')?.textContent || '📦';
        const costText = el.querySelector('.reward-cost')?.textContent || '';
        const cost = parseInt(costText.replace(/[^0-9]/g, '') || '0', 10);
        const shapeId = el.dataset.shapeId || undefined;
        const rotation = el.dataset.rotation != null ? parseInt(el.dataset.rotation, 10) : undefined;
        const shapePreviewHtml = el.dataset.shapePreview || undefined;
        return { type, itemIndex: index, label, icon, cost, shapeId, rotation, shapePreviewHtml };
      }
      case 'skill-inventory': {
        const skillId = el.dataset.skillId || '';
        if (!skillId) return null;
        const label = el.querySelector('.inv-name')?.textContent || skillId;
        const icon = el.querySelector('.inv-icon')?.textContent || '⚡';
        const sellPrice = parseInt(el.dataset.sellPrice || '0', 10);
        const shapeId = el.dataset.shapeId || undefined;
        const rotation = el.dataset.rotation != null ? parseInt(el.dataset.rotation, 10) : undefined;
        const shapePreviewHtml = el.dataset.shapePreview || undefined;
        const rarity = el.dataset.rarity != null ? parseInt(el.dataset.rarity, 10) : undefined;
        return { type, skillId, label, icon, sellPrice, shapeId, rotation, shapePreviewHtml, rarity };
      }
      case 'skill-key': {
        const key = el.dataset.key || '';
        const skillId = el.dataset.boundSkill || '';
        if (!key || !skillId) return null;
        const icon = el.querySelector('.key-skill')?.textContent || '⚡';
        const sellPrice = parseInt(el.dataset.sellPrice || '0', 10);
        const shapeId = el.dataset.shapeId || undefined;
        const rotation = el.dataset.rotation != null ? parseInt(el.dataset.rotation, 10) : undefined;
        const shapePreviewHtml = el.dataset.shapePreview || undefined;
        const rarity = el.dataset.rarity != null ? parseInt(el.dataset.rarity, 10) : undefined;
        return { type, sourceKey: key, skillId, label: `[${key.toUpperCase()}]`, icon, sellPrice, shapeId, rotation, shapePreviewHtml, rarity };
      }
      case 'word': {
        const word = el.dataset.word || '';
        const wordIndex = parseInt(el.dataset.wordIndex || '-1', 10);
        if (!word || wordIndex < 0) return null;
        const sellPrice = parseInt(el.dataset.sellPrice || '0', 10);
        return { type, word, wordIndex, label: word, icon: '📝', sellPrice };
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

    // Story 40.5: 多格技能幽灵显示形状缩略图
    if (payload.shapePreviewHtml) {
      const shapeDiv = document.createElement('div');
      shapeDiv.className = 'drag-ghost-shape';
      shapeDiv.innerHTML = payload.shapePreviewHtml;
      ghost.appendChild(shapeDiv);
    }

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
        // 还原卖出区默认文本
        if (this.currentDropTarget.type === 'sell-zone') {
          this.currentDropTarget.element.textContent = t('shop.sell_zone');
        }
        if (this.currentDropTarget.onDragLeave && this.payload) {
          this.currentDropTarget.onDragLeave(this.payload);
        }
      }
      if (found) {
        found.element.classList.add('drop-zone-highlight');
        found.element.classList.add('drag-over');
        // 卖出区显示售价
        if (found.type === 'sell-zone' && this.payload?.sellPrice != null) {
          found.element.textContent = t('shop.sell', { price: this.payload.sellPrice });
        }
        if (found.onDragEnter && this.payload) {
          found.onDragEnter(this.payload);
        }
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

  private updateAutoScroll(y: number): void {
    const container = document.getElementById('build-manager');
    if (!container) { this.stopAutoScroll(); return; }

    const rect = container.getBoundingClientRect();
    if (y < rect.top + EDGE_ZONE && container.scrollTop > 0) {
      this.startAutoScroll(-1, container);
    } else if (y > rect.bottom - EDGE_ZONE && container.scrollTop < container.scrollHeight - container.clientHeight) {
      this.startAutoScroll(1, container);
    } else {
      this.stopAutoScroll();
    }
  }

  private startAutoScroll(dir: number, container: HTMLElement): void {
    if (this.scrollDir === dir) return; // already scrolling same direction
    this.stopAutoScroll();
    this.scrollDir = dir;
    const tick = () => {
      container.scrollTop += dir * SCROLL_SPEED;
      this.scrollRaf = requestAnimationFrame(tick);
    };
    this.scrollRaf = requestAnimationFrame(tick);
  }

  private stopAutoScroll(): void {
    if (this.scrollRaf) { cancelAnimationFrame(this.scrollRaf); this.scrollRaf = 0; }
    this.scrollDir = 0;
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
