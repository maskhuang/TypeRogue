/**
 * tutorialSteps schema 测试
 */

import { describe, it, expect } from 'vitest';
import { tutorialStepsSchema, TUTORIAL_STEPS_DATA } from '../../../../src/data/schemas/tutorialSteps.schema';
import {
  L0_STEPS,
  L1_STEPS,
  L2_STEPS,
  L3_STEPS,
  L4_STEPS,
  L5_STEPS,
  FULL_TUTORIAL_STEPS,
  DEMO_TUTORIAL_STEPS,
} from '../../../../src/data/tutorialSteps';

describe('tutorialSteps schema', () => {
  it('schema parse 通过', () => {
    expect(() => tutorialStepsSchema.parse(TUTORIAL_STEPS_DATA)).not.toThrow();
  });

  it('含 6 个 level + demo', () => {
    expect(TUTORIAL_STEPS_DATA.L0).toBeInstanceOf(Array);
    expect(TUTORIAL_STEPS_DATA.L5).toBeInstanceOf(Array);
    expect(TUTORIAL_STEPS_DATA.demo).toBeInstanceOf(Array);
  });

  it('每个 step 含 id / level / trigger / content', () => {
    for (const step of L0_STEPS) {
      expect(step.id).toBeTruthy();
      expect(typeof step.level).toBe('number');
      expect(step.trigger.event).toBeTruthy();
      expect(step.content.titleKey).toBeTruthy();
      expect(step.content.bodyKey).toBeTruthy();
    }
  });

  it('level 数值与数组对应', () => {
    for (const step of L0_STEPS) expect(step.level).toBe(0);
    for (const step of L1_STEPS) expect(step.level).toBe(1);
    for (const step of L5_STEPS) expect(step.level).toBe(5);
  });
});

describe('tutorialSteps re-export 一致性', () => {
  it('FULL_TUTORIAL_STEPS 是 L0~L5 拼接', () => {
    const total = L0_STEPS.length + L1_STEPS.length + L2_STEPS.length + L3_STEPS.length + L4_STEPS.length + L5_STEPS.length;
    expect(FULL_TUTORIAL_STEPS).toHaveLength(total);
  });

  it('DEMO_TUTORIAL_STEPS 有 3 步（step1/step2/step3）', () => {
    expect(DEMO_TUTORIAL_STEPS).toHaveLength(3);
    expect(DEMO_TUTORIAL_STEPS.map(s => s.id)).toEqual([
      'demo_step1_type',
      'demo_step2_skill',
      'demo_step3_shop',
    ]);
  });

  it('step 对象可被 mutate（tutorialInit 注入 condition 所需）', () => {
    const step = L0_STEPS[0];
    step.trigger.condition = () => true;
    expect(step.trigger.condition).toBeDefined();
    delete step.trigger.condition; // 清理
  });
});
