import { useEffect, useState } from 'react';
import api from '../api';

interface SyncStatus {
  has_local_changes: boolean;
  drive_authenticated: boolean;
  last_sync: string;
  device: string;
}

interface ExtStatus {
  configured: boolean;
  message: string;
  has_account?: boolean;
}

export default function Sync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [kiwoomStatus, setKiwoomStatus] = useState<ExtStatus | null>(null);
  const [bankStatus, setBankStatus] = useState<ExtStatus | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    try {
      const [s, k, b] = await Promise.all([
        api.get('/sync/status'),
        api.get('/external/kiwoom/status'),
        api.get('/external/bank/status'),
      ]);
      setSyncStatus(s.data);
      setKiwoomStatus(k.data);
      setBankStatus(b.data);
    } catch {}
  };

  useEffect(() => { loadStatus(); }, []);

  const handleUpload = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post('/sync/upload');
      setMessage(`업로드 완료: ${res.data.message}`);
      loadStatus();
    } catch (e: any) {
      setMessage(`오류: ${e.response?.data?.detail || '업로드 실패'}`);
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post('/sync/download');
      setMessage(`다운로드 완료: ${res.data.message} (원격: ${res.data.remote_device})`);
      loadStatus();
    } catch (e: any) {
      setMessage(`오류: ${e.response?.data?.detail || '다운로드 실패'}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">동기화 & 연동</h2>

      {/* Google Drive Sync */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold mb-3">Google Drive 동기화</h3>
        {syncStatus && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-slate-500">인증 상태</div>
              <div className={`text-sm font-bold ${syncStatus.drive_authenticated ? 'text-emerald-600' : 'text-red-500'}`}>
                {syncStatus.drive_authenticated ? '연결됨' : '미연결'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500">로컬 변경</div>
              <div className={`text-sm font-bold ${syncStatus.has_local_changes ? 'text-amber-600' : 'text-slate-400'}`}>
                {syncStatus.has_local_changes ? '변경 있음' : '최신 상태'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500">마지막 동기화</div>
              <div className="text-sm">{syncStatus.last_sync || '-'}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-500">기기</div>
              <div className="text-sm">{syncStatus.device || '-'}</div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleUpload} disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            Drive에 업로드
          </button>
          <button onClick={handleDownload} disabled={loading} className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
            Drive에서 다운로드
          </button>
        </div>

        {message && <div className="mt-3 text-sm p-3 bg-slate-50 rounded-lg">{message}</div>}

        {syncStatus && !syncStatus.drive_authenticated && (
          <div className="mt-3 text-sm p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <strong>설정 방법:</strong>
            <ol className="list-decimal ml-5 mt-1 space-y-1">
              <li>Google Cloud Console에서 OAuth2 클라이언트 ID 생성</li>
              <li>인증 정보 JSON을 <code className="bg-amber-100 px-1 rounded">backend/data/gdrive_credentials.json</code>에 저장</li>
              <li><code className="bg-amber-100 px-1 rounded">backend/.env</code>에 <code>SYNC_ENCRYPTION_KEY=원하는비밀키</code> 설정</li>
              <li>업로드/다운로드 버튼 클릭 시 브라우저에서 Google 인증 진행</li>
            </ol>
          </div>
        )}
      </div>

      {/* External APIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kiwoom */}
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold mb-3">키움증권</h3>
          {kiwoomStatus && (
            <>
              <div className={`text-sm font-bold mb-2 ${kiwoomStatus.configured ? 'text-emerald-600' : 'text-red-500'}`}>
                {kiwoomStatus.configured ? '연동 준비 완료' : '미설정'}
              </div>
              <p className="text-sm text-slate-500">{kiwoomStatus.message}</p>
              {!kiwoomStatus.configured && (
                <div className="mt-3 text-xs p-3 bg-slate-50 rounded-lg space-y-1">
                  <div>1. 키움증권 Open API 신청</div>
                  <div>2. <code className="bg-slate-200 px-1 rounded">.env</code>에 KIUM_APP_KEY, KIUM_APP_SECRET 설정</div>
                  <div>3. KIWOOM_ACCOUNT=계좌번호 설정</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bank */}
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold mb-3">신한은행 (오픈뱅킹)</h3>
          {bankStatus && (
            <>
              <div className={`text-sm font-bold mb-2 ${bankStatus.configured ? 'text-emerald-600' : 'text-red-500'}`}>
                {bankStatus.configured ? '연동 준비 완료' : '미설정'}
              </div>
              <p className="text-sm text-slate-500">{bankStatus.message}</p>
              {!bankStatus.configured && (
                <div className="mt-3 text-xs p-3 bg-slate-50 rounded-lg space-y-1">
                  <div>1. 금융결제원 오픈뱅킹 테스트 등록</div>
                  <div>2. <code className="bg-slate-200 px-1 rounded">.env</code>에 OPENBANKING_ACCESS_TOKEN 설정</div>
                  <div>3. OPENBANKING_USER_SEQ_NO 설정</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
