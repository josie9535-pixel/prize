/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Session, INITIAL_STUDENTS, DEFAULT_TEMPLATES, SchedulePeriod, DEFAULT_SCHEDULE } from '../types';

const STORAGE_KEYS = {
  STUDENTS: 'praise_students_v1',
  SESSIONS: 'praise_sessions_v1',
  SELECTED_STUDENT_ID: 'praise_selected_std_v1',
  TEACHER_NAME: 'praise_recent_teacher_v1',
  TEMPLATE_ID: 'praise_recent_template_v1',
  SCHEDULE: 'praise_schedule_v1',
};

export const getStoredStudents = (): Student[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 기존 데이터에 coupons, lifetimeStars 보정
        return parsed.map((std: Partial<Student> & { id: string; name: string }) => ({
          ...std,
          totalStars: typeof std.totalStars === 'number' ? std.totalStars : 0,
          lifetimeStars: typeof std.lifetimeStars === 'number' ? std.lifetimeStars : (std.totalStars || 0),
          coupons: Array.isArray(std.coupons) ? std.coupons : [],
          couponCount: Array.isArray(std.coupons)
            ? std.coupons.filter((c) => !c.isUsed).length
            : (std.couponCount || 0),
        })) as Student[];
      }
    }
  } catch (e) {
    console.error('Failed to parse students from localStorage', e);
  }
  saveStudents(INITIAL_STUDENTS);
  return INITIAL_STUDENTS;
};

export const saveStudents = (students: Student[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to save students to localStorage', e);
  }
};

export const getStoredSessions = (): Session[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse sessions from localStorage', e);
  }

  // 초기 예시 기록 (기획서 9장의 예시 데이터 반영)
  const today = new Date().toISOString().slice(0, 10);
  const sampleSessions: Session[] = [
    {
      id: 'session-demo-1',
      studentId: 'std-minjun',
      templateId: 'tpl-inclusive',
      templateName: '통합학급 시간',
      date: today,
      period: 2,
      teacherName: '김선생님',
      completed: true,
      starAwarded: true,
      createdAt: '2026-10-30T10:00:00Z',
      stamps: DEFAULT_TEMPLATES[2].items.map((item, idx) => ({
        behaviorIndex: idx,
        behaviorName: item.text,
        awarded: true,
        awardedAt: '2026-10-30T10:40:00Z',
        awardedBy: '김선생님',
      })),
    },
    {
      id: 'session-demo-2',
      studentId: 'std-minjun',
      templateId: 'tpl-special',
      templateName: '특수학급 시간',
      date: today,
      period: 1,
      teacherName: '박특수교사',
      completed: true,
      starAwarded: true,
      createdAt: '2026-10-30T09:00:00Z',
      stamps: DEFAULT_TEMPLATES[1].items.map((item, idx) => ({
        behaviorIndex: idx,
        behaviorName: item.text,
        awarded: true,
        awardedAt: '2026-10-30T09:40:00Z',
        awardedBy: '박특수교사',
      })),
    },
  ];
  saveSessions(sampleSessions);
  return sampleSessions;
};

export const saveSessions = (sessions: Session[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions to localStorage', e);
  }
};

export const getRecentTeacherName = (): string => {
  return localStorage.getItem(STORAGE_KEYS.TEACHER_NAME) || '김특수교사';
};

export const saveRecentTeacherName = (name: string): void => {
  localStorage.setItem(STORAGE_KEYS.TEACHER_NAME, name);
};

export const getRecentTemplateId = (): string => {
  return localStorage.getItem(STORAGE_KEYS.TEMPLATE_ID) || DEFAULT_TEMPLATES[0].id;
};

export const saveRecentTemplateId = (id: string): void => {
  localStorage.setItem(STORAGE_KEYS.TEMPLATE_ID, id);
};

export const getStoredSchedule = (): SchedulePeriod[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse schedule from localStorage', e);
  }
  return DEFAULT_SCHEDULE;
};

export const saveStoredSchedule = (schedule: SchedulePeriod[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
  } catch (e) {
    console.error('Failed to save schedule to localStorage', e);
  }
};
