/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchedulePeriod, DEFAULT_SCHEDULE, CurrentPeriodStatus } from '../types';

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 사용자 시간표를 바탕으로 현재 시각(HH:mm)을 인식하여 자동 교시 및 상태를 판별합니다.
 *
 * 1교시: 08:45 ~ 09:35
 * 2교시: 09:35 ~ 10:25
 * 3교시: 10:25 ~ 11:15
 * 4교시: 11:15 ~ 12:05
 * 5교시: 12:40 ~ 13:35
 */
export function detectCurrentPeriod(
  schedule: SchedulePeriod[] = DEFAULT_SCHEDULE,
  now = new Date()
): CurrentPeriodStatus {
  if (!schedule || schedule.length === 0) {
    return {
      period: 1,
      label: '1교시',
      isWithinClass: false,
      startTime: '08:45',
      endTime: '09:35',
      statusDescription: '기본 1교시',
      autoDetected: true,
    };
  }

  // 시간순 정렬
  const sorted = [...schedule].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  // 1. 특정 교시 수업 시간 범위(startTime <= now < endTime)에 있는 경우
  for (const s of sorted) {
    const startM = timeToMinutes(s.startTime);
    const endM = timeToMinutes(s.endTime);

    if (currentMinutes >= startM && currentMinutes < endM) {
      return {
        period: s.period,
        label: `${s.period}교시 수업 중`,
        isWithinClass: true,
        startTime: s.startTime,
        endTime: s.endTime,
        statusDescription: `현재 ${s.period}교시 수업 중 (${s.startTime}~${s.endTime})`,
        autoDetected: true,
      };
    }
  }

  // 2. 1교시 시작 전인 경우
  const firstPeriod = sorted[0];
  const firstStartM = timeToMinutes(firstPeriod.startTime);
  if (currentMinutes < firstStartM) {
    return {
      period: firstPeriod.period,
      label: `${firstPeriod.period}교시 (시작 전)`,
      isWithinClass: false,
      startTime: firstPeriod.startTime,
      endTime: firstPeriod.endTime,
      statusDescription: `수업 시작 전 (${firstPeriod.startTime} 시작 예정)`,
      autoDetected: true,
    };
  }

  // 3. 교시 사이 쉬는 시간 or 점심시간인 경우 (다음 교시로 자동 배정)
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = timeToMinutes(sorted[i].endTime);
    const nextStart = timeToMinutes(sorted[i + 1].startTime);

    if (currentMinutes >= currentEnd && currentMinutes < nextStart) {
      const nextP = sorted[i + 1];
      const isLunch = sorted[i].period === 4 && nextP.period === 5;
      return {
        period: nextP.period,
        label: `${nextP.period}교시 (${isLunch ? '점심 시간' : '쉬는 시간'})`,
        isWithinClass: false,
        startTime: nextP.startTime,
        endTime: nextP.endTime,
        statusDescription: isLunch
          ? `점심 시간 (${nextP.startTime}부터 5교시)`
          : `쉬는 시간 (${nextP.startTime}부터 ${nextP.period}교시)`,
        autoDetected: true,
      };
    }
  }

  // 4. 마지막 교시(5교시) 종료 후
  const lastPeriod = sorted[sorted.length - 1];
  return {
    period: lastPeriod.period,
    label: `${lastPeriod.period}교시 (수업 종료)`,
    isWithinClass: false,
    startTime: lastPeriod.startTime,
    endTime: lastPeriod.endTime,
    statusDescription: `오늘 정규 수업 종료 (${currentFormatted})`,
    autoDetected: true,
  };
}
