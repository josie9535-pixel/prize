/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, User, Sparkles, X, Check } from 'lucide-react';
import { Student } from '../types';

interface Props {
  isOpen: boolean;
  student: Student;
  onClose: () => void;
  onSaveStudent: (updated: Student) => void;
}

const AVATAR_OPTIONS = ['🦁', '🐰', '🐻', '🐶', '🐱', '🦊', '🐼', '🐨', '🐯', '🌟', '🚀', '🌈'];

export const StudentProfileModal: React.FC<Props> = ({
  isOpen,
  student,
  onClose,
  onSaveStudent,
}) => {
  const [name, setName] = useState(student.name);
  const [grade, setGrade] = useState(student.grade);
  const [className, setClassName] = useState(student.className);
  const [avatar, setAvatar] = useState(student.avatar);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveStudent({
      ...student,
      name: name.trim(),
      grade: Number(grade) || 1,
      className: className.trim() || '특수학급',
      avatar,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xl">
            {avatar}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              아동 맞춤 프로필 설정
            </h3>
            <p className="text-xs text-slate-500">
              이 사이트는 <strong>해당 아동 1명 전용</strong>으로 안전하게 운영됩니다.
            </p>
          </div>
        </div>

        {/* 개인정보 보호 안내 배너 */}
        <div className="mt-3 bg-emerald-50 rounded-2xl p-3 border border-emerald-200 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-900 leading-relaxed">
            <strong className="block text-emerald-800 font-bold mb-0.5">
              🔒 개인정보 보호 안내
            </strong>
            다른 학생의 정보는 일체 포함되지 않습니다. 실명 대신 학생의 <strong>별명이나 애칭(예: 민준이, 별빛1호)</strong>으로 지정하시면 교과 선생님이나 전담 선생님과 공유해도 안전합니다.
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              학생 이름 또는 별명
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 민준이 / 햇살이"
              required
              className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-amber-400 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                학년
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400 focus:bg-white"
              >
                {[1, 2, 3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>
                    {g}학년
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                학급명
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="예: 희망반 / 2-1"
                className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400 focus:bg-white"
              />
            </div>
          </div>

          {/* 캐릭터 아바타 선택 */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              대표 캐릭터 선택
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatar(em)}
                  className={`h-11 rounded-xl text-xl flex items-center justify-center transition cursor-pointer ${
                    avatar === em
                      ? 'bg-amber-100 border-2 border-amber-500 scale-105 shadow-xs'
                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-md shadow-amber-500/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>개인별 설정 저장하기</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
