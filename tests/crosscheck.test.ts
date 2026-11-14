import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeChart } from '../src/fortune';

// Python の独立実装 sxtwl で生成したフィクスチャ（tests/fixtures/gz.json）との突き合わせ。
// sxtwl は「日」単位でしか節気を扱えないため、節入りの時刻が絡むケースでは
// 日柱のみ sxtwl と比較し、年柱・月柱は節気時刻どおりの期待値を別に assert する。
interface Case {
  name: string; y: number; m: number; d: number; hour: number; minute: number;
  sxtwl: { year: string; month: string; day: string };
}
const cases = JSON.parse(readFileSync(new URL('./fixtures/gz.json', import.meta.url), 'utf-8')) as Case[];

// 年柱・月柱を sxtwl と比較しないケースと、その期待値（lunar-typescript の節気時刻ベース）
const LUNAR_YEAR_MONTH: Record<string, { year: string; month: string }> = {
  'lichun-day-am': { year: '癸卯', month: '乙丑' }, // 2024年の立春は2/4 16:27、正午はまだ前年・前月
  'jingzhe-before': { year: '甲辰', month: '丙寅' }, // 2024年の驚蟄は3/5 10:22、9時はまだ前月
};

describe('sxtwl との突き合わせ', () => {
  for (const c of cases) {
    it(c.name, () => {
      const chart = computeChart({ y: c.y, m: c.m, d: c.d, hour: c.hour, minute: c.minute });
      const [year, month, day] = chart.pillars;
      expect(day.gz, '日柱').toBe(c.sxtwl.day);
      const expected = LUNAR_YEAR_MONTH[c.name];
      if (expected) {
        expect(year.gz, '年柱（節気時刻ベース）').toBe(expected.year);
        expect(month.gz, '月柱（節気時刻ベース）').toBe(expected.month);
      } else {
        expect(year.gz, '年柱').toBe(c.sxtwl.year);
        expect(month.gz, '月柱').toBe(c.sxtwl.month);
      }
    });
  }
});
