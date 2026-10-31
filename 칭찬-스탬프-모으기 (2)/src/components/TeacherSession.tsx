/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Clock,
  UserCheck,
  Star,
  Check,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Armchair,
  Users,
  Smile,
  Box,
  Pencil,
  BookOpen,
  CheckSquare,
  Heart,
  SlidersHorizontal,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Student, Session, DEFAULT_TEMPLATES, Stamp, SchedulePeriod, DEFAULT_SCHEDULE } from '../types';
import { soundManager } from '../utils/sound';
import {
  getRecentTeacherName,
  saveRecentTeacherName,
  getRecentTemplateId,
  saveRecentTemplateId,
} from '../utils/storage';
import { detectCurrentPeriod } from '../utils/schedule';

interface Props {
  selectedStudent: Student;
  schedule?: SchedulePeriod[];
  onOpenEditStudent: () => void;
  onOpenScheduleModal?: () => void;
  onCompleteSessionWithStar: (session: Session) => void;
  onSaveSession: (session: Session) => void;
  onSwitchToStudent: () => void;
}

// 아이콘 매퍼
const renderBehaviorIcon = (iconName: string) => {
  const props = { className: 'w-5 h-5' };
  switch (iconName) {
    case 'Bow':
    case 'HandMetal':
    case 'Heart':
      return <Heart {...props} className="w-5 h-5 text-pink-500 fill-pink-400 stroke-pink-500" />;
    case 'Armchair':
      return <Armchair {...props} className="w-5 h-5 text-blue-500" />;
    case 'Sparkles':
      return <Sparkles {...props} className="w-5 h-5 text-yellow-500" />;
    case 'Users':
      return <Users {...props} className="w-5 h-5 text-emerald-500" />;
    case 'Smile':
      return <Smile {...props} className="w-5 h-5 text-rose-500" />;
    case 'Box':
      return <Box {...props} className="w-5 h-5 text-amber-600" />;
    case 'Pencil':
      return <Pencil {...props} className="w-5 h-5 text-purple-500" />;
    case 'BookOpen':
      return <BookOpen {...props} className="w-5 h-5 text-sky-500" />;
    case 'CheckSquare':
      return <CheckSquare {...props} className="w-5 h-5 text-indigo-500" />;
    default:
      return <Check {...props} className="w-5 h-5 text-slate-400" />;
  }
};

