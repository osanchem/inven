import { useEffect, useMemo, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QRCodeCanvas } from "qrcode.react";
import { EXPERIMENT_PRESETS } from "./experimentPresets";
import * as api from "./gsheets";
import { applyTransactions, convertToBase, findChemicalByName, getUnitOptions, makeId, normalizeChemical, normalizeLog, today, toArray } from "./domain/inventory";

const SCHOOL_NAME = import.meta.env.VITE_SCHOOL_NAME || "오산고등학교 과학실";
const APPS_SCRIPT_SOURCE = `${import.meta.env.BASE_URL}gsheets-backend.gs`;

const SAMPLE_CHEMICALS = [
  { id: "C001", name: "염산", category: "산", unit: "mL", stock: 2500, minStock: 500, location: "A-1", hazards: ["corrosive"], msdsUrl: "", memo: "1 M", supplier: "대한화학", lastUpdated: "2026-03-01", aliases: ["HCl", "hydrochloric acid", "묽은 염산"], casNo: "7647-01-0" },
  { id: "C002", name: "수산화 나트륨", category: "염기", unit: "g", stock: 1800, minStock: 300, location: "A-2", hazards: ["corrosive"], msdsUrl: "", memo: "고체", supplier: "대한화학", lastUpdated: "2026-03-01", aliases: ["NaOH", "가성소다", "sodium hydroxide"], casNo: "1310-73-2" },
  { id: "C003", name: "에탄올", category: "유기 용매", unit: "mL", stock: 4000, minStock: 1000, location: "B-1", hazards: ["flammable"], msdsUrl: "", memo: "95%", supplier: "일진시약", lastUpdated: "2026-03-01", aliases: ["ethyl alcohol", "C2H5OH"], casNo: "64-17-5" },
  { id: "C004", name: "황산구리(II)", category: "금속염", unit: "g", stock: 350, minStock: 100, location: "C-2", hazards: ["irritant"], msdsUrl: "", memo: "5수화물", supplier: "일진시약", lastUpdated: "2026-03-01", aliases: ["황산구리", "CuSO4", "copper sulfate"], casNo: "7758-98-7" },
  { id: "C005", name: "증류수", category: "기타", unit: "mL", stock: 20000, minStock: 5000, location: "W-1", hazards: [], msdsUrl: "", memo: "", supplier: "자체", lastUpdated: "2026-03-01", aliases: ["물", "distilled water"], casNo: "" },
  { id: "C006", name: "과산화 수소", category: "산화제", unit: "mL", stock: 800, minStock: 200, location: "A-3", hazards: ["oxidizer"], msdsUrl: "", memo: "30%", supplier: "대한화학", lastUpdated: "2026-03-01", aliases: ["H2O2", "hydrogen peroxide"], casNo: "7722-84-1" },
  { id: "C007", name: "염화 나트륨", category: "염", unit: "g", stock: 2500, minStock: 500, location: "C-1", hazards: [], msdsUrl: "", memo: "", supplier: "대한화학", lastUpdated: "2026-03-01", aliases: ["소금", "NaCl", "sodium chloride"], casNo: "7647-14-5" },
  { id: "C008", name: "요오드 용액", category: "지시약", unit: "mL", stock: 300, minStock: 100, location: "D-1", hazards: ["irritant"], msdsUrl: "", memo: "", supplier: "대한화학", lastUpdated: "2026-03-01", aliases: ["아이오딘", "iodine"], casNo: "" },
];

