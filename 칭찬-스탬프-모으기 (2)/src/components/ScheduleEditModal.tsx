/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Clock, X, Check, RotateCcw, AlertCircle, Info } from 'lucide-react';
import { SchedulePeriod, DEFAULT_SCHEDULE } from '../types';

interface Props {
  isOpen: boolean;
  schedule: SchedulePeriod[];
  onClose: () => void;
  onSaveSchedule: (newSchedule: SchedulePeriod[]) => void;
}

export const ScheduleEditModal: React.FC<Props> = ({
  isOpen,
  schedule,
  onClose,
  onSaveSchedule,
}) => {
  const [editingSchedule, setEditingSchedule] = useState<SchedulePeriod[]>(schedule);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleTimeChange = (
    index: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setEditingSchedule((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
    if (errorMsg) setErrorMsg('');
  };

  const handleResetToDefault = () => {
    setEditingSchedule(DEFAULT_SCHEDULE);
    setErrorMsg('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // 간단한 검증
    for (const item of editingSchedule) {
      if (!item.startTime || !item.endTime) {
        setErrorMsg('모든 교시의 시작과 종료 시간을 입력해주세요.');
        return;
      }
      if (item.startTime >= item.endTime) {
        setErrorMsg(`${item.period}교시 시작 시간이 종료 시간보다 늦을 수 없습니다.`);
        return;
      }
    }

    onSaveSchedule(editingSchedule);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border-2 border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* 상단 닫기 X 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 헤더 */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                학교 시간표 및 교시 설정
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold flex items-center gap-1">
                <span>🔒 관리자 인증됨</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              현재 시각을 인식하여 교시를 자동 추천합니다.
            </p>
          </div>
        </div>

        {/* 안내 배너 */}
        <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 my-3 text-xs text-amber-900 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            수업 시간이 되면 해당 교시가 <strong>자동으로 기본 선택</strong>됩니다. 필요할 때 교사가 직접 자유롭게 교시를 변경할 수도 있습니다.
          </div>
        </div>

        {/* 교시별 시간표 입력 폼 */}
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
            {editingSchedule.map((item, idx) => (
              <div
                key={item.period}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                    {item.period}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {item.period}교시
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    type="time"
                    value={item.startTime}
                    onChange={(e) =>
                      handleTimeChange(idx, 'startTime', e.target.value)
                    }
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-slate-400 font-bold">~</span>
                  <input
                    type="time"
                    value={item.endTime}
                    onChange={(e) =>
                      handleTimeChange(idx, 'endTime', e.target.value)
                    }
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            ))}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 하단 버튼들 */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>기본값 초기화</span>
            </button>

            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-sm active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>시간표 저장 (동기화)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
