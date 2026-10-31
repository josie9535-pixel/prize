/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Star,
  ClipboardCheck,
  History,
  Gamepad2,
  Settings,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { Student, Session, NintendoCoupon, SchedulePeriod, DEFAULT_SCHEDULE } from './types';
import {
  getStoredStudents,
  getStoredSessions,
  getStoredSchedule,
} from './utils/storage';
import { soundManager } from './utils/sound';
import { syncManager, SyncStatus } from './utils/syncClient';
import { StudentBoard } from './components/StudentBoard';
import { TeacherSession } from './components/TeacherSession';
import { SessionHistory } from './components/SessionHistory';
import { StarCelebrationModal } from './components/StarCelebrationModal';
import { NintendoCouponModal } from './components/NintendoCouponModal';
import { CouponBoxModal } from './components/CouponBoxModal';
import { StudentProfileModal } from './components/StudentProfileModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { ScheduleEditModal } from './components/ScheduleEditModal';
import { AccessGateScreen } from './components/AccessGateScreen';

type ActiveTab = 'student' | 'teacher' | 'history';

export default function App() {
  // 처음 접속 시 접근 코드(0043) 인증 여부 확인
  const [isAccessGranted, setIsAccessGranted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('praise_app_access_granted_v1') === 'true';
    } catch {
      return false;
    }
  });

  // 실시간 다중 사용자 동기화 상태 관리
  const [students, setStudents] = useState<Student[]>(getStoredStudents);
  const [sessions, setSessions] = useState<Session[]>(getStoredSessions);
  const [schedule, setSchedule] = useState<SchedulePeriod[]>(getStoredSchedule);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');

  // 앱 잠그기 (접근 코드 재요구)
  const handleLockApp = () => {
    try {
      localStorage.removeItem('praise_app_access_granted_v1');
    } catch {}
    setIsAccessGranted(false);
  };

  // 컴포넌트 마운트 시 실시간 서버 동기화 구독 (SSE + Fallback Polling)
  useEffect(() => {
    const unsubscribe = syncManager.subscribe((data) => {
      setStudents(data.students);
      setSessions(data.sessions);
      setSchedule(data.schedule);
      setSyncStatus(data.status);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 단일 아동 전용 사이트: 현재 활성화된 아동 1명
  const selectedStudent = students[0] || {
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
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('teacher');
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  // 일반 차시 스타 완료 모달
  const [celebrationSession, setCelebrationSession] = useState<Session | null>(null);

  // 30개 달성 닌텐도 게임 쿠폰 발급 모달
  const [newAwardCoupon, setNewAwardCoupon] = useState<NintendoCoupon | null>(null);

  // 전체 쿠폰 보관함 및 쿠폰 소진 모달
  const [isCouponBoxOpen, setIsCouponBoxOpen] = useState<boolean>(false);

  // 아동 개인별 프로필 설정 모달
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // 시간표 확인 및 편집 모달
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);

  // 관리자 비밀번호 확인 모달 (0305)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [adminAuthAction, setAdminAuthAction] = useState<
    { type: 'edit_profile' } | { type: 'consume_coupon'; couponId: string } | { type: 'edit_schedule' } | null
  >(null);

  const activeCouponsCount = (selectedStudent.coupons || []).filter(
    (c) => !c.isUsed
  ).length;

  // 사운드 토글
  const handleToggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundManager.setMuted(nextMuted);
  };

  // 관리자 비밀번호 확인 요청 (학생 정보 수정)
  const handleRequestEditProfile = () => {
    setAdminAuthAction({ type: 'edit_profile' });
    setIsPasswordModalOpen(true);
  };

  // 관리자 비밀번호 확인 요청 (쿠폰 소진)
  const handleRequestConsumeCoupon = (couponId: string) => {
    setAdminAuthAction({ type: 'consume_coupon', couponId });
    setIsPasswordModalOpen(true);
  };

  // 관리자 비밀번호 확인 요청 (시간표 설정 수정 - PIN 0305)
  const handleRequestEditSchedule = () => {
    setAdminAuthAction({ type: 'edit_schedule' });
    setIsPasswordModalOpen(true);
  };

  // 비밀번호 인증 성공 시 분기 처리
  const handlePasswordSuccess = () => {
    setIsPasswordModalOpen(false);
    if (adminAuthAction?.type === 'edit_profile') {
      setIsProfileModalOpen(true);
    } else if (adminAuthAction?.type === 'consume_coupon') {
      handleConsumeCoupon(adminAuthAction.couponId);
    } else if (adminAuthAction?.type === 'edit_schedule') {
      setIsScheduleModalOpen(true);
    }
    setAdminAuthAction(null);
  };

  // 학생 프로필(이름, 별명, 학년, 학급, 캐릭터) 수정 저장 -> 실시간 서버 브로드캐스트
  const handleSaveStudentProfile = (updated: Student) => {
    const updatedList = [updated, ...students.slice(1)];
    setStudents(updatedList);
    syncManager.updateStudents(updatedList);
  };

  // 세션 저장: 오직 스타를 획득한(starAwarded === true) 성공 차시만 기록에 저장 -> 실시간 서버 브로드캐스트
  const handleSaveSession = (session: Session) => {
    if (!session.starAwarded) return;
    syncManager.saveSingleSession(session);
  };

  // 쿠폰 소진(사용 완료) 핸들러 -> 실시간 서버 브로드캐스트
  const handleConsumeCoupon = (couponId: string) => {
    const updatedList = students.map((std, idx) => {
      if (idx === 0) {
        const updatedCoupons = (std.coupons || []).map((cp) => {
          if (cp.id === couponId) {
            return {
              ...cp,
              isUsed: true,
              usedAt: new Date().toISOString(),
            };
          }
          return cp;
        });
        const unUsedCount = updatedCoupons.filter((c) => !c.isUsed).length;
        return {
          ...std,
          coupons: updatedCoupons,
          couponCount: unUsedCount,
        };
      }
      return std;
    });

    setStudents(updatedList);
    syncManager.updateStudents(updatedList);

    if (newAwardCoupon && newAwardCoupon.id === couponId) {
      setNewAwardCoupon((prev) =>
        prev
          ? {
              ...prev,
              isUsed: true,
              usedAt: new Date().toISOString(),
            }
          : null
      );
    }
  };

  // 시간표 변경 저장 -> 실시간 서버 브로드캐스트
  const handleSaveSchedule = (newSchedule: SchedulePeriod[]) => {
    setSchedule(newSchedule);
    syncManager.updateSchedule(newSchedule);
  };

  // 차시 완료 및 스타 지급 & 30개 달성 시 닌텐도 게임 쿠폰 지급 및 별 0개 전환
  const handleCompleteSessionWithStar = (session: Session) => {
    // 중복 지급 방지
    const existing = sessions.find((s) => s.id === session.id);
    if (existing && existing.starAwarded) {
      console.warn('이미 스타가 지급된 차시입니다.');
      return;
    }

    let awardedCoupon: NintendoCoupon | null = null;
    let didReach30 = false;

    const updatedList = students.map((std, idx) => {
      if (idx === 0) {
        const currentStars = std.totalStars || 0;
        const nextStars = currentStars + 1;
        const nextLifetime = (std.lifetimeStars || 0) + 1;

        // 30개 달성 조건 판정!
        if (nextStars >= 30) {
          didReach30 = true;
          const newCoupon: NintendoCoupon = {
            id: `coupon-${Date.now()}`,
            studentId: std.id,
            studentName: std.name,
            title: '닌텐도 게임 1회 이용 쿠폰',
            code: `NSW-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            issuedAt: new Date().toISOString(),
            isUsed: false,
          };
          awardedCoupon = newCoupon;

          const newCoupons = [newCoupon, ...(std.coupons || [])];
          return {
            ...std,
            totalStars: 0, // 별 0개로 리셋!
            lifetimeStars: nextLifetime,
            coupons: newCoupons,
            couponCount: newCoupons.filter((c) => !c.isUsed).length,
          };
        } else {
          return {
            ...std,
            totalStars: nextStars,
            lifetimeStars: nextLifetime,
          };
        }
      }
      return std;
    });

    setStudents(updatedList);
    syncManager.updateStudents(updatedList);

    const updatedSession = {
      ...session,
      completed: true,
      starAwarded: true,
    };
    handleSaveSession(updatedSession);

    if (didReach30 && awardedCoupon) {
      setNewAwardCoupon(awardedCoupon);
    } else {
      setCelebrationSession(session);
    }
  };

  // 접근 코드(0043)가 인증되지 않은 경우 게이트웨이 화면 표시
  if (!isAccessGranted) {
    return <AccessGateScreen onAccessGranted={() => setIsAccessGranted(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-12">
      {/* 글로벌 상단 헤더: 개인정보 유출 방지 1인 전용 사이트 + 실시간 동기화 상태 뱃지 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-xs">
        <div className="max-w-lg md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* 브랜드 & 주인공 아동 이름 & 실시간 동기화 표시 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-md shadow-amber-500/20 text-xl shrink-0">
              {selectedStudent.avatar}
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 whitespace-nowrap">
                <span className="truncate">{selectedStudent.name}의 칭찬 스타</span>
                {/* 실시간 동기화 상태 뱃지 */}
                {syncStatus === 'connected' ? (
                  <span
                    title="배포 환경에서 모든 사용자와 실시간으로 화면이 일치합니다"
                    className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold whitespace-nowrap shrink-0"
                  >
                    <Wifi className="w-3 h-3 text-emerald-600 animate-pulse" />
                    <span>실시간 동기화</span>
                  </span>
                ) : syncStatus === 'syncing' ? (
                  <span
                    title="서버 데이터 확인 중..."
                    className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                    <span>동기화 중</span>
                  </span>
                ) : (
                  <span
                    title="오프라인 상태 (로컬 캐시 보관)"
                    className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold whitespace-nowrap shrink-0"
                  >
                    <WifiOff className="w-3 h-3 text-slate-400" />
                    <span>오프라인 캐시</span>
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* 우측 도구: 시간표 보기 & 쿠폰함 바로가기 & 아동 프로필 설정 & 사운드 토글 */}
          <div className="flex items-center gap-2">
            {/* 시간표 설정 버튼 (관리자 비밀번호 0305 보호) */}
            <button
              onClick={handleRequestEditSchedule}
              title="1~5교시 학교 시간표 확인 및 수정 (관리자 0305)"
              className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">시간표</span>
            </button>

            {/* 닌텐도 쿠폰함 퀵 버튼 */}
            <button
              onClick={() => setIsCouponBoxOpen(true)}
              title="닌텐도 게임 쿠폰함 열기"
              className={`h-9 sm:h-10 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeCouponsCount > 0
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-xs animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>{activeCouponsCount > 0 ? `쿠폰 ${activeCouponsCount}장` : '쿠폰함'}</span>
            </button>

            {/* 아동 개인별 맞춤 설정 (관리자 비밀번호 보호) */}
            <button
              onClick={handleRequestEditProfile}
              title="아동 프로필 및 별명 설정 (관리자 전용)"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* 사운드 토글 버튼 */}
            <button
              onClick={handleToggleSound}
              title={isMuted ? '소리 켜기' : '소리 끄기'}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              )}
            </button>

            {/* 앱 잠금 버튼 (접근 코드 0043 재요구) */}
            <button
              onClick={handleLockApp}
              title="앱 잠그기 (접근 코드 재인증)"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 flex items-center justify-center transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="max-w-lg md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 pb-2.5 pt-1 flex gap-2">
          <button
            onClick={() => setActiveTab('teacher')}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'teacher'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>수업 차시 기록</span>
          </button>

          <button
            onClick={() => setActiveTab('student')}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'student'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Star className="w-4 h-4" />
            <span>학생 스타 보드</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>기록 목록</span>
          </button>
        </div>
      </header>

      {/* 메인 뷰 컨텐츠 */}
      <main className="flex-1 w-full max-w-lg md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-2 sm:px-4 pt-3">
        {activeTab === 'teacher' && (
          <TeacherSession
            selectedStudent={selectedStudent}
            schedule={schedule}
            onOpenEditStudent={handleRequestEditProfile}
            onOpenScheduleModal={handleRequestEditSchedule}
            onCompleteSessionWithStar={handleCompleteSessionWithStar}
            onSaveSession={handleSaveSession}
            onSwitchToStudent={() => setActiveTab('student')}
          />
        )}

        {activeTab === 'student' && (
          <StudentBoard
            student={selectedStudent}
            onSwitchToTeacher={() => setActiveTab('teacher')}
            onOpenCouponBox={() => setIsCouponBoxOpen(true)}
            onOpenEditProfile={handleRequestEditProfile}
          />
        )}

        {activeTab === 'history' && (
          <SessionHistory student={selectedStudent} sessions={sessions} />
        )}
      </main>

      {/* 1. 일반 차시 완료 & 스타 획득 팝업 모달 */}
      {celebrationSession && (
        <StarCelebrationModal
          isOpen={Boolean(celebrationSession)}
          student={selectedStudent}
          sessionTitle={`${celebrationSession.date} ${celebrationSession.period}교시 · ${celebrationSession.templateName}`}
          onClose={() => setCelebrationSession(null)}
        />
      )}

      {/* 2. 30개 달성! 닌텐도 게임 쿠폰 획득 전용 팝업 모달 */}
      {newAwardCoupon && (
        <NintendoCouponModal
          isOpen={Boolean(newAwardCoupon)}
          coupon={newAwardCoupon}
          student={selectedStudent}
          isNewAward={true}
          onClose={() => setNewAwardCoupon(null)}
          onUseCoupon={handleRequestConsumeCoupon}
        />
      )}

      {/* 3. 닌텐도 쿠폰함 및 [쿠폰 소진하기] 관리 모달 */}
      <CouponBoxModal
        isOpen={isCouponBoxOpen}
        student={selectedStudent}
        onClose={() => setIsCouponBoxOpen(false)}
        onConsumeCoupon={handleRequestConsumeCoupon}
      />

      {/* 4. 아동 개인별 프로필 설정 모달 (관리자 인증 성공 후 오픈) */}
      <StudentProfileModal
        isOpen={isProfileModalOpen}
        student={selectedStudent}
        onClose={() => setIsProfileModalOpen(false)}
        onSaveStudent={handleSaveStudentProfile}
      />

      {/* 5. 1~5교시 학교 시간표 확인 및 편집 모달 */}
      <ScheduleEditModal
        isOpen={isScheduleModalOpen}
        schedule={schedule}
        onClose={() => setIsScheduleModalOpen(false)}
        onSaveSchedule={handleSaveSchedule}
      />

      {/* 6. 관리자 비밀번호 확인 모달 (PIN: 0305, 학생 정보 편집, 쿠폰 소진, 시간표 수정 보호) */}
      <AdminPasswordModal
        isOpen={isPasswordModalOpen}
        title={
          adminAuthAction?.type === 'consume_coupon'
            ? '🎮 닌텐도 쿠폰 소진 인증'
            : adminAuthAction?.type === 'edit_schedule'
            ? '⏱️ 학교 시간표 수정 인증'
            : '🔒 학생 정보 편집 인증'
        }
        description={
          adminAuthAction?.type === 'consume_coupon'
            ? '학생에게 게임 시간을 제공한 뒤,\n관리자 비밀번호(0305)를 입력해주세요.'
            : adminAuthAction?.type === 'edit_schedule'
            ? '학교 시간표 설정은 관리자만 수정할 수 있습니다.\n비밀번호 4자리(0305)를 입력해주세요.'
            : '학생 정보는 관리자만 수정할 수 있습니다.\n비밀번호 4자리를 입력해주세요.'
        }
        onClose={() => {
          setIsPasswordModalOpen(false);
          setAdminAuthAction(null);
        }}
        onSuccess={handlePasswordSuccess}
      />
    </div>
  );
}
