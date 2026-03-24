import { useEffect, useState } from 'react';
import { fetchAssets, createAsset, deleteAsset, type Asset } from '../api';
import { formatKRW, CATEGORY_LABELS } from '../utils';

const categories = [
  'real_estate', 'deposit', 'stock', 'fund', 'crypto', 'insurance', 'pension', 'cash', 'other',
] as const;

const emptyForm = {
  category: 'deposit' as string,
  name: '',
  institution: '',
  amount: 0,
  purchase_price: 0,
  quantity: null as number | null,
  currency: 'KRW',
  memo: '',
};

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [filter, setFilter] = useState('');

  const load = async () => {
    try {
      const res = await fetchAssets(filter || undefined);
      setAssets(res.data);
    } catch { /* server not running */ }
  };

  useEffect(() => { load(); }, [filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAsset({
      ...form,
      institution: form.institution || null,
      purchase_price: form.purchase_price || null,
      memo: form.memo || null,
    });
    setForm({ ...emptyForm });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await deleteAsset(id);
    load();
  };

  const totalAmount = assets.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">자산 관리</h2>
          <p className="text-sm text-slate-500">총 {formatKRW(totalAmount)}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          {showForm ? '취소' : '+ 자산 추가'}
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')} className={`px-3 py-1 rounded-full text-xs ${!filter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>전체</button>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1 rounded-full text-xs ${filter === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <input placeholder="자산명" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="기관 (선택)" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="현재 평가액" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="매입가 (선택)" value={form.purchase_price || ''} onChange={e => setForm({ ...form, purchase_price: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="메모 (선택)" value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700">저장</button>
        </form>
      )}

      {/* Asset List */}
      <div className="space-y-2">
        {assets.map(asset => (
          <div key={asset.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{CATEGORY_LABELS[asset.category] || asset.category}</span>
                <span className="font-medium">{asset.name}</span>
                {asset.institution && <span className="text-xs text-slate-400">{asset.institution}</span>}
              </div>
              {asset.purchase_price && (
                <div className="text-xs text-slate-400 mt-1">
                  매입가: {formatKRW(asset.purchase_price)}
                  {asset.amount > asset.purchase_price
                    ? <span className="text-red-500 ml-2">+{((asset.amount / asset.purchase_price - 1) * 100).toFixed(1)}%</span>
                    : <span className="text-blue-500 ml-2">{((asset.amount / asset.purchase_price - 1) * 100).toFixed(1)}%</span>
                  }
                </div>
              )}
              {asset.memo && <div className="text-xs text-slate-400 mt-1">{asset.memo}</div>}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-blue-600">{formatKRW(asset.amount)}</span>
              <button onClick={() => handleDelete(asset.id)} className="text-red-400 hover:text-red-600 text-sm">삭제</button>
            </div>
          </div>
        ))}
        {assets.length === 0 && <div className="text-center py-8 text-slate-400">등록된 자산이 없습니다</div>}
      </div>
    </div>
  );
}