export const TeacherSession: React.FC<Props> = ({
  selectedStudent,
  schedule = DEFAULT_SCHEDULE,
  onOpenEditStudent,
  onOpenScheduleModal,
  onCompleteSessionWithStar,
  onSaveSession,
  onSwitchToStudent,
}) => {
  // 날짜 자동 입력 (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState<string>(todayStr);

  // 시간 인식 기반 교시 자동 설정 & 교사 수동 변경 지원
  const initialPeriodStatus = detectCurrentPeriod(schedule, new Date());
  const [period, setPeriod] = useState<number>(initialPeriodStatus.period);
  const [isAutoPeriod, setIsAutoPeriod] = useState<boolean>(true);
  const [currentPeriodStatus, setCurrentPeriodStatus] = useState(initialPeriodStatus);

  const [teacherName, setTeacherName] = useState<string>(getRecentTeacherName());
  const [templateId, setTemplateId] = useState<string>(getRecentTemplateId());

  // 현재 선택된 템플릿
  const activeTemplate =
    DEFAULT_TEMPLATES.find((t) => t.id === templateId) || DEFAULT_TEMPLATES[0];

  // 현재 진행 중인 차시의 스탬프 상태
  const [stamps, setStamps] = useState<Stamp[]>(() =>
    activeTemplate.items.map((item, index) => ({
      behaviorIndex: index,
      behaviorName: item.text,
      awarded: false,
    }))
  );

  // 현재 차시 스타 지급 완료 플래그 (중복 지급 방지)
  const [starAwarded, setStarAwarded] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>(
    () => `session-${Date.now()}`
  );

  // 1. 실시간 시간 감지 타이머 (30초마다 교시 자동 갱신, 교사가 수동 변경하지 않은 경우)
  useEffect(() => {
    const updatePeriodFromTime = () => {
      const detected = detectCurrentPeriod(schedule, new Date());
      setCurrentPeriodStatus(detected);
      if (isAutoPeriod) {
        setPeriod(detected.period);
      }
    };

    updatePeriodFromTime();
    const interval = setInterval(updatePeriodFromTime, 30000);
    return () => clearInterval(interval);
  }, [schedule, isAutoPeriod]);

  // 교사가 직접 교시를 수동 변경했을 때
  const handleManualPeriodChange = (newPeriod: number) => {
    setPeriod(newPeriod);
    setIsAutoPeriod(false);
  };

  // 교사가 다시 현재 시간 기준으로 자동 맞추기를 눌렀을 때
  const handleResetToAutoPeriod = () => {
    const detected = detectCurrentPeriod(schedule, new Date());
    setCurrentPeriodStatus(detected);
    setPeriod(detected.period);
    setIsAutoPeriod(true);
  };

  // 템플릿 변경 시 스탬프 목록 재설정
  const handleTemplateChange = (newTemplateId: string) => {
    setTemplateId(newTemplateId);
    saveRecentTemplateId(newTemplateId);
    const targetTpl =
      DEFAULT_TEMPLATES.find((t) => t.id === newTemplateId) || DEFAULT_TEMPLATES[0];
    setStamps(
      targetTpl.items.map((item, index) => ({
        behaviorIndex: index,
        behaviorName: item.text,
        awarded: false,
      }))
    );
    setStarAwarded(false);
    setSessionId(`session-${Date.now()}`);
  };

  // 교사 이름 변경 시 로컬 저장
  const handleTeacherNameChange = (val: string) => {
    setTeacherName(val);
    saveRecentTeacherName(val);
  };

  // 새 차시 시작 (리셋)
  const handleStartNewSession = () => {
    setSessionId(`session-${Date.now()}`);
    setStarAwarded(false);
    setStamps(
      activeTemplate.items.map((item, index) => ({
        behaviorIndex: index,
        behaviorName: item.text,
        awarded: false,
      }))
    );
  };

  // 👍 스탬프 토글 클릭 핸들러
  const handleToggleStamp = (index: number) => {
    const updated = [...stamps];
    const target = updated[index];
    const willBeAwarded = !target.awarded;

    if (willBeAwarded) {
      soundManager.playStampSound();
      target.awarded = true;
      target.awardedAt = new Date().toISOString();
      target.awardedBy = teacherName;
    } else {
      soundManager.playCancelSound();
      target.awarded = false;
      target.awardedAt = undefined;
      target.awardedBy = undefined;
    }

    setStamps(updated);

    // 차시 완료 판정 로직
    const allAwarded = updated.every((s) => s.awarded);

    const currentSession: Session = {
      id: sessionId,
      studentId: selectedStudent.id,
      templateId: activeTemplate.id,
      templateName: activeTemplate.name,
      date,
      period,
      teacherName,
      stamps: updated,
      completed: allAwarded,
      starAwarded: starAwarded,
      createdAt: new Date().toISOString(),
    };

    // 별을 받았을 경우에만 기록에 남김
    if (allAwarded && !starAwarded) {
      setStarAwarded(true);
      currentSession.starAwarded = true;
      currentSession.awardedAt = new Date().toISOString();
      onCompleteSessionWithStar(currentSession);
    }
  };

  const awardedCount = stamps.filter((s) => s.awarded).length;
  const totalCount = stamps.length;
  const isAllComplete = awardedCount === totalCount;

  // 현재 시간표 중 선택된 교시의 시간 범위 텍스트
  const currentPeriodScheduleItem = schedule.find((s) => s.period === period);

  return (
    <div className="w-full pb-6">
      {/* 모바일: 1열 세로 / 태블릿·PC: 2열 가로 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* === [좌측 영역 (모바일: 상단, PC: 좌측 5/12)] === */}
        <div className="md:col-span-5 space-y-4">
          {/* 1. 상단 바: 전용 학생 카드 & 프로필 수정 & 학생 뷰 전환 */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-3xl shrink-0 p-1 bg-amber-50 rounded-2xl border border-amber-100">
                {selectedStudent.avatar}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 whitespace-nowrap">
                    {selectedStudent.name}
                  </h3>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold whitespace-nowrap shrink-0">
                    {selectedStudent.className}
                  </span>
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap shrink-0">
                    {selectedStudent.grade}학년
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1 whitespace-nowrap">
                  현재 모은 별 <strong className="text-amber-600 font-bold">⭐ {selectedStudent.totalStars}개</strong> / 30
                </p>
              </div>
            </div>
          </div>

          {/* 2. 차시 정보 설정 (시간표 자동 인식 포함) */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
            {/* 차시 템플릿 3종 선택 탭 */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">
                차시 유형 선택 (3가지 템플릿)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DEFAULT_TEMPLATES.map((tpl) => {
                  const isSelected = tpl.id === templateId;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => handleTemplateChange(tpl.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 border-amber-400 text-amber-900 font-extrabold ring-2 ring-amber-400/40'
                          : 'bg-slate-50 border-slate-200 text-slate-600 font-medium hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xl mb-1">{tpl.icon}</span>
                      <span className="text-xs line-clamp-1">{tpl.name}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {tpl.items.length}개 행동
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 교시 자동 인식 & 시간표 안내 바 */}
            <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50/70 rounded-2xl p-3 border border-amber-200/90">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-extrabold text-amber-950">
                    시간 인식 교시 안내
                  </span>
                  {isAutoPeriod ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                      자동 감지 중
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold">
                      교사 수동 설정
                    </span>
                  )}
                </div>

                {/* 시간표 보기/편집 모달 버튼 */}
                {onOpenScheduleModal && (
                  <button
                    onClick={onOpenScheduleModal}
                    title="학교 시간표 보기 및 시간 수정"
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 cursor-pointer underline underline-offset-2"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>시간표 설정</span>
                  </button>
                )}
              </div>

              {/* 현재 시간 상태 문구 */}
              <p className="text-xs font-bold text-slate-700">
                {currentPeriodStatus.statusDescription}
              </p>

              {/* 교시 빠른 선택 버튼 그리드 (1~5교시 + 6교시) */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold mb-1">
                  <span>교시 선택 (교사 직접 변경 가능):</span>
                  {!isAutoPeriod && (
                    <button
                      onClick={handleResetToAutoPeriod}
                      className="text-amber-600 hover:text-amber-700 flex items-center gap-0.5 text-[10px] font-extrabold cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      현재 시각으로 자동 맞춤
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((pNum) => {
                    const isSelected = period === pNum;
                    const sched = schedule.find((s) => s.period === pNum);
                    return (
                      <button
                        key={pNum}
                        onClick={() => handleManualPeriodChange(pNum)}
                        className={`py-1.5 px-1 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center border ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs scale-102'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span>{pNum}교시</span>
                        {sched && (
                          <span
                            className={`text-[9px] font-normal leading-tight ${
                              isSelected ? 'text-amber-100' : 'text-slate-400'
                            }`}
                          >
                            {sched.startTime}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 날짜 및 교사명 가로 배치 */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  날짜
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mb-1">
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  선생님 이름
                </label>
                <input
                  type="text"
                  value={teacherName}
                  placeholder="교사 이름"
                  onChange={(e) => handleTeacherNameChange(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* 태블릿/PC 가이드 카드 */}
          <div className="hidden md:block bg-amber-50 rounded-3xl p-4 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <strong className="block font-black text-amber-800 mb-1">
              💡 실시간 자동 동기화 팁
            </strong>
            이 앱은 <strong>교내 특수학급 및 통합학급 선생님들의 기기와 실시간으로 동기화</strong>됩니다. 오른쪽에서 스탬프를 찍거나 별을 획득하면 교실 대형 화면 및 다른 선생님 기기에도 즉시 반영됩니다.
          </div>
        </div>

        {/* === [우측 영역 (모바일: 하단, PC: 우측 7/12 - 칭찬 스탬프 체크보드)] === */}
        <div className="md:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border-2 border-amber-200 space-y-4">
            {/* 상단 타이틀 & 진행 현황 헤더 */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{activeTemplate.icon}</span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800">
                    {activeTemplate.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-semibold flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold">
                    {period}교시 {currentPeriodScheduleItem ? `(${currentPeriodScheduleItem.startTime}~${currentPeriodScheduleItem.endTime})` : ''}
                  </span>
                  <span>· {date}</span>
                  <span>· {teacherName || '담당교사'}</span>
                </p>
              </div>

              {/* 차시 목표 완료 카운터 */}
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span className="text-sm sm:text-base font-black text-amber-800">
                    {awardedCount} / {totalCount}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  모두 완료 시 ⭐ 1개
                </p>
              </div>
            </div>

            {/* 행동 항목별 👍 스탬프 목록 */}
            <div className="space-y-3">
              {activeTemplate.items.map((item, index) => {
                const stamp = stamps[index];
                const isAwarded = stamp?.awarded;

                return (
                  <motion.div
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleToggleStamp(index)}
                    className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      isAwarded
                        ? 'bg-amber-50/70 border-amber-400 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* 왼쪽: 순서 번호 + 아이콘 + 행동 목표 텍스트 */}
                    <div className="flex items-center gap-3 pr-2">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isAwarded
                            ? 'bg-amber-400 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {item.order}
                      </div>

                      <div className="p-1.5 rounded-lg bg-white shadow-xs border border-slate-100 shrink-0">
                        {renderBehaviorIcon(item.iconName)}
                      </div>

                      <span
                        className={`text-sm sm:text-base font-bold transition-colors ${
                          isAwarded ? 'text-slate-900 font-extrabold' : 'text-slate-600'
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>

                    {/* 오른쪽: 👍 좋아요! 스탬프 버튼 */}
                    <div className="shrink-0">
                      {isAwarded ? (
                        <motion.div
                          initial={{ scale: 1.35, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-black text-xs sm:text-sm shadow-md shadow-red-500/30 flex items-center gap-1.5 border-2 border-red-300 select-none"
                        >
                          <span className="text-base">👍</span>
                          <span>좋아요!</span>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </motion.div>
                      ) : (
                        <div className="px-4 py-2 rounded-2xl bg-white border-2 border-dashed border-slate-300 text-slate-400 font-bold text-xs sm:text-sm flex items-center gap-1.5 hover:border-amber-300 hover:text-amber-500 select-none">
                          <span className="text-base grayscale opacity-60">👍</span>
                          <span>칭찬하기</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* 차시 완료 피드백 상태 알림 */}
            {isAllComplete ? (
              <div className="p-4 rounded-2xl bg-amber-500 text-white font-extrabold text-sm flex items-center justify-between shadow-md">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 animate-spin" />
                  🎉 모든 행동 달성 완료! ⭐ 스타가 지급되었습니다!
                </span>
                <button
                  onClick={handleStartNewSession}
                  className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  새 차시 시작
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
                <span>
                  남은 행동: <strong className="text-amber-600">{totalCount - awardedCount}개</strong>
                </span>
                <button
                  onClick={handleStartNewSession}
                  className="text-slate-400 hover:text-slate-600 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  차시 초기화
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
