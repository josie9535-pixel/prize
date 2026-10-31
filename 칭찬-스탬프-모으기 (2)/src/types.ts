/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NintendoCoupon {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  code: string; // e.g. "NSW-2026-89A1"
  issuedAt: string;
  isUsed: boolean;
  usedAt?: string;
}

export interface Student {
  id: string;
  name: string;
  grade: number; // 학년 (예: 2학년)
  className: string; // 학급 (예: 햇살반 / 2-1반)
  avatar: string; // 캐릭터 또는 이모지/색상
  totalStars: number; // 현재 모은 별 (0 ~ 30). 30개 달성 시 쿠폰 발급 후 0개로 리셋!
  lifetimeStars: number; // 총 누적 획득한 별 (히스토리용)
  coupons: NintendoCoupon[];
  couponCount: number;
  createdAt: string;
}

export interface BehaviorItem {
  id: string;
  order: number;
  text: string;
  iconName: string;
}

export interface BehaviorTemplate {
  id: string;
  name: string;
  category: 'gym' | 'special_class' | 'inclusive_class';
  description: string;
  icon: string;
  badgeColor: string;
  items: BehaviorItem[];
}

export interface Stamp {
  behaviorIndex: number;
  behaviorName: string;
  awarded: boolean;
  awardedAt?: string;
  awardedBy?: string;
}

export interface Session {
  id: string;
  studentId: string;
  templateId: string;
  templateName: string;
  date: string; // YYYY-MM-DD
  period: number; // 1 ~ 6교시
  teacherId?: string;
  teacherName: string;
  stamps: Stamp[];
  completed: boolean; // 모든 스탬프 획득 여부
  starAwarded: boolean; // ⭐ 스타 지급 완료 여부 (중복 지급 방지 핵심)
  awardedAt?: string;
  createdAt: string;
}

// 기획서 2장에 명시된 표준 3종 차시 템플릿
export const DEFAULT_TEMPLATES: BehaviorTemplate[] = [
  {
    id: 'tpl-gym',
    name: '강당 단체 활동',
    category: 'gym',
    description: '체육, 강당 모임 및 신체 활동 시간',
    icon: '🏃‍♂️',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    items: [
      { id: 'gym-1', order: 1, text: '선생님께 인사하기', iconName: 'Heart' },
      { id: 'gym-2', order: 2, text: '자리에 앉기', iconName: 'Armchair' },
      { id: 'gym-3', order: 3, text: '활동에 집중하기', iconName: 'Sparkles' },
      { id: 'gym-4', order: 4, text: '친구들과 함께 행동하기', iconName: 'Users' },
      { id: 'gym-5', order: 5, text: '선생님께 인사하기', iconName: 'Heart' },
    ],
  },
  {
    id: 'tpl-special',
    name: '특수학급 시간',
    category: 'special_class',
    description: '특수학급 개별화 및 집중 학습 시간',
    icon: '📚',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    items: [
      { id: 'sp-1', order: 1, text: '장난감 정리하기', iconName: 'Box' },
      { id: 'sp-2', order: 2, text: '연필, 지우개 가져오기', iconName: 'Pencil' },
      { id: 'sp-3', order: 3, text: '자리에 앉기', iconName: 'Armchair' },
      { id: 'sp-4', order: 4, text: '활동에 집중하기', iconName: 'BookOpen' },
      { id: 'sp-5', order: 5, text: '자리 정리하고 의자 집어넣기', iconName: 'CheckSquare' },
      { id: 'sp-6', order: 6, text: '선생님께 인사하기', iconName: 'Heart' },
    ],
  },
  {
    id: 'tpl-inclusive',
    name: '통합학급 시간',
    category: 'inclusive_class',
    description: '일반 원적 학급에서의 수업 및 모둠 활동',
    icon: '🏫',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    items: [
      { id: 'inc-1', order: 1, text: '선생님께 인사하기', iconName: 'Heart' },
      { id: 'inc-2', order: 2, text: '자리에 앉기', iconName: 'Armchair' },
      { id: 'inc-3', order: 3, text: '활동에 집중하기', iconName: 'Sparkles' },
      { id: 'inc-4', order: 4, text: '친구들과 사이 좋게 활동하기', iconName: 'Users' },
      { id: 'inc-5', order: 5, text: '자리 정리하고 의자 집어넣기', iconName: 'CheckSquare' },
      { id: 'inc-6', order: 6, text: '선생님께 인사하기', iconName: 'Heart' },
    ],
  },
];

// 시간표 교시 인터페이스
export interface SchedulePeriod {
  period: number;
  name: string; // 예: "1교시"
  startTime: string; // "08:45"
  endTime: string; // "09:35"
}

// 사용자 제공 학교 시간표 표준 설정
export const DEFAULT_SCHEDULE: SchedulePeriod[] = [
  { period: 1, name: '1교시', startTime: '08:45', endTime: '09:35' },
  { period: 2, name: '2교시', startTime: '09:35', endTime: '10:25' },
  { period: 3, name: '3교시', startTime: '10:25', endTime: '11:15' },
  { period: 4, name: '4교시', startTime: '11:15', endTime: '12:05' },
  { period: 5, name: '5교시', startTime: '12:40', endTime: '13:35' },
];

export interface CurrentPeriodStatus {
  period: number;
  label: string;
  isWithinClass: boolean;
  startTime: string;
  endTime: string;
  statusDescription: string;
  autoDetected: boolean;
}

// 다중 사용자 실시간 동기화 상태
export interface AppSyncData {
  students: Student[];
  sessions: Session[];
  schedule: SchedulePeriod[];
  lastUpdated: string;
  updatedBy?: string;
}

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'single-student',
    name: '민준이',
    grade: 2,
    className: '희망반 (2-1)',
    avatar: '🦁',
    totalStars: 12,
    lifetimeStars: 12,
    coupons: [],
    couponCount: 0,
    createdAt: '2026-10-01',
  },
  {
    id: 'std-seoyeon',
    name: '이서연',
    grade: 3,
    className: '희망반 (3-2)',
    avatar: '🐰',
    totalStars: 29, // 1개만 더 받으면 30개 달성! 닌텐도 게임 쿠폰 테스트 용이
    lifetimeStars: 29,
    coupons: [],
    couponCount: 0,
    createdAt: '2026-10-01',
  },
];
