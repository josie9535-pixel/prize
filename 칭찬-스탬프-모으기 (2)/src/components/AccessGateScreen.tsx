/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, KeyRound, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { soundManager } from '../utils/sound';
import { CuteStarCharacter } from './CuteStarCharacter';

interface Props {
  onAccessGranted: () => void;
}

const CORRECT_ACCESS_CODE = '0043';
const ACCESS_STORAGE_KEY = 'praise_app_access_granted_v1';

export const AccessGateScreen: React.FC<Props> = ({ onAccessGranted }) => {
  const [code, setCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 자동 포커스
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleVerify = (inputVal: string) => {
    if (inputVal === CORRECT_ACCESS_CODE) {
      setErrorMsg('');
      try {
        localStorage.setItem(ACCESS_STORAGE_KEY, 'true');
        soundManager.playStampSound();
      } catch (e) {
        console.warn('Storage error ignored', e);
      }
      onAccessGranted();
    } else {
      setErrorMsg('접근 코드가 일치하지 않습니다. 다시 입력해주세요.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setCode('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    handleVerify(code);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setCode(val);
    if (errorMsg) setErrorMsg('');

    // 4자리 모두 입력 시 자동 검증
    if (val.length === 4) {
      setTimeout(() => {
        handleVerify(val);
      }, 80);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-slate-50 to-amber-100/60 flex flex-col items-center justify-center p-4">
      <motion.div
        animate={isShaking ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 border-amber-200/80 text-center relative overflow-hidden"
      >
        {/* 상단 장식 바 */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />

        {/* 상단 귀여운 스타 캐릭터 */}
        <div className="my-2 flex justify-center">
          <CuteStarCharacter size="md" animate={true} />
        </div>

        {/* 헤더 안내 */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black shadow-xs mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>칭찬 스탬프 모으기</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          접근 코드 입력
        </h2>

        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          외부 무단 접근 및 남용 방지를 위해
          <br />
          인증된 <strong>접근 코드 4자리</strong>를 입력해주세요.
        </p>

        {/* 코드 입력 폼 */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={code}
              onChange={handleInputChange}
              placeholder="••••"
              className="w-full text-center text-3xl font-black tracking-[0.5em] bg-slate-50 border-2 border-slate-200 focus:border-amber-400 focus:bg-white rounded-2xl py-3.5 px-4 outline-none transition shadow-inner placeholder:tracking-normal placeholder:text-slate-300"
            />
          </div>

          {/* 에러 메시지 */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* 확인 버튼 */}
          <button
            type="submit"
            disabled={code.length < 4}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer ${
              code.length === 4
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-md shadow-amber-500/25'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>앱 접속하기</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 하단 보안 안내 */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
          <span>보안 인증 후 자동으로 메인 화면으로 이동합니다.</span>
        </div>
      </motion.div>
    </div>
  );
};