const SUBJECTS = ["전체", "화학", "생물", "물리"];
const emptyChemical = { name: "", category: "", unit: "g", stock: "", minStock: "", location: "", hazards: "", msdsUrl: "", memo: "", supplier: "", aliases: "", casNo: "" };
const emptyLog = { chemicalId: "", type: "out", amount: "", unit: "", user: "", purpose: "", note: "" };
const emptyExperiment = { name: "", subject: "화학", grade: "1학년", description: "" };
const emptyExpChemical = { chemicalName: "", amount: "", unit: "g", note: "" };
const localDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function SetupScreen({ onConnected, onDemo }) {
  const [url, setUrl] = useState(api.getGSheetsUrl());
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const copyScript = async () => {
    setError("");
    try {
      const response = await fetch(APPS_SCRIPT_SOURCE);
      if (!response.ok) throw new Error("Apps Script 코드를 불러오지 못했습니다.");
      const code = await response.text();
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      try {
        const response = await fetch(APPS_SCRIPT_SOURCE);
        if (!response.ok) throw new Error("Apps Script 코드를 불러오지 못했습니다.");
        const code = await response.text();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([code], { type: "text/plain;charset=utf-8" }));
        link.download = "gsheets-backend.gs";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      } catch {
        setError("스크립트 파일을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해주세요.");
      }
    }
  };

  const connect = async () => {
    if (!url.trim()) {
      setError("4단계에서 복사한 웹 앱 URL을 입력해주세요.");
      return;
    }
    setTesting(true);
    setError("");
    const previous = api.getGSheetsUrl();
    api.setGSheetsUrl(url);
    try {
      await api.fetchChemicals();
      localStorage.removeItem("demoStarted");
      onConnected();
    } catch {
      if (previous) api.setGSheetsUrl(previous);
      else api.clearGSheetsUrl();
      setError("연결에 실패했습니다. 아래 사항을 확인하세요: ① URL이 정확한지 ② Apps Script 배포 시 액세스 권한을 '모든 사용자'로 설정했는지");
    } finally {
      setTesting(false);
    }
  };

  return (
    <main className="setup-shell">
      <section className="setup-panel">
        <div className="brand-mark">LAB</div>
        <h1>시약장 관리 앱 연결하기</h1>
        <p className="muted">선생님의 Google 계정에 데이터가 저장됩니다. 새 스프레드시트를 만든 뒤 원장 CSV 자료를 가져오세요.</p>
        <div className="steps">
          <div>
            <strong>1</strong>
            <span>
              <a href="https://sheets.new" target="_blank" rel="noopener noreferrer">Google 스프레드시트 새 파일</a>을 만드세요.
              <span className="step-hint">파일 이름은 자유롭게 정하세요. 기존 데이터가 없는 새 파일을 사용하세요.</span>
            </span>
          </div>
          <div>
            <strong>2</strong>
            <span>
              스프레드시트 상단 메뉴에서 <b>확장 프로그램 → Apps Script</b>를 클릭하세요.<br />
              열린 편집 화면에서 기존 내용을 <b>전부 지운 뒤</b> 아래 버튼으로 백엔드 코드를 복사해 붙여넣고 <b>저장(Ctrl+S)</b>하세요.
              <br />
              <button className="copy-btn" onClick={copyScript}>{copied ? "✅ 복사 완료!" : "📋 백엔드 코드 복사"}</button>
            </span>
          </div>
          <div>
            <strong>3</strong>
            <span>
              저장한 뒤 함수 목록에서 <b>initializeDatabase</b>를 선택하고 <b>실행</b>을 한 번 누르세요. Google 권한 요청을 허용하면 앱에 필요한 4개 탭과 열 이름이 준비됩니다.
              <span className="step-hint">기존 약품이나 출납 기록이 있는 시트에서는 중복 방지를 위해 초기화를 중단합니다.</span>
            </span>
          </div>
          <div>
            <strong>4</strong>
            <span>
              배포 패키지의 <b>data</b> 폴더에서 약품과 이력 CSV를 각각 가져옵니다. 스프레드시트의 <b>chemicals</b> 탭을 선택하고 <b>파일 → 가져오기</b>에서 <b>google_sheets_chemicals.csv</b>를 올린 뒤 가져오기 위치를 <b>현재 시트 바꾸기</b>로 지정하세요. <b>logs</b> 탭에도 <b>google_sheets_logs.csv</b>를 같은 방식으로 가져옵니다.
              <span className="step-hint">수량은 PDF 원장의 마지막 기재 잔량입니다. 실제 재고를 확인한 뒤 출납을 시작하세요.</span>
            </span>
          </div>
          <div>
            <strong>5</strong>
            <span>
              Apps Script 화면 오른쪽 위 <b>배포 → 새 배포</b>를 클릭하세요.<br />
              <span className="step-table">
                <span>유형</span><b>웹 앱</b>
                <span>실행 사용자</span><b>나</b>
                <span>액세스 권한</span><b>모든 사용자</b>
              </span>
              <b>배포</b> 버튼을 누르고, Google 계정 권한 허용 요청이 나오면 <b>허용</b>을 클릭하세요.
              <span className="step-hint">⚠️ '안전하지 않은 앱' 경고가 나오면 '고급 → 이동(안전하지 않음)'을 클릭하세요.</span>
            </span>
          </div>
          <div>
            <strong>6</strong>
            <span>
              배포 완료 화면에 표시된 <b>웹 앱 URL</b>을 복사해서 아래에 붙여넣으세요.
              <span className="step-hint">URL 형식 예시: https://script.google.com/macros/s/XXXXXXX/exec</span>
            </span>
          </div>
        </div>
        <label className="field">
          <span>6단계에서 복사한 웹 앱 URL</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" />
        </label>
        {error && <p className="error-text">{error}</p>}
        <div className="button-row">
          <button className="primary" onClick={connect} disabled={testing}>{testing ? "연결 확인 중..." : "연결"}</button>
          <button className="ghost" onClick={onDemo}>데모로 먼저 둘러보기</button>
        </div>
        <p className="setup-footer">데이터는 선생님의 Google Drive에만 저장됩니다. 개발자는 접근할 수 없습니다.</p>
      </section>
    </main>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} title="닫기">×</button>
        </header>
        {children}
      </section>
    </div>
  );
}

function ChemicalQRCodeModal({ chemical, onClose }) {
  const download = () => {
    const canvas = document.getElementById("chemical-qr-canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    const safeName = String(chemical.name).replace(/[\\/:*?"<>|]/g, "_");
    link.href = canvas.toDataURL("image/png");
    link.download = `${chemical.id}-${safeName}-QR.png`;
    link.click();
  };

  return (
    <Modal title="약품 QR 코드" onClose={onClose}>
      <div className="qr-code-content">
        <QRCodeCanvas id="chemical-qr-canvas" value={chemical.id} size={240} level="H" includeMargin />
        <h3>{chemical.name}</h3>
        <p>약품 코드: {chemical.id}</p>
        <p className="muted">이 QR 코드를 스캔하면 등록된 약품을 찾습니다.</p>
      </div>
      <div className="button-row right">
        <button className="ghost" onClick={onClose}>닫기</button>
        <button className="primary" onClick={download}>PNG 저장</button>
      </div>
    </Modal>
  );
}

function ChemicalForm({ initial = emptyChemical, onSave, onClose }) {
  const [form, setForm] = useState({ ...emptyChemical, ...initial, hazards: toArray(initial.hazards).join(", "), aliases: toArray(initial.aliases).join(", ") });
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const submit = () => {
    if (!form.name.trim()) return;
    onSave(normalizeChemical({ ...form, id: initial.id || makeId("C"), hazards: form.hazards, aliases: form.aliases, lastUpdated: today() }));
  };
  return (
    <Modal title={initial.id ? "약품 수정" : "약품 추가"} onClose={onClose}>
      <div className="form-grid">
        <label><span>약품명</span><input value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label><span>분류</span><input value={form.category} onChange={(e) => set("category", e.target.value)} /></label>
        <label><span>단위{initial.id ? " (등록 후 변경 불가)" : ""}</span><select value={form.unit} disabled={Boolean(initial.id)} onChange={(e) => set("unit", e.target.value)}><option>g</option><option>mL</option><option>개</option></select></label>
        <label><span>현재재고{initial.id ? " (입출고 기록으로 변경)" : ""}</span><input type="number" min="0" step="any" value={form.stock} readOnly={Boolean(initial.id)} onChange={(e) => set("stock", e.target.value)} /></label>
        <label><span>최소재고</span><input type="number" value={form.minStock} onChange={(e) => set("minStock", e.target.value)} /></label>
        <label><span>위치</span><input value={form.location} onChange={(e) => set("location", e.target.value)} /></label>
        <label><span>공급처</span><input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} /></label>
        <label><span>CAS No.</span><input value={form.casNo} onChange={(e) => set("casNo", e.target.value)} /></label>
        <label className="wide"><span>별칭</span><input value={form.aliases} onChange={(e) => set("aliases", e.target.value)} placeholder="쉼표로 구분" /></label>
        <label className="wide"><span>메모</span><textarea value={form.memo} onChange={(e) => set("memo", e.target.value)} /></label>
      </div>
      <div className="button-row right"><button className="ghost" onClick={onClose}>취소</button><button className="primary" onClick={submit}>저장</button></div>
    </Modal>
  );
}

