import { useEffect, useState } from 'react';
import api from '../api';
import { formatKRW } from '../utils';

interface Trade {
  apartment_name: string;
  area: number;
  floor: string;
  price: number;
  deal_date: string;
  dong: string;
  year_built: string | null;
}

interface RegionSummary {
  region: string;
  avg_price: number;
  max_price: number;
  min_price: number;
  trade_count: number;
  trades: Trade[];
}

export default function RealEstate() {
  const [regions, setRegions] = useState<{ name: string; code: string }[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('11680');
  const [data, setData] = useState<RegionSummary | null>(null);
  const [searchName, setSearchName] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/realestate/regions').then(res => setRegions(res.data)).catch(() => {});
  }, []);

  const loadTrades = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/realestate/trades', { params: { region_code: selectedRegion } });
      setData(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || '조회 실패');
    }
    setLoading(false);
  };

  const searchApartment = async () => {
    if (!searchName) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/realestate/my-apartment', { params: { apartment_name: searchName, region_code: selectedRegion } });
      setSearchResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || '조회 실패');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">부동산 시세</h2>

      {/* Region Select + Search */}
      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-500">지역 선택</label>
            <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full">
              {regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={loadTrades} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm w-full disabled:opacity-50">
              실거래가 조회
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">내 아파트 검색</label>
            <input placeholder="아파트명 (예: 래미안, 자이)" value={searchName} onChange={e => setSearchName(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div className="flex items-end">
            <button onClick={searchApartment} disabled={loading} className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm w-full disabled:opacity-50">
              검색
            </button>
          </div>
        </div>

        {error && <div className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{error}</div>}
      </div>

      {/* Region Summary */}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-slate-500">{data.region} 평균가</div>
              <div className="text-lg font-bold text-blue-600">{formatKRW(data.avg_price * 10000)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-slate-500">최고가</div>
              <div className="text-lg font-bold text-red-500">{formatKRW(data.max_price * 10000)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-slate-500">최저가</div>
              <div className="text-lg font-bold text-emerald-600">{formatKRW(data.min_price * 10000)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-slate-500">거래 건수</div>
              <div className="text-lg font-bold">{data.trade_count}건</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2">아파트</th>
                  <th className="text-right px-4 py-2">면적(m2)</th>
                  <th className="text-right px-4 py-2">층</th>
                  <th className="text-right px-4 py-2">거래가</th>
                  <th className="text-right px-4 py-2">거래일</th>
                </tr>
              </thead>
              <tbody>
                {data.trades.map((t, i) => (
                  <tr key={i} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <div>{t.apartment_name}</div>
                      <div className="text-xs text-slate-400">{t.dong} {t.year_built && `(${t.year_built}년)`}</div>
                    </td>
                    <td className="text-right px-4 py-2">{t.area}</td>
                    <td className="text-right px-4 py-2">{t.floor}층</td>
                    <td className="text-right px-4 py-2 font-bold text-blue-600">{formatKRW(t.price * 10000)}</td>
                    <td className="text-right px-4 py-2 text-slate-500">{t.deal_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* My Apartment Search Results */}
      {searchResult && searchResult.trades && (
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold mb-3">'{searchResult.apartment_name}' 최근 거래 ({searchResult.trade_count}건)</h3>
          <div className="space-y-2">
            {searchResult.trades.map((t: Trade, i: number) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <span className="font-medium">{t.apartment_name}</span>
                  <span className="text-xs text-slate-400 ml-2">{t.area}m2 / {t.floor}층</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">{formatKRW(t.price * 10000)}</div>
                  <div className="text-xs text-slate-400">{t.deal_date}</div>
                </div>
              </div>
            ))}
          </div>
          {searchResult.message && <div className="text-slate-500 text-sm mt-2">{searchResult.message}</div>}
        </div>
      )}

      {!data && !searchResult && !loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <strong>설정 필요:</strong> 부동산 실거래가 조회를 위해 공공데이터포털(data.go.kr)에서 API 키를 발급받아
          <code className="bg-amber-100 px-1 rounded mx-1">backend/.env</code>에 <code className="bg-amber-100 px-1 rounded">DATA_GO_KR_API_KEY=발급받은키</code>를 추가해주세요.
        </div>
      )}
    </div>
  );
}
