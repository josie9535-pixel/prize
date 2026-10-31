/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// 데이터 영구 저장 디렉토리 및 파일 경로
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'app-data.json');

// 기본 시간표 설정 (사용자 요청: 1교시 8:45-9:35, 2교시 9:35-10:25, 3교시 10:25-11:15, 4교시 11:15-12:05, 5교시 12:40-13:35)
const DEFAULT_SCHEDULE = [
  { period: 1, name: '1교시', startTime: '08:45', endTime: '09:35' },
  { period: 2, name: '2교시', startTime: '09:35', endTime: '10:25' },
  { period: 3, name: '3교시', startTime: '10:25', endTime: '11:15' },
  { period: 4, name: '4교시', startTime: '11:15', endTime: '12:05' },
  { period: 5, name: '5교시', startTime: '12:40', endTime: '13:35' },
];

const DEFAULT_INITIAL_STUDENTS = [
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
];

interface AppData {
  students: any[];
  sessions: any[];
  schedule: any[];
  lastUpdated: string;
  version: number;
}

// 메모리 캐시 및 디스크 영구 저장 함수
let currentAppData: AppData = {
  students: DEFAULT_INITIAL_STUDENTS,
  sessions: [],
  schedule: DEFAULT_SCHEDULE,
  lastUpdated: new Date().toISOString(),
  version: 1,
};

function initDataStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.students)) {
        currentAppData = {
          students: parsed.students,
          sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
          schedule: Array.isArray(parsed.schedule) && parsed.schedule.length > 0 ? parsed.schedule : DEFAULT_SCHEDULE,
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          version: typeof parsed.version === 'number' ? parsed.version : 1,
        };
        return;
      }
    }
    // 기본 데이터 저장
    saveDataToDisk();
  } catch (err) {
    console.error('Failed to init data store:', err);
  }
}

function saveDataToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    currentAppData.lastUpdated = new Date().toISOString();
    currentAppData.version = (currentAppData.version || 0) + 1;
    fs.writeFileSync(DATA_FILE, JSON.stringify(currentAppData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save data to disk:', err);
  }
}

initDataStore();

// SSE (Server-Sent Events) 연결 관리: 다른 사용자가 접속해 있을 때 실시간 화면 동기화
type SseClient = {
  id: number;
  res: Response;
};
const sseClients: SseClient[] = [];
let nextClientId = 1;

function broadcastStateUpdate() {
  const payload = JSON.stringify({
    type: 'STATE_UPDATED',
    data: currentAppData,
  });

  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// SSE 스트림 엔드포인트
app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write('\n');

  const clientId = nextClientId++;
  const client: SseClient = { id: clientId, res };
  sseClients.push(client);

  // 접속 즉시 현재 전체 상태 1회 전송
  const initialPayload = JSON.stringify({
    type: 'STATE_UPDATED',
    data: currentAppData,
  });
  res.write(`data: ${initialPayload}\n\n`);

  // 15초 keep-alive 핑
  const keepAliveTimer = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(keepAliveTimer);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAliveTimer);
    const index = sseClients.findIndex((c) => c.id === clientId);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// 1. 전체 상태 조회 API
app.get('/api/state', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: currentAppData,
  });
});

// 2. 전체 상태 일괄 동기화 (Sync)
app.post('/api/sync', (req: Request, res: Response) => {
  const { students, sessions, schedule } = req.body;
  if (Array.isArray(students)) {
    currentAppData.students = students;
  }
  if (Array.isArray(sessions)) {
    currentAppData.sessions = sessions;
  }
  if (Array.isArray(schedule) && schedule.length > 0) {
    currentAppData.schedule = schedule;
  }
  saveDataToDisk();
  broadcastStateUpdate();

  res.json({
    success: true,
    data: currentAppData,
  });
});

// 3. 학생 정보 및 별/쿠폰 업데이트
app.post('/api/students', (req: Request, res: Response) => {
  const { student, students } = req.body;
  if (Array.isArray(students)) {
    currentAppData.students = students;
  } else if (student && student.id) {
    const idx = currentAppData.students.findIndex((s) => s.id === student.id);
    if (idx >= 0) {
      currentAppData.students[idx] = student;
    } else {
      currentAppData.students = [student, ...currentAppData.students];
    }
  }
  saveDataToDisk();
  broadcastStateUpdate();

  res.json({
    success: true,
    data: currentAppData.students,
  });
});

// 4. 완료 세션 추가/업데이트
app.post('/api/sessions', (req: Request, res: Response) => {
  const { session, sessions } = req.body;
  if (Array.isArray(sessions)) {
    currentAppData.sessions = sessions;
  } else if (session && session.id) {
    const idx = currentAppData.sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      currentAppData.sessions[idx] = session;
    } else {
      currentAppData.sessions = [session, ...currentAppData.sessions];
    }
  }
  saveDataToDisk();
  broadcastStateUpdate();

  res.json({
    success: true,
    data: currentAppData.sessions,
  });
});

// 5. 시간표 설정 저장
app.post('/api/schedule', (req: Request, res: Response) => {
  const { schedule } = req.body;
  if (Array.isArray(schedule) && schedule.length > 0) {
    currentAppData.schedule = schedule;
    saveDataToDisk();
    broadcastStateUpdate();
    res.json({ success: true, data: currentAppData.schedule });
  } else {
    res.status(400).json({ success: false, message: 'Invalid schedule format' });
  }
});

// Vite 또는 정적 서빙
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`칭찬 스탬프 모으기 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`실시간 동기화(SSE) 엔드포인트: /api/events 활성화됨`);
  });
}

startServer();
