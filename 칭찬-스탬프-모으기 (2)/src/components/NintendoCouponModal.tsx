/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Gamepad2, Sparkles, CheckCircle2, Check, RotateCcw, X } from 'lucide-react';
import { NintendoCoupon, Student } from '../types';
import { soundManager } from '../utils/sound';

interface Props {
  isOpen: boolean;
  coupon: NintendoCoupon | null;
  student: Student;
  isNewAward?: boolean; // 갓 30개 달성해서 지급된 순간인지
  onClose: () => void;
  onUseCoupon?: (couponId: string) => void;
}

export const NintendoCouponModal: React.FC<Props> = ({
  isOpen,
  coupon,
  student,
  isNewAward = false,
  onClose,
  onUseCoupon,
}) => {
  useEffect(() => {
    if (isOpen && isNewAward) {
      try {
        soundManager.playNintendoCouponFanfare();
      } catch (e) {
        console.warn('Coupon fanfare error:', e);
      }
    }
  }, [isOpen, isNewAward]);

  if (!isOpen || !coupon) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-opacity duration-300"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-4 border-red-500 overflow-hidden text-center animate-in fade-in zoom-in-95 duration-200"
      >
        {/* 상단 닫기 X 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 상단 스위치 테마 장식 바 */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-red-500 via-rose-500 via-50% to-sky-500" />

        {/* 상단 팡파레 뱃지 */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xs sm:text-sm shadow-md mb-2">
          <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
          <span>⭐ 스타 30개 달성 보상!</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
          🎮 닌텐도 게임 쿠폰 획득!
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 mt-1 font-semibold">
          {isNewAward ? (
            <>
              <strong className="text-red-600">{student.name}</strong> 학생이 행동 목표 30개를 모아
              <br />
              닌텐도 게임 1회 이용 쿠폰을 받았습니다!
            </>
          ) : (
            '보관함에 보관된 닌텐도 게임 쿠폰입니다.'
          )}
        </p>

        {/* 닌텐도 스위치 스타일 실물 티켓 쿠폰 카드 */}
        <div className="my-5 relative rounded-2xl bg-gradient-to-r from-red-500 via-red-600 to-sky-500 p-1 shadow-xl text-left transform hover:scale-[1.01] transition-transform">
          <div className="bg-slate-950 text-white rounded-[14px] p-4 relative overflow-hidden">
            {/* 쿠폰 상단: 닌텐도 스위치 컬러 조이콘 모티브 */}
            <div className="flex items-center justify-between pb-3 border-b border-white/15">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center shadow-inner">
                  <Gamepad2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">
                    Special Reward Ticket
                  </span>
                  <h3 className="text-sm font-black text-white">
                    닌텐도 게임 1회 이용권
                  </h3>
                </div>
              </div>

              {coupon.isUsed ? (
                <span className="px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 font-extrabold text-[11px] border border-slate-600">
                  소진 완료
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white font-black text-[11px] shadow-sm animate-pulse">
                  사용 가능
                </span>
              )}
            </div>

            {/* 쿠폰 중앙 내용 */}
            <div className="py-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">수여자</span>
                <span className="text-sm font-black text-amber-300 flex items-center gap-1">
                  <span>{student.avatar}</span> {student.name} 학생
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">발급 일시</span>
                <span className="text-xs font-semibold text-slate-300">
                  {coupon.issuedAt.slice(0, 10)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">쿠폰 코드</span>
                <span className="text-xs font-mono font-bold text-sky-300 tracking-wider">
                  {coupon.code}
                </span>
              </div>
            </div>

            {/* 쿠폰 절취선 효과 */}
            <div className="relative my-1">
              <div className="border-t border-dashed border-white/20 w-full" />
              <div className="absolute -left-6 -top-2 w-4 h-4 bg-white rounded-full" />
              <div className="absolute -right-6 -top-2 w-4 h-4 bg-white rounded-full" />
            </div>

            {/* 쿠폰 하단 혜택 안내 */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>학교 / 특수학급 닌텐도 자유시간 1회</span>
              <span className="text-amber-400 font-bold">⭐ 30개 보상</span>
            </div>
          </div>
        </div>

        {/* 별 0개 전환 안내 (사용자 요구사항 반영) */}
        {isNewAward && (
          <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 text-xs text-amber-900 font-bold mb-4 flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              별 30개가 쿠폰으로 전환되어 <strong>별 0개</strong>로 리셋되었습니다!
            </span>
          </div>
        )}

        {/* 하단 동작 버튼들 */}
        <div className="space-y-2">
          {!coupon.isUsed && onUseCoupon && (
            <button
              onClick={() => onUseCoupon(coupon.id)}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-sm shadow-md active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>선생님: 쿠폰 소진하기 (사용 완료)</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>확인 완료</span>
          </button>
        </div>
      </div>
    </div>
  );
};