function LogForm({ chemicals, initial = emptyLog, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [requestId] = useState(() => makeId("L"));
  const selected = chemicals.find((c) => c.id === form.chemicalId);
  const unit = form.unit || selected?.unit || "g";
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const submit = async () => {
    if (!form.chemicalId || !selected) return setError("약품을 선택해주세요.");
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) return setError("수량은 0보다 큰 숫자로 입력해주세요.");
    if (!form.user.trim()) return setError("담당자를 입력해주세요.");
    const baseAmount = convertToBase(form.amount, unit, selected.unit);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) return setError("수량과 단위를 확인해주세요.");
    if (form.type === "out" && baseAmount > selected.stock) return setError(`재고가 부족합니다. 현재 재고는 ${selected.stock}${selected.unit}입니다.`);
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, id: requestId, unit });
    } catch (err) {
      setError(err.message || "출납 기록을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title="입출고 기록" onClose={onClose}>
      <div className="form-grid">
        <label className="wide"><span>약품</span><select value={form.chemicalId} onChange={(e) => { const chemical = chemicals.find((c) => c.id === e.target.value); setForm((prev) => ({ ...prev, chemicalId: e.target.value, unit: chemical?.unit || "" })); }}><option value="">선택</option>{chemicals.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.stock}{c.unit})</option>)}</select></label>
        <label><span>유형</span><select value={form.type} onChange={(e) => set("type", e.target.value)}><option value="out">출고</option><option value="in">입고</option></select></label>
        <label><span>수량</span><input type="number" min="0" step="any" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></label>
        <label><span>단위</span><select value={unit} onChange={(e) => set("unit", e.target.value)}>{getUnitOptions(selected?.unit).map((option) => <option key={option}>{option}</option>)}</select></label>
        <label><span>담당자</span><input value={form.user} onChange={(e) => set("user", e.target.value)} /></label>
        <label className="wide"><span>용도</span><input value={form.purpose} onChange={(e) => set("purpose", e.target.value)} /></label>
        <label className="wide"><span>비고</span><textarea value={form.note} onChange={(e) => set("note", e.target.value)} /></label>
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="button-row right"><button className="ghost" onClick={onClose} disabled={saving}>취소</button><button className="primary" onClick={submit} disabled={saving}>{saving ? "저장 중..." : "기록"}</button></div>
    </Modal>
  );
}

function QRScannerView({ chemicals, onFound, notify }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 240, height: 240 } }, false);
    scanner.render((decodedText) => {
      const found = chemicals.find((chemical) => chemical.id === decodedText.trim());
      if (found) onFound(found);
      else notify("등록되지 않은 약품입니다.");
      scanner.clear().catch(() => {});
    }, () => {});
    return () => { scanner.clear().catch(() => {}); };
  }, [chemicals, notify, onFound]);

  return <div id="qr-reader" className="qr-reader" />;
}

