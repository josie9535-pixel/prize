/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Session, SchedulePeriod, DEFAULT_SCHEDULE, INITIAL_STUDENTS } from '../types';
import {
  getStoredStudents,
  saveStudents,
  getStoredSessions,
  saveSessions,
  getStoredSchedule,
  saveStoredSchedule,
} from './storage';

export type SyncStatus = 'connected' | 'syncing' | 'offline';

type SyncListener = (data: {
  students: Student[];
  sessions: Session[];
  schedule: SchedulePeriod[];
  status: SyncStatus;
}) => void;

class SyncManager {
  private eventSource: EventSource | null = null;
  private listeners: Set<SyncListener> = new Set();
  private status: SyncStatus = 'syncing';
  private currentStudents: Student[] = getStoredStudents();
  private currentSessions: Session[] = getStoredSessions();
  private currentSchedule: SchedulePeriod[] = getStoredSchedule();
  private isInitialized = false;
  private reconnectTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. 초기 서버 상태 fetch
    this.fetchInitialState();

    // 2. 실시간 SSE 연결 시작
    this.connectSSE();

    // 3. 브라우저 포커스 복귀 시 재동기화
    window.addEventListener('focus', () => {
      this.fetchInitialState();
    });

    // 4. 네트워크 상태 감지
    window.addEventListener('online', () => {
      this.connectSSE();
      this.fetchInitialState();
    });
    window.addEventListener('offline', () => {
      this.setStatus('offline');
    });

    // 5. 백업 주기적 폴링 (3초 간격) - SSE가 방화벽으로 막힐 때 대비
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.fetchInitialState(true);
      }
    }, 4000);
  }

  private setStatus(status: SyncStatus) {
    if (this.status !== status) {
      this.status = status;
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    const payload = {
      students: this.currentStudents,
      sessions: this.currentSessions,
      schedule: this.currentSchedule,
      status: this.status,
    };
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (e) {
        console.error('Error in sync listener', e);
      }
    });
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // 즉시 현재 상태 전달
    listener({
      students: this.currentStudents,
      sessions: this.currentSessions,
      schedule: this.currentSchedule,
      status: this.status,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState() {
    return {
      students: this.currentStudents,
      sessions: this.currentSessions,
      schedule: this.currentSchedule,
      status: this.status,
    };
  }

  // SSE 연결
  private connectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.onopen = () => {
        this.setStatus('connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.data) {
            this.applyServerData(parsed.data);
          }
        } catch (err) {
          console.warn('Failed to parse SSE data', err);
        }
      };

      this.eventSource.onerror = () => {
        this.setStatus('offline');
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // 3초 후 재연결 시도
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          this.connectSSE();
        }, 3000);
      };
    } catch (e) {
      console.warn('SSE connection failed', e);
      this.setStatus('offline');
    }
  }

  // 초기 서버 상태 가져오기
  public async fetchInitialState(silent = false) {
    if (!silent) this.setStatus('syncing');
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          this.applyServerData(json.data);
          this.setStatus('connected');
          return;
        }
      }
    } catch {
      // 서버 접근 실패 시 로컬 캐시 유지
    }
    if (!silent && this.status !== 'connected') {
      this.setStatus('offline');
    }
  }

  // 서버로부터 전달받은 최신 데이터 반영
  private applyServerData(data: {
    students?: Student[];
    sessions?: Session[];
    schedule?: SchedulePeriod[];
  }) {
    let hasChanged = false;

    if (Array.isArray(data.students) && data.students.length > 0) {
      if (JSON.stringify(data.students) !== JSON.stringify(this.currentStudents)) {
        this.currentStudents = data.students;
        saveStudents(data.students);
        hasChanged = true;
      }
    }

    if (Array.isArray(data.sessions)) {
      if (JSON.stringify(data.sessions) !== JSON.stringify(this.currentSessions)) {
        this.currentSessions = data.sessions;
        saveSessions(data.sessions);
        hasChanged = true;
      }
    }

    if (Array.isArray(data.schedule) && data.schedule.length > 0) {
      if (JSON.stringify(data.schedule) !== JSON.stringify(this.currentSchedule)) {
        this.currentSchedule = data.schedule;
        saveStoredSchedule(data.schedule);
        hasChanged = true;
      }
    }

    if (hasChanged) {
      this.notifyListeners();
    }
  }

  // 학생 데이터 업데이트 (로컬 + 서버 실시간 브로드캐스트)
  public async updateStudents(updatedStudents: Student[]) {
    this.currentStudents = updatedStudents;
    saveStudents(updatedStudents);
    this.notifyListeners();

    try {
      await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: updatedStudents }),
      });
    } catch (err) {
      console.warn('Failed to push students to server', err);
    }
  }

  // 세션 데이터 업데이트 (로컬 + 서버 실시간 브로드캐스트)
  public async updateSessions(updatedSessions: Session[]) {
    this.currentSessions = updatedSessions;
    saveSessions(updatedSessions);
    this.notifyListeners();

    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions: updatedSessions }),
      });
    } catch (err) {
      console.warn('Failed to push sessions to server', err);
    }
  }

  // 단일 세션 추가/업데이트
  public async saveSingleSession(session: Session) {
    const idx = this.currentSessions.findIndex((s) => s.id === session.id);
    let updated: Session[];
    if (idx >= 0) {
      updated = [...this.currentSessions];
      updated[idx] = session;
    } else {
      updated = [session, ...this.currentSessions];
    }
    return this.updateSessions(updated);
  }

  // 시간표 설정 업데이트 (로컬 + 서버 실시간 브로드캐스트)
  public async updateSchedule(updatedSchedule: SchedulePeriod[]) {
    this.currentSchedule = updatedSchedule;
    saveStoredSchedule(updatedSchedule);
    this.notifyListeners();

    try {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: updatedSchedule }),
      });
    } catch (err) {
      console.warn('Failed to push schedule to server', err);
    }
  }
}

export const syncManager = new SyncManager();