function ExperimentsView({ chemicals, logs, experiments, expChemicals, onAddExperiment, onDeleteExperiment, onAddExpChemical, onDeleteExpChemical, onImportPresets, onPrepared }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("전체");
  const [selectedId, setSelectedId] = useState(experiments[0]?.id || "");
  const [checked, setChecked] = useState({});
  const [preparing, setPreparing] = useState(false);
  const [prepareRequestId, setPrepareRequestId] = useState(() => makeId("B"));
  const [showExperimentForm, setShowExperimentForm] = useState(false);
  const [showChemicalForm, setShowChemicalForm] = useState(false);
  const [expForm, setExpForm] = useState(emptyExperiment);
  const [chemForm, setChemForm] = useState(emptyExpChemical);

  useEffect(() => {
    if (!selectedId && experiments[0]) setSelectedId(experiments[0].id);
    if (selectedId && !experiments.some((e) => e.id === selectedId)) setSelectedId(experiments[0]?.id || "");
  }, [experiments, selectedId]);

  const filtered = experiments.filter((exp) => {
    const matchesSubject = subject === "전체" || exp.subject === subject;
    const text = `${exp.name} ${exp.description} ${exp.subject} ${exp.grade}`.toLowerCase();
    return matchesSubject && text.includes(query.toLowerCase());
  });
  const selected = experiments.find((e) => e.id === selectedId) || filtered[0];
  const materials = expChemicals.filter((item) => item.experimentId === selected?.id);

  const rows = materials.map((item) => {
    const chemical = findChemicalByName(chemicals, item.chemicalName);
    const needed = chemical ? convertToBase(item.amount, item.unit, chemical.unit) : Number(item.amount || 0);
    const available = chemical ? Number(chemical.stock || 0) : 0;
    return { ...item, key: `${item.experimentId}||${item.chemicalName}`, chemical, needed, available, ok: Boolean(chemical) && needed <= available };
  });

  const allChecked = rows.length > 0 && rows.every((r) => checked[r.key]);
  const toggleAll = () => {
    setChecked((prev) => {
      const next = { ...prev };
      rows.forEach((row) => { next[row.key] = !allChecked; });
      return next;
    });
  };

  return (
    <div className="content two-column">
      <section className="pane">
        <div className="toolbar">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="실험명 검색" />
          <button className="primary small" onClick={() => setShowExperimentForm(true)}>실험 추가</button>
        </div>
        <div className="chips">{SUBJECTS.map((s) => <button key={s} className={subject === s ? "chip active" : "chip"} onClick={() => setSubject(s)}>{s}</button>)}</div>
        <div className="list">
          {filtered.map((exp) => (
            <button key={exp.id} className={selected?.id === exp.id ? "list-item selected" : "list-item"} onClick={() => setSelectedId(exp.id)}>
              <strong>{exp.name}</strong><span>{exp.subject} · {exp.grade}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="empty">검색 결과가 없습니다.</div>}
        </div>
        <button className="ghost full" onClick={onImportPresets}>기본 실험 데이터 불러오기</button>
      </section>

      <section className="pane detail-pane">
        {selected ? (
          <>
            <div className="detail-head">
              <div><h2>{selected.name}</h2><p>{selected.subject} · {selected.grade}</p></div>
              <div className="button-row compact">
                <button className="ghost small" onClick={() => setShowChemicalForm(true)}>약품 추가</button>
                <button className="danger small" onClick={() => onDeleteExperiment(selected.id)}>삭제</button>
              </div>
            </div>
            <p className="muted">{selected.description}</p>
            <div className="table-wrap">
              <table>
                <thead><tr><th>약품명</th><th>필요량</th><th>현재재고</th><th>위치</th><th>상태</th><th>준비</th><th></th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.chemicalName}</td>
                      <td>{row.amount}{row.unit}</td>
                      <td>{row.chemical ? `${row.chemical.stock}${row.chemical.unit}` : "-"}</td>
                      <td>{row.chemical?.location || "-"}</td>
                      <td><span className={row.ok ? "status ok" : "status bad"}>{row.ok ? "가능" : "재고없음"}</span></td>
                      <td><input type="checkbox" checked={Boolean(checked[row.key])} onChange={(e) => setChecked((prev) => ({ ...prev, [row.key]: e.target.checked }))} /></td>
                      <td><button className="danger small" onClick={() => onDeleteExpChemical(row.key)}>삭제</button></td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan="7" className="empty-cell">준비할 약품이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="button-row right">
              <button className="ghost" onClick={toggleAll}>{allChecked ? "전체 해제" : "전체 체크"}</button>
              <button className="primary" disabled={preparing} onClick={async () => {
                setPreparing(true);
                try {
                  if (await onPrepared(selected, rows.filter((row) => checked[row.key]), prepareRequestId)) setPrepareRequestId(makeId("B"));
                } finally {
                  setPreparing(false);
                }
              }}>{preparing ? "기록 중..." : "준비 완료 — 입출고 기록"}</button>
            </div>
          </>
        ) : <div className="empty">실험을 선택해주세요.</div>}
      </section>

      {showExperimentForm && (
        <Modal title="실험 추가" onClose={() => setShowExperimentForm(false)}>
          <div className="form-grid">
            <label className="wide"><span>실험명</span><input value={expForm.name} onChange={(e) => setExpForm((p) => ({ ...p, name: e.target.value }))} /></label>
            <label><span>과목</span><select value={expForm.subject} onChange={(e) => setExpForm((p) => ({ ...p, subject: e.target.value }))}><option>화학</option><option>생물</option><option>물리</option></select></label>
            <label><span>학년</span><input value={expForm.grade} onChange={(e) => setExpForm((p) => ({ ...p, grade: e.target.value }))} /></label>
            <label className="wide"><span>설명</span><textarea value={expForm.description} onChange={(e) => setExpForm((p) => ({ ...p, description: e.target.value }))} /></label>
          </div>
          <div className="button-row right"><button className="primary" onClick={() => { onAddExperiment(expForm); setExpForm(emptyExperiment); setShowExperimentForm(false); }}>저장</button></div>
        </Modal>
      )}

      {showChemicalForm && selected && (
        <Modal title="실험 약품 추가" onClose={() => setShowChemicalForm(false)}>
          <div className="form-grid">
            <label className="wide"><span>약품명</span><input value={chemForm.chemicalName} onChange={(e) => setChemForm((p) => ({ ...p, chemicalName: e.target.value }))} /></label>
            <label><span>필요량</span><input type="number" value={chemForm.amount} onChange={(e) => setChemForm((p) => ({ ...p, amount: e.target.value }))} /></label>
            <label><span>단위</span><select value={chemForm.unit} onChange={(e) => setChemForm((p) => ({ ...p, unit: e.target.value }))}><option>g</option><option>mg</option><option>kg</option><option>mL</option><option>L</option><option>개</option></select></label>
            <label className="wide"><span>비고</span><input value={chemForm.note} onChange={(e) => setChemForm((p) => ({ ...p, note: e.target.value }))} /></label>
          </div>
          <div className="button-row right"><button className="primary" onClick={() => { onAddExpChemical({ ...chemForm, experimentId: selected.id }); setChemForm(emptyExpChemical); setShowChemicalForm(false); }}>저장</button></div>
        </Modal>
      )}
    </div>
  );
}

export default function App() {
  const [demoMode, setDemoMode] = useState(api.isDemoMode());
  const [showSetup, setShowSetup] = useState(api.isDemoMode() && localStorage.getItem("demoStarted") !== "1");
  const [chemicals, setChemicals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [expChemicals, setExpChemicals] = useState([]);
  const [activeTab, setActiveTab] = useState("inventory");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [selectedChemical, setSelectedChemical] = useState(null);
  const [qrChemical, setQrChemical] = useState(null);
  const [chemicalModal, setChemicalModal] = useState(null);
  const [logModal, setLogModal] = useState(false);
  const [logStartDate, setLogStartDate] = useState("");
  const [logEndDate, setLogEndDate] = useState("");
  const [toast, setToast] = useState("");

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const loadDemo = () => {
    setChemicals(SAMPLE_CHEMICALS.map(normalizeChemical));
    setLogs([]);
    setExperiments(EXPERIMENT_PRESETS.slice(0, 8).map(({ chemicals: _c, ...exp }) => exp));
    setExpChemicals(EXPERIMENT_PRESETS.slice(0, 8).flatMap((exp) => exp.chemicals.map((c) => ({ ...c, experimentId: exp.id, chemicalName: c.name, note: c.note || "" }))));
  };

  const loadData = async () => {
    if (api.isDemoMode()) {
      setDemoMode(true);
      if (chemicals.length === 0) loadDemo();
      return;
    }
    setDemoMode(false);
    const [remoteChemicals, remoteLogs, remoteExperiments, remoteExpChemicals] = await Promise.all([api.fetchChemicals(), api.fetchLogs(), api.fetchExperiments(), api.fetchExpChemicals()]);
    const experimentList = (remoteExperiments || []).map((e) => ({ id: e.id, name: e.name, description: e.description || "", subject: e.subject || "화학", grade: e.grade || "" }));
    setChemicals((remoteChemicals || []).map(normalizeChemical));
    setLogs((remoteLogs || []).map(normalizeLog).sort((a, b) => new Date(b.date) - new Date(a.date)));
    setExperiments(experimentList);
    setExpChemicals((remoteExpChemicals || []).map((item) => ({ ...item, amount: Number(item.amount || 0), note: item.note || "" })));
  };

  useEffect(() => { loadData().catch(() => notify("데이터를 불러오지 못했습니다.")); }, []);
  useEffect(() => {
    const id = window.setInterval(() => loadData().catch(() => {}), 30000);
    return () => window.clearInterval(id);
  }, [chemicals.length]);

  const categories = useMemo(() => ["전체", ...new Set(chemicals.map((c) => c.category).filter(Boolean))], [chemicals]);
  const filteredChemicals = chemicals.filter((c) => {
    const text = [c.name, c.id, c.category, c.location, c.casNo, ...toArray(c.aliases)].join(" ").toLowerCase();
    return (category === "전체" || c.category === category) && text.includes(search.toLowerCase());
  });
  const stats = {
    total: chemicals.length,
    low: chemicals.filter((c) => c.stock <= c.minStock).length,
    logsToday: logs.filter((l) => new Date(l.date).toDateString() === new Date().toDateString()).length,
  };
  const invalidLogRange = Boolean(logStartDate && logEndDate && logStartDate > logEndDate);
  const filteredLogs = invalidLogRange ? [] : logs.filter((log) => {
    const date = localDateKey(log.date);
    if (!logStartDate && !logEndDate) return true;
    return Boolean(date) && (!logStartDate || date >= logStartDate) && (!logEndDate || date <= logEndDate);
  });
  const printableLogs = filteredLogs.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const printRangeLabel = logStartDate || logEndDate
    ? `${logStartDate || "시작일 미지정"} ~ ${logEndDate || "종료일 미지정"}`
    : "전체 기간";

  const persistChemicalUpdate = async (nextChemical) => {
    const { stock: _stock, ...details } = nextChemical;
    setChemicals((prev) => prev.map((c) => c.id === nextChemical.id ? { ...c, ...details, stock: c.stock } : c));
    if (!demoMode) await api.updateChemical(nextChemical.id, details);
  };

  const saveChemical = async (chemical) => {
    if (chemicals.some((c) => c.id === chemical.id)) {
      await persistChemicalUpdate(chemical);
      notify(`${chemical.name} 수정 완료`);
    } else {
      setChemicals((prev) => [...prev, chemical]);
      if (!demoMode) await api.addChemical(chemical);
      notify(`${chemical.name} 등록 완료`);
    }
    setChemicalModal(null);
  };

  const removeChemical = async (chemical) => {
    setChemicals((prev) => prev.filter((c) => c.id !== chemical.id));
    setLogs((prev) => prev.filter((l) => l.chemicalId !== chemical.id));
    if (!demoMode) await api.deleteChemical(chemical.id);
    setSelectedChemical(null);
    notify(`${chemical.name} 삭제 완료`);
  };

  const persistTransactions = async (entries) => {
    const transactionLogs = entries.map(normalizeLog);
    if (demoMode) {
      const result = applyTransactions(chemicals, transactionLogs);
      const savedIds = new Set(result.logs.map((log) => log.id));
      setChemicals(result.chemicals);
      setLogs((prev) => [...result.logs.slice().reverse(), ...prev.filter((log) => !savedIds.has(log.id))].sort((a, b) => new Date(b.date) - new Date(a.date)));
      return;
    }

    const result = await api.recordTransactions(transactionLogs);
    if (!result) throw new Error("출납 기록을 저장하지 못했습니다.");
    const updatedById = Object.fromEntries((result.chemicals || []).map((chemical) => [chemical.id, normalizeChemical(chemical)]));
    const savedLogs = (result.logs || transactionLogs).map(normalizeLog);
    const savedIds = new Set(savedLogs.map((log) => log.id));
    setChemicals((prev) => prev.map((chemical) => updatedById[chemical.id] || chemical));
    setLogs((prev) => [...savedLogs, ...prev.filter((log) => !savedIds.has(log.id))].sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  const saveLog = async (form) => {
    const chemical = chemicals.find((c) => c.id === form.chemicalId);
    if (!chemical) throw new Error("약품을 찾을 수 없습니다.");
    const amount = convertToBase(form.amount, form.unit, chemical.unit);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("출납 수량은 0보다 커야 합니다.");
    const log = normalizeLog({ ...form, id: form.id || makeId("L"), amount, unit: chemical.unit, chemicalName: chemical.name, date: new Date().toISOString() });
    await persistTransactions([log]);
    setLogModal(false);
    notify(log.type === "in" ? "입고 기록 완료" : "출고 기록 완료");
  };

  const addExperiment = async (form) => {
    if (!form.name.trim()) return;
    const exp = { id: makeId("EXP"), ...form };
    setExperiments((prev) => [...prev, exp]);
    if (!demoMode) await api.addExperiment(exp);
    notify("실험이 추가되었습니다.");
  };

  const removeExperiment = async (id) => {
    setExperiments((prev) => prev.filter((exp) => exp.id !== id));
    setExpChemicals((prev) => prev.filter((item) => item.experimentId !== id));
    if (!demoMode) await api.deleteExperiment(id);
    notify("실험을 삭제했습니다.");
  };

  const addExperimentChemical = async (item) => {
    if (!item.chemicalName.trim()) return;
    const next = { ...item, amount: Number(item.amount || 0), note: item.note || "" };
    setExpChemicals((prev) => [...prev, next]);
    if (!demoMode) await api.addExpChemical(next);
    notify("약품을 추가했습니다.");
  };

  const removeExperimentChemical = async (id) => {
    setExpChemicals((prev) => prev.filter((item) => `${item.experimentId}||${item.chemicalName}` !== id));
    if (!demoMode) await api.deleteExpChemical(id);
    notify("실험 약품을 삭제했습니다.");
  };

  const importPresets = async () => {
    const existing = new Set(experiments.map((e) => e.id));
    const newExperiments = EXPERIMENT_PRESETS.filter((exp) => !existing.has(exp.id)).map(({ chemicals: _c, ...exp }) => exp);
    const newMaterials = EXPERIMENT_PRESETS.filter((exp) => !existing.has(exp.id)).flatMap((exp) => exp.chemicals.map((c) => ({ experimentId: exp.id, chemicalName: c.name, amount: c.amount, unit: c.unit, note: c.note || "" })));
    setExperiments((prev) => [...prev, ...newExperiments]);
    setExpChemicals((prev) => [...prev, ...newMaterials]);
    if (!demoMode) {
      if (newExperiments.length > 0) await api.batchAddRows("experiments", newExperiments);
      if (newMaterials.length > 0) await api.batchAddRows("experiment_chemicals", newMaterials);
    }
    notify(`기본 실험 ${newExperiments.length}개를 불러왔습니다.`);
  };

  const markPrepared = async (experiment, rows, requestId) => {
    if (!experiment || rows.length === 0) {
      notify("체크된 약품이 없습니다.");
      return false;
    }
    if (rows.some((row) => !row.chemical)) {
      notify("등록되지 않은 약품이 포함되어 있습니다.");
      return false;
    }
    const transactionLogs = rows.map((row, index) => normalizeLog({
      id: `${requestId}-${index + 1}`,
      chemicalId: row.chemical.id,
      chemicalName: row.chemical.name,
      type: "out",
      amount: row.needed,
      unit: row.chemical.unit,
      user: "실험 준비",
      purpose: `실험: ${experiment.name}`,
      note: row.note || "",
      date: new Date().toISOString(),
    }));
    try {
      await persistTransactions(transactionLogs);
      notify(`${experiment.name} 준비 완료 (${transactionLogs.length}건 기록됨)`);
      return true;
    } catch (err) {
      notify(err.message || "출고 기록을 저장하지 못했습니다.");
      return false;
    }
  };

  if (showSetup) {
    return <SetupScreen onConnected={() => { setShowSetup(false); loadData(); }} onDemo={() => { localStorage.setItem("demoStarted", "1"); setShowSetup(false); setDemoMode(true); loadDemo(); }} />;
  }

  return (
    <div className="app">
      <style>{styles}{printStyles}{qrStyles}</style>
      {demoMode && <div className="demo-banner">데모 모드 · Google Sheets URL을 설정하면 저장됩니다.</div>}
      <header className="app-header">
        <div><h1>시약장 관리</h1><p>{SCHOOL_NAME}</p></div>
        <div className="header-actions">
          <button className="icon-button" title="설정" onClick={() => setShowSetup(true)}>⚙</button>
          <button className="primary small" onClick={() => setChemicalModal(emptyChemical)}>약품 추가</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={activeTab === "inventory" ? "active" : ""} onClick={() => setActiveTab("inventory")}>재고현황</button>
        <button className={activeTab === "experiments" ? "active" : ""} onClick={() => setActiveTab("experiments")}>실험재료</button>
        <button className={activeTab === "logs" ? "active" : ""} onClick={() => setActiveTab("logs")}>입출고이력</button>
        <button className={activeTab === "scan" ? "active" : ""} onClick={() => setActiveTab("scan")}>QR스캔</button>
      </nav>

      <section id="print-sheet" aria-hidden="true">
        <header className="print-header">
          <h1>{SCHOOL_NAME} 입출고 이력</h1>
          <div className="print-meta">
            <span>조회 기간: {printRangeLabel}</span>
            <span>출력 일시: {new Date().toLocaleString("ko-KR")}</span>
            <span>총 {filteredLogs.length}건</span>
          </div>
        </header>
        <table className="print-log-table">
          <thead>
            <tr><th>번호</th><th>일시</th><th>유형</th><th>약품명</th><th>수량</th><th>담당자</th><th>용도·비고</th><th>관리자 서명</th></tr>
          </thead>
          <tbody>
            {printableLogs.map((log, index) => {
              const date = new Date(log.date);
              const dateText = Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
              return (
                <tr key={log.id}>
                  <td>{index + 1}</td>
                  <td>{dateText}</td>
                  <td>{log.type === "in" ? "입고" : "출고"}</td>
                  <td>{log.chemicalName || chemicals.find((chemical) => chemical.id === log.chemicalId)?.name || log.chemicalId}</td>
                  <td>{log.amount} {log.unit}</td>
                  <td>{log.user || "-"}</td>
                  <td className="print-purpose">{[log.purpose, log.note].filter(Boolean).join(" / ") || "-"}</td>
                  <td className="print-sign-cell"></td>
                </tr>
              );
            })}
            {filteredLogs.length === 0 && <tr><td colSpan="8" className="print-empty">선택한 기간에 출력할 기록이 없습니다.</td></tr>}
          </tbody>
        </table>
        <footer className="print-footer">관리자 확인 및 서명: ____________________________________　　확인일: ____________</footer>
      </section>

      {activeTab === "inventory" && (
        <main className="content">
          <section className="stats">
            <div><span>전체 약품</span><strong>{stats.total}</strong></div>
            <div><span>재고 부족</span><strong>{stats.low}</strong></div>
            <div><span>오늘 기록</span><strong>{stats.logsToday}</strong></div>
          </section>
          <div className="toolbar">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="약품명, 별칭, 위치 검색" />
            <button className="primary" onClick={() => setLogModal(true)}>입출고</button>
          </div>
          <div className="chips">{categories.map((cat) => <button key={cat} className={category === cat ? "chip active" : "chip"} onClick={() => setCategory(cat)}>{cat}</button>)}</div>
          <div className="chemical-grid">
            {filteredChemicals.map((chemical) => {
              const low = chemical.stock <= chemical.minStock;
              return (
                <article key={chemical.id} className="chemical-card" onClick={() => setSelectedChemical(chemical)}>
                  <div><h3>{chemical.name}</h3><p>{chemical.category || "미분류"} · {chemical.location || "위치 없음"}</p></div>
                  <strong className={low ? "stock low" : "stock"}>{chemical.stock}{chemical.unit}</strong>
                </article>
              );
            })}
          </div>
        </main>
      )}

      {activeTab === "experiments" && (
        <ExperimentsView
          chemicals={chemicals}
          logs={logs}
          experiments={experiments}
          expChemicals={expChemicals}
          onAddExperiment={addExperiment}
          onDeleteExperiment={removeExperiment}
          onAddExpChemical={addExperimentChemical}
          onDeleteExpChemical={removeExperimentChemical}
          onImportPresets={importPresets}
          onPrepared={markPrepared}
        />
      )}

      {activeTab === "logs" && (
        <main className="content">
          <div className="toolbar"><h2>입출고 이력 <span className="muted">({filteredLogs.length}건)</span></h2><button className="primary" onClick={() => setLogModal(true)}>기록 추가</button></div>
          <div className="log-print-toolbar">
            <label><span>시작일</span><input type="date" value={logStartDate} onChange={(e) => setLogStartDate(e.target.value)} /></label>
            <label><span>종료일</span><input type="date" value={logEndDate} onChange={(e) => setLogEndDate(e.target.value)} /></label>
            <button className="ghost" onClick={() => { setLogStartDate(""); setLogEndDate(""); }}>전체 기간</button>
            <button className="primary" disabled={!filteredLogs.length || invalidLogRange} onClick={() => window.print()}>인쇄 / 서명용 출력</button>
          </div>
          {invalidLogRange && <p className="error-text">시작일은 종료일보다 늦을 수 없습니다.</p>}
          <div className="log-list">
            {filteredLogs.map((log) => (
              <article key={log.id} className="log-row">
                <span className={log.type === "in" ? "badge in" : "badge out"}>{log.type === "in" ? "입고" : "출고"}</span>
                <div><strong>{log.chemicalName || chemicals.find((c) => c.id === log.chemicalId)?.name || log.chemicalId}</strong><p>{log.purpose || "용도 없음"} · {log.user}</p></div>
                <time>{new Date(log.date).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
                <strong>{log.amount}{log.unit}</strong>
              </article>
            ))}
            {filteredLogs.length === 0 && !invalidLogRange && <div className="empty">선택한 기간에 입출고 기록이 없습니다.</div>}
          </div>
        </main>
      )}

      {activeTab === "scan" && (
        <main className="content">
          <section className="pane center">
            <h2>QR 스캔</h2>
            <p className="muted">약품 코드가 담긴 QR을 카메라에 맞추거나 아래에 직접 입력합니다.</p>
            <QRScannerView chemicals={chemicals} notify={notify} onFound={(chemical) => { setSelectedChemical(chemical); setActiveTab("inventory"); }} />
            <input placeholder="약품 코드 입력" onKeyDown={(e) => {
              if (e.key === "Enter") {
                const found = chemicals.find((c) => c.id === e.currentTarget.value.trim());
                if (found) { setSelectedChemical(found); setActiveTab("inventory"); }
                else notify("등록되지 않은 약품입니다.");
              }
            }} />
          </section>
        </main>
      )}

      {selectedChemical && (
        <Modal title={selectedChemical.name} onClose={() => setSelectedChemical(null)}>
          <div className="chemical-detail">
            <div className="big-stock">{selectedChemical.stock}<span>{selectedChemical.unit}</span></div>
            <dl>
              <div><dt>분류</dt><dd>{selectedChemical.category || "-"}</dd></div>
              <div><dt>위치</dt><dd>{selectedChemical.location || "-"}</dd></div>
              <div><dt>최소 재고</dt><dd>{selectedChemical.minStock}{selectedChemical.unit}</dd></div>
              <div><dt>별칭</dt><dd>{toArray(selectedChemical.aliases).join(", ") || "-"}</dd></div>
              <div><dt>메모</dt><dd>{selectedChemical.memo || "-"}</dd></div>
              <div><dt>CAS No.</dt><dd>{selectedChemical.casNo || "-"}</dd></div>
            </dl>
          </div>
          <div className="button-row right">
            <button className="danger" onClick={() => removeChemical(selectedChemical)}>삭제</button>
            <button className="ghost" onClick={() => setChemicalModal(selectedChemical)}>수정</button>
            <button className="ghost" onClick={() => setQrChemical(selectedChemical)}>QR 코드</button>
            <button className="primary" onClick={() => { setLogModal({ chemicalId: selectedChemical.id, type: "out", amount: "", unit: selectedChemical.unit, user: "", purpose: "", note: "" }); }}>입출고</button>
          </div>
        </Modal>
      )}

      {qrChemical && <ChemicalQRCodeModal chemical={qrChemical} onClose={() => setQrChemical(null)} />}
      {chemicalModal && <ChemicalForm initial={chemicalModal} onSave={saveChemical} onClose={() => setChemicalModal(null)} />}
      {logModal && <LogForm chemicals={chemicals} initial={typeof logModal === "object" ? logModal : emptyLog} onSave={saveLog} onClose={() => setLogModal(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

const styles = `
*{box-sizing:border-box} body{margin:0;background:#eef2f6;color:#172033;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif} button,input,select,textarea{font:inherit} button{cursor:pointer} .app{min-height:100vh;max-width:1180px;margin:0 auto;background:#f8fafc}.demo-banner{background:#fff3c4;color:#755118;text-align:center;padding:8px;font-size:13px;font-weight:700}.app-header{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:20px 24px;background:#fff;border-bottom:1px solid #dfe6ef;position:sticky;top:0;z-index:20}.app-header h1{margin:0;font-size:24px}.app-header p{margin:3px 0 0;color:#6b7688}.header-actions,.button-row{display:flex;align-items:center;gap:8px}.right{justify-content:flex-end}.compact{gap:6px}.tabs{display:flex;gap:2px;background:#fff;border-bottom:1px solid #dfe6ef;padding:0 16px}.tabs button{border:0;background:transparent;padding:14px 18px;color:#687386;font-weight:700}.tabs button.active{color:#1769aa;border-bottom:3px solid #1769aa}.content{padding:22px 24px 90px}.two-column{display:grid;grid-template-columns:360px 1fr;gap:18px}.pane{background:#fff;border:1px solid #dfe6ef;border-radius:8px;padding:16px}.center{text-align:center;max-width:560px;margin:0 auto}.qr-reader{margin:0 auto 16px;max-width:420px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}.stats div{background:#fff;border:1px solid #dfe6ef;border-radius:8px;padding:16px}.stats span{display:block;color:#6b7688;font-size:13px}.stats strong{display:block;margin-top:8px;font-size:30px}.toolbar{display:flex;gap:10px;align-items:center;margin-bottom:12px}.toolbar input{flex:1}.toolbar h2{margin:0;flex:1}input,select,textarea{border:1px solid #cfd8e3;border-radius:8px;padding:10px 12px;background:#fff;color:#172033}textarea{min-height:76px;resize:vertical}.primary,.ghost,.danger{border:0;border-radius:8px;padding:10px 14px;font-weight:800}.primary{background:#1769aa;color:#fff}.ghost{background:#eef3f8;color:#334155}.danger{background:#fee2e2;color:#b91c1c}.small{padding:8px 10px;font-size:13px}.full{width:100%;margin-top:12px}.icon-button{width:38px;height:38px;border:0;border-radius:8px;background:#eef3f8;color:#334155;font-size:18px}.chips{display:flex;gap:8px;overflow:auto;margin:8px 0 16px}.chip{border:1px solid #cfd8e3;background:#fff;color:#5e6a7c;border-radius:999px;padding:7px 12px;font-size:13px;font-weight:700;white-space:nowrap}.chip.active{background:#e7f1fb;border-color:#1769aa;color:#1769aa}.chemical-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}.chemical-card{background:#fff;border:1px solid #dfe6ef;border-radius:8px;padding:14px;display:flex;justify-content:space-between;gap:10px;align-items:center}.chemical-card h3{margin:0;font-size:16px}.chemical-card p{margin:5px 0 0;color:#6b7688;font-size:13px}.stock{font-size:20px;color:#157347;white-space:nowrap}.stock.low{color:#c2410c}.list{display:flex;flex-direction:column;gap:8px;max-height:58vh;overflow:auto}.list-item{text-align:left;border:1px solid #dfe6ef;background:#fff;border-radius:8px;padding:12px}.list-item.selected{border-color:#1769aa;background:#f0f7ff}.list-item strong,.list-item span{display:block}.list-item span{margin-top:4px;color:#6b7688;font-size:13px}.detail-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.detail-head h2{margin:0}.detail-head p,.muted{color:#6b7688;margin:4px 0 12px}.table-wrap{overflow:auto;border:1px solid #dfe6ef;border-radius:8px}table{width:100%;border-collapse:collapse;background:#fff}th,td{padding:11px 12px;border-bottom:1px solid #edf1f5;text-align:left;font-size:14px}th{background:#f3f6fa;color:#4b5565}.status{border-radius:999px;padding:4px 8px;font-size:12px;font-weight:800}.status.ok{background:#dcfce7;color:#166534}.status.bad{background:#fee2e2;color:#991b1b}.empty,.empty-cell{text-align:center;color:#8894a6;padding:22px}.log-list{display:flex;flex-direction:column;gap:8px}.log-row{display:grid;grid-template-columns:auto 1fr auto auto;gap:12px;align-items:center;background:#fff;border:1px solid #dfe6ef;border-radius:8px;padding:12px}.log-row p{margin:4px 0 0;color:#6b7688}.log-row time{color:#6b7688;font-size:13px}.badge{border-radius:999px;padding:5px 9px;font-size:12px;font-weight:800}.badge.in{background:#dcfce7;color:#166534}.badge.out{background:#fee2e2;color:#991b1b}.setup-shell{min-height:100vh;display:grid;place-items:center;padding:24px;background:#e9eef5}.setup-panel{width:min(680px,100%);background:#fff;border:1px solid #dfe6ef;border-radius:12px;padding:28px}.brand-mark{display:inline-grid;place-items:center;background:#1769aa;color:#fff;font-weight:900;border-radius:8px;width:54px;height:42px}.setup-panel h1{margin:16px 0 6px}.steps{display:grid;gap:10px;margin:20px 0}.steps div{display:flex;gap:12px;padding:14px;background:#f6f8fb;border-radius:8px;line-height:1.7}.steps strong{display:grid;place-items:center;background:#1769aa;color:#fff;border-radius:50%;width:28px;height:28px;flex:0 0 28px;font-size:15px}.steps a{color:#1769aa}.step-hint{display:block;margin-top:6px;font-size:12px;color:#6b7688;background:#eef3f8;border-radius:6px;padding:5px 8px}.step-table{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:8px 0;background:#fff;border:1px solid #dfe6ef;border-radius:6px;padding:8px 10px;font-size:13px}.copy-btn{margin-top:8px;padding:7px 14px;border:0;border-radius:7px;background:#1769aa;color:#fff;font-weight:800;cursor:pointer;font-size:13px}.copy-btn:active{background:#125a90}.setup-footer{margin:14px 0 0;font-size:12px;color:#8894a6;text-align:center}.field{display:grid;gap:6px}.field span,label span{font-size:13px;color:#4b5565;font-weight:800}.error-text{color:#b91c1c;font-weight:700;margin:8px 0;padding:8px 10px;background:#fef2f2;border-radius:6px;font-size:13px}.modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.48);display:grid;place-items:center;padding:20px;z-index:50}.modal{width:min(720px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:10px;padding:18px}.modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.modal-head h2{margin:0;font-size:20px}.form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.form-grid label{display:grid;gap:5px}.form-grid .wide{grid-column:1/-1}.chemical-detail{display:grid;grid-template-columns:180px 1fr;gap:18px}.big-stock{display:grid;place-items:center;background:#f0f7ff;color:#1769aa;border-radius:8px;font-size:42px;font-weight:900}.big-stock span{font-size:18px;margin-left:4px}dl{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:0}dt{color:#6b7688;font-size:12px}dd{margin:3px 0 0;font-weight:700}.toast{position:fixed;left:50%;top:20px;transform:translateX(-50%);background:#172033;color:#fff;padding:12px 18px;border-radius:999px;font-weight:800;z-index:80;box-shadow:0 10px 28px rgba(0,0,0,.18)}code{background:#e8edf3;border-radius:5px;padding:2px 5px}@media(max-width:800px){.two-column{grid-template-columns:1fr}.stats{grid-template-columns:1fr}.app-header{align-items:flex-start}.tabs{overflow:auto}.chemical-detail{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}.log-row{grid-template-columns:auto 1fr}.log-row time{display:none}}`;

const printStyles = `
.log-print-toolbar{display:flex;align-items:flex-end;flex-wrap:wrap;gap:10px;margin:0 0 16px;padding:12px;background:#fff;border:1px solid #dfe6ef;border-radius:8px}
.log-print-toolbar label{display:grid;gap:5px}
.log-print-toolbar label span{font-size:13px;color:#4b5565;font-weight:800}
#print-sheet{display:none}
@media print{
  @page{size:A4 landscape;margin:10mm}
  body{background:#fff!important;color:#111!important}
  .app{max-width:none!important;min-height:0!important;background:#fff!important}
  .app>:not(style):not(#print-sheet){display:none!important}
  #print-sheet{display:block!important;color:#111;font-family:Arial,"Malgun Gothic",sans-serif}
  .print-header{margin-bottom:12px}
  .print-header h1{margin:0 0 8px;text-align:center;font-size:18pt}
  .print-meta{display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;font-size:9pt}
  .print-log-table{width:100%;border-collapse:collapse;table-layout:fixed}
  .print-log-table thead{display:table-header-group}
  .print-log-table th,.print-log-table td{border:1px solid #555;padding:5px 6px;font-size:8.5pt;vertical-align:middle;overflow-wrap:anywhere}
  .print-log-table th{background:#eee!important;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .print-log-table th:nth-child(1){width:5%}
  .print-log-table th:nth-child(2){width:15%}
  .print-log-table th:nth-child(3){width:7%}
  .print-log-table th:nth-child(4){width:16%}
  .print-log-table th:nth-child(5){width:10%}
  .print-log-table th:nth-child(6){width:10%}
  .print-log-table th:nth-child(7){width:21%}
  .print-log-table th:nth-child(8){width:16%}
  .print-log-table tbody tr{break-inside:avoid;page-break-inside:avoid}
  .print-log-table td:not(.print-purpose){text-align:center}
  .print-sign-cell{height:34px}
  .print-empty{text-align:center;height:40px}
  .print-footer{margin-top:18px;text-align:right;font-size:10pt}
}
@media(max-width:600px){.log-print-toolbar{align-items:stretch}.log-print-toolbar label{flex:1 1 130px}.log-print-toolbar button{flex:1 1 auto}}
`;

const qrStyles = `
.qr-code-content{display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 0 18px}
.qr-code-content canvas{max-width:100%;height:auto}
.qr-code-content h3{margin:16px 0 4px;font-size:18px}
.qr-code-content p{margin:3px 0;color:#4b5565}
.qr-code-content .muted{margin-top:8px;color:#6b7688;font-size:13px}
`;
