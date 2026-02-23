import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { supabase, IS_DEMO } from "./supabase";

const SCHOOL_NAME = import.meta.env.VITE_SCHOOL_NAME || "과학실험실";

// ─── GHS Hazard Data ───
const GHS_PICTOGRAMS = {
  flammable:   { icon: "🔥", label: "인화성",   color: "#E53E3E" },
  oxidizer:    { icon: "⭕", label: "산화성",   color: "#DD6B20" },
  toxic:       { icon: "☠️", label: "급성독성", color: "#1A202C" },
  corrosive:   { icon: "⚗️", label: "부식성",   color: "#805AD5" },
  irritant:    { icon: "⚠️", label: "자극성",   color: "#D69E2E" },
  health:      { icon: "🫁", label: "건강유해", color: "#3182CE" },
  environment: { icon: "🌿", label: "환경유해", color: "#38A169" },
  gas:         { icon: "🫧", label: "고압가스", color: "#4A5568" },
  explosive:   { icon: "💥", label: "폭발성",   color: "#C53030" },
};

// ─── Sample Data ───
const SAMPLE_CHEMICALS = [
  { id: "C001", name: "염산(HCl)",             category: "산",      unit: "mL", stock: 2500, minStock: 500,  location: "A-1", hazards: ["corrosive","toxic","irritant"],       msdsUrl: "https://www.kosha.or.kr/msds/MSDSInfo.do", grade: "특급",    supplier: "대정화금", lastUpdated: "2025-02-15" },
  { id: "C002", name: "수산화나트륨(NaOH)",    category: "염기",    unit: "g",  stock: 1800, minStock: 300,  location: "A-2", hazards: ["corrosive","irritant"],               msdsUrl: "https://www.kosha.or.kr/msds/MSDSInfo.do", grade: "특급",    supplier: "대정화금", lastUpdated: "2025-02-10" },
  { id: "C003", name: "에탄올(C₂H₅OH)",       category: "유기용매", unit: "mL", stock: 4000, minStock: 1000, location: "B-1", hazards: ["flammable","irritant"],               msdsUrl: "https://www.kosha.or.kr/msds/MSDSInfo.do", grade: "95%",     supplier: "삼전순약", lastUpdated: "2025-02-18" },
  { id: "C004", name: "황산(H₂SO₄)",          category: "산",      unit: "mL", stock: 1200, minStock: 300,  location: "A-1", hazards: ["corrosive","toxic","oxidizer"],        msdsUrl: "https://www.kosha.or.kr/msds/MSDSInfo.do", grade: "특급",    supplier: "대정화금", lastUpdated: "2025-01-28" },
  { id: "C005", name: "아세톤(CH₃COCH₃)",     category: "유기용매", unit: "mL", stock: 3500, minStock: 800,  location: "B-2", hazards: ["flammable","irritant"],               msdsUrl: "https://www.kosha.or.kr/msds/MSDSInfo.do", grade: "1급",     supplier: "삼전순약", lastUpdated: "2025-02-12" },
  { id: "C006", name: "질산은(AgNO₃)",         category: "금속염",  unit: "g",  stock: 45,   minStock: 20,   location: "C-1", hazards: ["corrosive","oxidizer","environment"],  msdsUrl: "https://www.kosha.or.kr/msds/MSDSInfo.do", grade: "특급",    supplier: "대정화금", lastUpdated: "2025-02-05" },
  { id: "C007", name: "페놀프탈레인",           category: "지시약",  unit: "g",  stock: 25,   minStock: 10,   location: "D-1", hazards: ["health","irritant"],                  msdsUrl: "https://www.kosha.or.kr/msds/MSDSInfo.do", grade: "지시약용", supplier: "대정화금", lastUpdated: "2025-01-20" },
  { id: "C008", name: "과산화수소(H₂O₂)",     category: "산화제",  unit: "mL", stock: 800,  minStock: 200,  location: "A-3", hazards: ["oxidizer","corrosive","irritant"],    msdsUrl: "https://www.kosha.or.kr/msds/MSDSInfo.do", grade: "30%",     supplier: "삼전순약", lastUpdated: "2025-02-01" },
  { id: "C009", name: "탄산나트륨(Na₂CO₃)",   category: "염기",    unit: "g",  stock: 2200, minStock: 400,  location: "A-2", hazards: ["irritant"],                           msdsUrl: "https://www.kosha.or.kr/msds/MSDSInfo.do", grade: "1급",     supplier: "대정화금", lastUpdated: "2025-02-14" },
  { id: "C010", name: "구리(Ⅱ)황산염(CuSO₄)", category: "금속염",  unit: "g",  stock: 350,  minStock: 100,  location: "C-2", hazards: ["irritant","environment"],             msdsUrl: "https://www.kosha.or.kr/msds/MSDSInfo.do", grade: "특급",    supplier: "삼전순약", lastUpdated: "2025-02-08" },
];
const SAMPLE_LOGS = [
  { chemicalId: "C001", type: "out", amount: 100, user: "정OO", purpose: "산염기 적정 실험 (2학년)", date: "2025-02-19T09:30:00", note: "" },
  { chemicalId: "C003", type: "out", amount: 500, user: "김OO", purpose: "연소 반응 실험 (1학년)",   date: "2025-02-19T10:15:00", note: "" },
  { chemicalId: "C002", type: "in",  amount: 500, user: "정OO", purpose: "신규 입고",               date: "2025-02-18T14:00:00", note: "대정화금 발주분" },
  { chemicalId: "C006", type: "out", amount: 5,   user: "박OO", purpose: "앙금 생성 반응 (2학년)", date: "2025-02-18T11:00:00", note: "" },
  { chemicalId: "C005", type: "out", amount: 200, user: "정OO", purpose: "기구 세척",               date: "2025-02-17T16:00:00", note: "" },
];

// ─── GHS 자동완성 프리셋 (고교 실험실 주요 약품) ───
const CHEMICAL_PRESETS = [
  // 산
  { name:"염산(HCl)",               category:"산",      unit:"mL", grade:"특급",    hazards:["corrosive","toxic","irritant"] },
  { name:"황산(H₂SO₄)",             category:"산",      unit:"mL", grade:"특급",    hazards:["corrosive","toxic","oxidizer"] },
  { name:"질산(HNO₃)",              category:"산",      unit:"mL", grade:"특급",    hazards:["corrosive","toxic","oxidizer"] },
  { name:"아세트산(CH₃COOH)",       category:"산",      unit:"mL", grade:"특급",    hazards:["flammable","corrosive","irritant"] },
  { name:"인산(H₃PO₄)",             category:"산",      unit:"mL", grade:"특급",    hazards:["corrosive","irritant"] },
  { name:"옥살산(H₂C₂O₄)",          category:"산",      unit:"g",  grade:"특급",    hazards:["toxic","irritant"] },
  { name:"붕산(H₃BO₃)",             category:"산",      unit:"g",  grade:"특급",    hazards:["health","irritant"] },
  // 염기
  { name:"수산화나트륨(NaOH)",       category:"염기",    unit:"g",  grade:"특급",    hazards:["corrosive","irritant"] },
  { name:"수산화칼륨(KOH)",          category:"염기",    unit:"g",  grade:"특급",    hazards:["corrosive","irritant"] },
  { name:"수산화칼슘(Ca(OH)₂)",      category:"염기",    unit:"g",  grade:"1급",     hazards:["irritant"] },
  { name:"암모니아수(NH₃aq)",        category:"염기",    unit:"mL", grade:"특급",    hazards:["corrosive","toxic","irritant"] },
  { name:"탄산나트륨(Na₂CO₃)",      category:"염기",    unit:"g",  grade:"1급",     hazards:["irritant"] },
  { name:"탄산수소나트륨(NaHCO₃)",  category:"염기",    unit:"g",  grade:"1급",     hazards:[] },
  // 유기용매
  { name:"에탄올(C₂H₅OH)",          category:"유기용매", unit:"mL", grade:"95%",    hazards:["flammable","irritant"] },
  { name:"아세톤(CH₃COCH₃)",        category:"유기용매", unit:"mL", grade:"1급",     hazards:["flammable","irritant"] },
  { name:"메탄올(CH₃OH)",           category:"유기용매", unit:"mL", grade:"특급",    hazards:["flammable","toxic"] },
  { name:"에테르(C₂H₅OC₂H₅)",      category:"유기용매", unit:"mL", grade:"특급",    hazards:["flammable","irritant"] },
  { name:"톨루엔(C₇H₈)",            category:"유기용매", unit:"mL", grade:"특급",    hazards:["flammable","toxic","health"] },
  { name:"헥산(C₆H₁₄)",             category:"유기용매", unit:"mL", grade:"특급",    hazards:["flammable","toxic","environment"] },
  { name:"아세트산에틸(CH₃COOC₂H₅)",category:"유기용매", unit:"mL", grade:"1급",     hazards:["flammable","irritant"] },
  { name:"클로로포름(CHCl₃)",        category:"유기용매", unit:"mL", grade:"특급",    hazards:["health","toxic"] },
  // 산화제
  { name:"과산화수소(H₂O₂)",         category:"산화제",  unit:"mL", grade:"30%",     hazards:["oxidizer","corrosive","irritant"] },
  { name:"과망간산칼륨(KMnO₄)",      category:"산화제",  unit:"g",  grade:"특급",    hazards:["oxidizer","toxic","environment","irritant"] },
  { name:"염소산칼륨(KClO₃)",        category:"산화제",  unit:"g",  grade:"1급",     hazards:["oxidizer","toxic"] },
  { name:"중크롬산칼륨(K₂Cr₂O₇)",   category:"산화제",  unit:"g",  grade:"특급",    hazards:["oxidizer","toxic","corrosive","health","environment"] },
  // 금속염
  { name:"질산은(AgNO₃)",            category:"금속염",  unit:"g",  grade:"특급",    hazards:["corrosive","oxidizer","environment"] },
  { name:"황산구리(CuSO₄)",          category:"금속염",  unit:"g",  grade:"특급",    hazards:["irritant","environment"] },
  { name:"황산철(Ⅱ)(FeSO₄)",        category:"금속염",  unit:"g",  grade:"1급",     hazards:["irritant"] },
  { name:"염화철(Ⅲ)(FeCl₃)",        category:"금속염",  unit:"g",  grade:"1급",     hazards:["corrosive","irritant"] },
  { name:"질산납(Pb(NO₃)₂)",         category:"금속염",  unit:"g",  grade:"1급",     hazards:["toxic","oxidizer","environment"] },
  { name:"질산바륨(Ba(NO₃)₂)",       category:"금속염",  unit:"g",  grade:"1급",     hazards:["oxidizer","toxic"] },
  { name:"염화나트륨(NaCl)",          category:"금속염",  unit:"g",  grade:"1급",     hazards:[] },
  { name:"염화칼슘(CaCl₂)",          category:"금속염",  unit:"g",  grade:"1급",     hazards:["irritant"] },
  { name:"황산나트륨(Na₂SO₄)",       category:"금속염",  unit:"g",  grade:"1급",     hazards:[] },
  { name:"탄산칼슘(CaCO₃)",          category:"금속염",  unit:"g",  grade:"1급",     hazards:[] },
  { name:"아이오딘화칼륨(KI)",        category:"금속염",  unit:"g",  grade:"특급",    hazards:["irritant"] },
  { name:"염화칼륨(KCl)",             category:"금속염",  unit:"g",  grade:"1급",     hazards:[] },
  { name:"질산칼륨(KNO₃)",           category:"금속염",  unit:"g",  grade:"1급",     hazards:["oxidizer","irritant"] },
  // 지시약
  { name:"페놀프탈레인",               category:"지시약",  unit:"g",  grade:"지시약용", hazards:["health","irritant"] },
  { name:"메틸오렌지",                 category:"지시약",  unit:"g",  grade:"지시약용", hazards:["health"] },
  { name:"브로모티몰블루(BTB)",        category:"지시약",  unit:"g",  grade:"지시약용", hazards:["irritant"] },
  { name:"리트머스",                   category:"지시약",  unit:"g",  grade:"지시약용", hazards:[] },
  // 기타
  { name:"아이오딘(I₂)",              category:"기타",    unit:"g",  grade:"특급",    hazards:["toxic","irritant","environment"] },
  { name:"포름알데히드(HCHO)",         category:"기타",    unit:"mL", grade:"37%",     hazards:["flammable","toxic","corrosive","health"] },
  { name:"페놀(C₆H₅OH)",             category:"기타",    unit:"g",  grade:"특급",    hazards:["toxic","corrosive","health"] },
  { name:"글리세롤(C₃H₈O₃)",         category:"기타",    unit:"mL", grade:"특급",    hazards:["irritant"] },
  { name:"포도당(C₆H₁₂O₆)",          category:"기타",    unit:"g",  grade:"시약용",  hazards:[] },
  { name:"녹말(전분)",                 category:"기타",    unit:"g",  grade:"시약용",  hazards:[] },
  { name:"구연산(C₆H₈O₇)",           category:"기타",    unit:"g",  grade:"시약용",  hazards:["irritant"] },
  { name:"마그네슘(Mg)",              category:"기타",    unit:"g",  grade:"1급",     hazards:["flammable","irritant"] },
  { name:"아연(Zn)",                  category:"기타",    unit:"g",  grade:"1급",     hazards:["flammable","environment","irritant"] },
  { name:"구리(Cu)",                  category:"기타",    unit:"g",  grade:"1급",     hazards:["environment","irritant"] },
  { name:"철(Fe)",                    category:"기타",    unit:"g",  grade:"1급",     hazards:["flammable"] },
];

// ─── Utility Functions ───
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};
const getStockStatus = (stock, minStock) => {
  const r = stock / minStock;
  if (r <= 1) return { label: "부족", color: "#E53E3E", bg: "#FED7D7" };
  if (r <= 2) return { label: "주의", color: "#DD6B20", bg: "#FEEBC8" };
  return { label: "충분", color: "#38A169", bg: "#C6F6D5" };
};

// 단위 선택 옵션: {label, factor} — factor는 base 단위로 변환 시 곱하는 값
const getUnitOptions = (baseUnit) => {
  if (baseUnit === "mL") return [{ label: "mL", factor: 1 }, { label: "L", factor: 1000 }];
  if (baseUnit === "g")  return [{ label: "g", factor: 1 }, { label: "mg", factor: 0.001 }, { label: "kg", factor: 1000 }];
  return [{ label: baseUnit || "단위", factor: 1 }];
};

// ─── Data Mappers: DB(snake_case) ↔ App(camelCase) ───
const chemToApp = (r) => ({
  id: r.id, name: r.name, category: r.category,
  unit: r.unit, stock: Number(r.stock), minStock: Number(r.min_stock),
  location: r.location, hazards: r.hazards || [], msdsUrl: r.msds_url,
  grade: r.grade, supplier: r.supplier, lastUpdated: r.last_updated,
});
const chemToDb = (c) => ({
  id: c.id, name: c.name, category: c.category,
  unit: c.unit, stock: c.stock, min_stock: c.minStock,
  location: c.location, hazards: c.hazards, msds_url: c.msdsUrl,
  grade: c.grade, supplier: c.supplier, last_updated: c.lastUpdated,
});
const logToApp = (r) => ({
  id: r.id, chemicalId: r.chemical_id, type: r.type,
  amount: Number(r.amount), user: r.user_name,
  purpose: r.purpose || "", note: r.note || "", date: r.date,
});

// ─── CSV / 엑셀 유틸리티 ───
const csvCell = (val) => {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
};

const exportToCSV = (chemicals) => {
  const header = ["코드", "약품명", "분류", "단위", "현재재고", "보관위치", "등급", "공급처", "위험성", "최종수정"];
  const rows = chemicals.map((c) => [
    c.id, c.name, c.category, c.unit,
    c.stock, c.location, c.grade, c.supplier,
    c.hazards.map((h) => GHS_PICTOGRAMS[h]?.label || h).join(", "),
    c.lastUpdated,
  ]);
  const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `약품재고_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
};

const parseCSVLine = (line) => {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { fields.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  fields.push(current.trim());
  return fields;
};

const parseCSV = (text) => {
  const clean = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => parseCSVLine(line));
};

const downloadCSVTemplate = () => {
  // 열 순서: 약품명,분류,단위,현재재고,보관위치,등급,공급처,위험성코드
  const header = "약품명,분류,단위,현재재고,보관위치,등급,공급처,위험성코드";
  const rows = [
    `염산(HCl),산,mL,2500,A-1,특급,대정화금,"corrosive,toxic,irritant"`,
    `수산화나트륨(NaOH),염기,g,1800,A-2,특급,대정화금,"corrosive,irritant"`,
  ];
  const csv = "\uFEFF" + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "약품목록_가져오기_템플릿.csv";
  link.click();
};

// ─── Loading Screen ───
function LoadingScreen() {
  return (
    <div style={{ maxWidth:500, margin:"0 auto", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#F7FAFC", fontFamily:"'Pretendard',sans-serif" }}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');`}</style>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"48px", marginBottom:16 }}>🧪</div>
        <div style={{ fontSize:"14px", color:"#718096" }}>로딩 중...</div>
      </div>
    </div>
  );
}

// ─── Login Screen (이메일/비밀번호) ───
function LoginScreen({ schoolName }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regSchoolName, setRegSchoolName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: true });

  const handleSubmit = async () => {
    if (mode === "reset") {
      if (!email.trim()) { setMsg({ text: "이메일을 입력해주세요.", ok: false }); return; }
      setLoading(true); setMsg({ text: "", ok: true });
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      setLoading(false);
      if (error) setMsg({ text: "오류가 발생했습니다. 이메일을 확인해주세요.", ok: false });
      else setMsg({ text: "비밀번호 재설정 링크를 이메일로 발송했습니다.", ok: true });
      return;
    }
    if (!email.trim() || !password.trim()) {
      setMsg({ text: "이메일과 비밀번호를 입력해주세요.", ok: false }); return;
    }
    setLoading(true); setMsg({ text: "", ok: true });
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ text: "이메일 또는 비밀번호가 올바르지 않습니다.", ok: false });
    } else {
      if (!regSchoolName.trim()) { setMsg({ text: "학교명을 입력해주세요.", ok: false }); setLoading(false); return; }
      if (password.length < 6) { setMsg({ text: "비밀번호는 6자 이상이어야 합니다.", ok: false }); setLoading(false); return; }
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { school_name: regSchoolName.trim() } },
      });
      if (error) setMsg({ text: "가입 실패: " + error.message, ok: false });
      else setMsg({ text: "확인 이메일을 발송했습니다. 받은 편함을 확인해주세요.", ok: true });
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:500, margin:"0 auto", background:"#F7FAFC", minHeight:"100vh", fontFamily:"'Pretendard',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');`}</style>
      <div style={{ fontSize:"64px", marginBottom:16 }}>🧪</div>
      <h1 style={{ fontSize:"24px", fontWeight:800, color:"#1A202C", margin:"0 0 6px", textAlign:"center" }}>약품 재고관리</h1>
      <p style={{ fontSize:"13px", color:"#718096", margin:"0 0 32px", textAlign:"center" }}>{schoolName}</p>

      {mode !== "reset" && (
        <div style={{ display:"flex", background:"#EDF2F7", borderRadius:12, padding:4, marginBottom:24, width:"100%" }}>
          {[["signin","로그인"],["signup","회원가입"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setMsg({ text:"", ok:true }); }}
              style={{ flex:1, padding:"9px", borderRadius:9, border:"none", fontSize:"14px", fontWeight:700, cursor:"pointer",
                background: mode===m?"#fff":"transparent", color: mode===m?"#1A202C":"#718096",
                boxShadow: mode===m?"0 1px 4px rgba(0,0,0,0.1)":"none", transition:"all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === "reset" && (
        <div style={{ width:"100%", marginBottom:20, padding:"12px 14px", borderRadius:12, background:"#EBF8FF", border:"1px solid #BEE3F8", fontSize:"13px", color:"#2B6CB0", lineHeight:1.6 }}>
          가입 시 사용한 이메일을 입력하면<br />비밀번호 재설정 링크를 보내드립니다.
        </div>
      )}

      <div style={{ width:"100%", marginBottom:12 }}>
        <label style={labelStyle}>이메일</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key==="Enter" && handleSubmit()}
          placeholder="example@school.kr" style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} />
      </div>

      {mode === "signup" && (
        <div style={{ width:"100%", marginBottom:12 }}>
          <label style={labelStyle}>학교명 *</label>
          <input type="text" value={regSchoolName} onChange={(e) => setRegSchoolName(e.target.value)}
            placeholder="예: 오산고등학교(서울)" style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} />
          <div style={{ fontSize:"11px", color:"#A0AEC0", marginTop:4 }}>
            같은 이름의 학교 구분을 위해 <span style={{ color:"#4A5568", fontWeight:600 }}>학교명(지역)</span> 형식으로 입력해주세요.<br />
            같은 학교명으로 가입한 계정끼리 데이터가 공유됩니다.
          </div>
        </div>
      )}

      {mode !== "reset" && (
        <div style={{ width:"100%", marginBottom:mode==="signin"?8:20 }}>
          <label style={labelStyle}>비밀번호</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key==="Enter" && handleSubmit()}
            placeholder={mode==="signup" ? "6자 이상" : "비밀번호 입력"} style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} />
        </div>
      )}

      {mode === "signin" && (
        <div style={{ width:"100%", marginBottom:20, textAlign:"right" }}>
          <button onClick={() => { setMode("reset"); setMsg({ text:"", ok:true }); }}
            style={{ background:"none", border:"none", fontSize:"12px", color:"#3182CE", cursor:"pointer", padding:0, fontWeight:500 }}>
            비밀번호를 잊으셨나요?
          </button>
        </div>
      )}

      {msg.text && (
        <div style={{ width:"100%", marginBottom:16, padding:"10px 14px", borderRadius:10, fontSize:"13px", fontWeight:500, lineHeight:1.5,
          background: msg.ok?"#F0FFF4":"#FFF5F5", color: msg.ok?"#276749":"#C53030", border:`1px solid ${msg.ok?"#C6F6D5":"#FED7D7"}` }}>
          {msg.text}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading}
        style={{ width:"100%", padding:"14px", background:"#3182CE", color:"#fff", border:"none", borderRadius:14, fontSize:"15px", fontWeight:700, cursor:"pointer", opacity:loading?0.7:1 }}>
        {loading ? "처리 중..." : mode==="signin" ? "로그인" : mode==="signup" ? "회원가입" : "재설정 링크 발송"}
      </button>

      {mode === "reset" && (
        <button onClick={() => { setMode("signin"); setMsg({ text:"", ok:true }); }}
          style={{ background:"none", border:"none", fontSize:"13px", color:"#718096", cursor:"pointer", marginTop:16, padding:0 }}>
          ← 로그인으로 돌아가기
        </button>
      )}

      <p style={{ fontSize:"11px", color:"#A0AEC0", marginTop:24, textAlign:"center", lineHeight:1.7 }}>
        학교 계정으로 로그인하면<br />모든 교사가 실시간으로 재고를 공유합니다.
      </p>
      <p style={{ fontSize:"11px", color:"#A0AEC0", marginTop:8, textAlign:"center" }}>
        문의: <a href="mailto:osanchem@osan.hs.kr" style={{ color:"#3182CE", textDecoration:"none" }}>osanchem@osan.hs.kr</a>
      </p>
    </div>
  );
}

// ─── Setup Wizard (초기 DB 구축) ───
function SetupWizard({ onComplete, showToast, schoolId }) {
  const [step, setStep] = useState("choose");
  const [csvChemicals, setCsvChemicals] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSampleData = async () => {
    setLoading(true);
    try {
      await supabase.from("chemicals").insert(SAMPLE_CHEMICALS.map((c) => ({ ...chemToDb(c), school_id: schoolId })));
      await supabase.from("logs").insert(
        SAMPLE_LOGS.map((l) => ({ chemical_id:l.chemicalId, type:l.type, amount:l.amount, user_name:l.user, purpose:l.purpose, note:l.note, date:l.date, school_id: schoolId }))
      );
      showToast("샘플 데이터가 등록되었습니다.");
      onComplete();
    } catch { showToast("오류가 발생했습니다.", "error"); }
    finally { setLoading(false); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result);
      if (rows.length === 0) { showToast("CSV 파일이 비어 있습니다.", "error"); return; }
      // 열 순서: 약품명,분류,단위,현재재고,보관위치,등급,공급처,위험성코드
      const chemicals = rows
        .map((row, i) => ({
          id: `C${String(i + 1).padStart(3, "0")}`,
          name: row[0] || "", category: row[1] || "",
          unit: row[2] || "mL", stock: Number(row[3]) || 0,
          minStock: 0, location: row[4] || "",
          grade: row[5] || "", supplier: row[6] || "",
          hazards: row[7] ? row[7].split(",").map((h) => h.trim()).filter((h) => GHS_PICTOGRAMS[h]) : [],
          msdsUrl: "https://www.kosha.or.kr/msds/MSDSInfo.do",
          lastUpdated: new Date().toISOString().slice(0, 10),
        }))
        .filter((c) => c.name);
      if (chemicals.length === 0) { showToast("유효한 약품 데이터가 없습니다.", "error"); return; }
      setCsvChemicals(chemicals);
      setStep("csv-preview");
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleCSVImport = async () => {
    setLoading(true);
    try {
      await supabase.from("chemicals").insert(csvChemicals.map((c) => ({ ...chemToDb(c), school_id: schoolId })));
      showToast(`${csvChemicals.length}개 약품이 등록되었습니다.`);
      onComplete();
    } catch { showToast("가져오기에 실패했습니다.", "error"); }
    finally { setLoading(false); }
  };

  if (step === "csv-preview") {
    return (
      <div style={{ position:"fixed", inset:0, background:"#F7FAFC", zIndex:500, overflowY:"auto", fontFamily:"'Pretendard',sans-serif", padding:"20px 16px 40px" }}>
        <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');`}</style>
        <button onClick={() => setStep("choose")} style={{ background:"none", border:"none", color:"#3182CE", fontSize:"14px", cursor:"pointer", padding:"0 0 16px" }}>← 뒤로</button>
        <h2 style={{ fontSize:"18px", fontWeight:800, margin:"0 0 4px", color:"#1A202C" }}>CSV 미리보기</h2>
        <p style={{ fontSize:"13px", color:"#718096", margin:"0 0 16px" }}>{csvChemicals.length}개 약품이 인식되었습니다.</p>
        <div style={{ overflowX:"auto", marginBottom:20, borderRadius:12, border:"1px solid #E2E8F0" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
            <thead>
              <tr style={{ background:"#EDF2F7" }}>
                {["코드","약품명","분류","단위","재고","위치"].map((h) => (
                  <th key={h} style={{ padding:"10px 8px", textAlign:"left", fontWeight:600, color:"#4A5568", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvChemicals.slice(0, 20).map((c) => (
                <tr key={c.id} style={{ borderTop:"1px solid #E2E8F0" }}>
                  <td style={{ padding:"8px", fontFamily:"monospace", color:"#3182CE", fontSize:"11px" }}>{c.id}</td>
                  <td style={{ padding:"8px", fontWeight:600 }}>{c.name}</td>
                  <td style={{ padding:"8px", color:"#718096" }}>{c.category}</td>
                  <td style={{ padding:"8px", color:"#718096" }}>{c.unit}</td>
                  <td style={{ padding:"8px", fontFamily:"monospace" }}>{c.stock}</td>
                  <td style={{ padding:"8px", color:"#718096" }}>{c.location}</td>
                </tr>
              ))}
              {csvChemicals.length > 20 && (
                <tr><td colSpan={6} style={{ padding:"10px", textAlign:"center", color:"#A0AEC0", fontSize:"11px" }}>... 외 {csvChemicals.length - 20}개</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button onClick={handleCSVImport} disabled={loading}
          style={{ width:"100%", padding:"14px", background:"#3182CE", color:"#fff", border:"none", borderRadius:14, fontSize:"15px", fontWeight:700, cursor:"pointer", opacity:loading?0.6:1 }}>
          {loading ? "등록 중..." : `${csvChemicals.length}개 약품 등록하기`}
        </button>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"#F7FAFC", zIndex:500, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 24px", fontFamily:"'Pretendard',sans-serif" }}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');`}</style>
      <div style={{ fontSize:"52px", marginBottom:16 }}>🗄️</div>
      <h2 style={{ fontSize:"22px", fontWeight:800, color:"#1A202C", margin:"0 0 8px", textAlign:"center" }}>약품 목록 초기 설정</h2>
      <p style={{ fontSize:"13px", color:"#718096", margin:"0 0 32px", textAlign:"center", lineHeight:1.7 }}>
        데이터베이스가 비어 있습니다.<br />약품 목록을 어떻게 시작할까요?
      </p>
      <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:12 }}>
        <button onClick={handleSampleData} disabled={loading} style={{ ...setupOptionStyle, borderColor:"#3182CE" }}>
          <div style={{ fontSize:"28px", marginBottom:6 }}>🧪</div>
          <div style={{ fontWeight:700, fontSize:"15px", color:"#1A202C", marginBottom:4 }}>샘플 데이터로 시작</div>
          <div style={{ fontSize:"12px", color:"#718096", lineHeight:1.5 }}>고등학교 실험실용 10가지 약품이<br />미리 등록됩니다.</div>
        </button>
        <label style={{ ...setupOptionStyle, borderColor:"#38A169", cursor:"pointer" }}>
          <div style={{ fontSize:"28px", marginBottom:6 }}>📂</div>
          <div style={{ fontWeight:700, fontSize:"15px", color:"#1A202C", marginBottom:4 }}>CSV 파일 가져오기</div>
          <div style={{ fontSize:"12px", color:"#718096", lineHeight:1.5 }}>기존 엑셀/CSV 약품 목록을<br />불러옵니다.</div>
          <input type="file" accept=".csv" onChange={handleFileSelect} style={{ display:"none" }} />
        </label>
        <button onClick={onComplete} style={{ ...setupOptionStyle, borderColor:"#A0AEC0" }}>
          <div style={{ fontSize:"28px", marginBottom:6 }}>📋</div>
          <div style={{ fontWeight:700, fontSize:"15px", color:"#1A202C", marginBottom:4 }}>빈 목록으로 시작</div>
          <div style={{ fontSize:"12px", color:"#718096", lineHeight:1.5 }}>약품을 직접 하나씩 등록합니다.</div>
        </button>
      </div>
      <button onClick={downloadCSVTemplate}
        style={{ marginTop:20, background:"none", border:"none", color:"#3182CE", fontSize:"12px", cursor:"pointer", textDecoration:"underline" }}>
        CSV 템플릿 다운로드
      </button>
    </div>
  );
}

// ─── QR Scanner ───
function QRScanner({ chemicals, onScan, onClose }) {
  const [cameraError, setCameraError] = useState(false);
  const scanned = useRef(false);
  const qrRef = useRef(null);

  useEffect(() => {
    const qr = new Html5Qrcode("qr-reader-div", { verbose: false });
    qrRef.current = qr;
    qr.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 230, height: 230 } },
      (text) => { if (scanned.current) return; scanned.current = true; onScan(text); },
      () => {}
    ).catch(() => setCameraError(true));
    return () => { qr.stop().catch(() => {}); };
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, background:"#111", zIndex:1000, display:"flex", flexDirection:"column", fontFamily:"'Pretendard',sans-serif" }}>
      <style>{`
        #qr-reader-div video { width:100% !important; height:100% !important; object-fit:cover !important; }
        #qr-reader-div img   { display:none !important; }
        @keyframes scanAnim  { 0%,100% { top:8%; } 50% { top:84%; } }
      `}</style>
      <div style={{ padding:"16px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(0,0,0,0.5)", position:"relative", zIndex:10 }}>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#fff", fontSize:"16px", cursor:"pointer" }}>✕ 닫기</button>
        <span style={{ color:"#fff", fontWeight:700, fontSize:"15px" }}>QR / 바코드 스캔</span>
        <div style={{ width:60 }} />
      </div>
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <div id="qr-reader-div" style={{ position:"absolute", inset:0, display: cameraError ? "none" : "block" }} />
        {cameraError ? (
          <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#fff", padding:24 }}>
            <div style={{ fontSize:"48px", marginBottom:16 }}>📵</div>
            <div style={{ fontSize:"15px", fontWeight:700, marginBottom:8 }}>카메라 접근이 거부되었습니다</div>
            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.6)", marginBottom:32, textAlign:"center" }}>
              브라우저 주소창 옆 🔒 아이콘을 눌러<br />카메라 권한을 허용해주세요
            </div>
            <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.4)", marginBottom:12 }}>── 데모 스캔 ──</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, width:"100%", maxWidth:280 }}>
              {chemicals.slice(0, 4).map((c) => (
                <button key={c.id} onClick={() => onScan(c.id)}
                  style={{ padding:"10px 8px", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:10, color:"#fff", fontSize:"12px", cursor:"pointer" }}>
                  {c.name.split("(")[0]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
            <div style={{ width:240, height:240, position:"relative", boxShadow:"0 0 0 9999px rgba(0,0,0,0.55)", borderRadius:4 }}>
              {[
                { top:-2,    left:-2,  borderTop:"4px solid #48BB78", borderLeft:"4px solid #48BB78",  borderRadius:"12px 0 0 0" },
                { top:-2,    right:-2, borderTop:"4px solid #48BB78", borderRight:"4px solid #48BB78", borderRadius:"0 12px 0 0" },
                { bottom:-2, left:-2,  borderBottom:"4px solid #48BB78", borderLeft:"4px solid #48BB78",  borderRadius:"0 0 0 12px" },
                { bottom:-2, right:-2, borderBottom:"4px solid #48BB78", borderRight:"4px solid #48BB78", borderRadius:"0 0 12px 0" },
              ].map((s, i) => <div key={i} style={{ position:"absolute", width:32, height:32, ...s }} />)}
              <div style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(to right, transparent, #48BB78, transparent)", animation:"scanAnim 2s ease-in-out infinite", boxShadow:"0 0 6px #48BB78" }} />
            </div>
            <p style={{ color:"rgba(255,255,255,0.85)", fontSize:"13px", marginTop:28 }}>QR코드를 화면 중앙에 맞춰주세요</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── QR 코드 생성 모달 ───
function QRCodeModal({ chem, onClose }) {
  const handleDownload = () => {
    const svgEl = document.getElementById("chem-qr-svg");
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    canvas.width = 300; canvas.height = 340;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 300, 340);
      ctx.drawImage(img, 25, 20, 250, 250);
      ctx.fillStyle = "#1A202C"; ctx.font = "bold 15px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(chem.name, 150, 295);
      ctx.fillStyle = "#3182CE"; ctx.font = "bold 14px monospace";
      ctx.fillText(chem.id, 150, 318);
      ctx.fillStyle = "#718096"; ctx.font = "12px sans-serif";
      ctx.fillText(`위치: ${chem.location}`, 150, 336);
      const link = document.createElement("a");
      link.download = `QR_${chem.id}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 20px" }}>
      <div style={{ background:"#fff", borderRadius:20, padding:24, width:"100%", maxWidth:320, textAlign:"center" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <span style={{ fontWeight:700, fontSize:"16px" }}>📱 QR 코드</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#718096" }}>✕</button>
        </div>
        <div style={{ display:"inline-block", padding:16, borderRadius:12, border:"2px solid #E2E8F0", marginBottom:16 }}>
          <QRCodeSVG id="chem-qr-svg" value={chem.id} size={190} level="M" includeMargin={false} />
        </div>
        <div style={{ fontSize:"16px", fontWeight:700, color:"#1A202C", marginBottom:4 }}>{chem.name}</div>
        <div style={{ fontSize:"14px", fontFamily:"monospace", color:"#3182CE", fontWeight:700, marginBottom:4 }}>{chem.id}</div>
        <div style={{ fontSize:"12px", color:"#718096", marginBottom:20 }}>위치: {chem.location}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <button onClick={handleDownload} style={{ ...btnStyle, background:"#3182CE", color:"#fff" }}>⬇️ PNG 저장</button>
          <button onClick={onClose} style={{ ...btnStyle, background:"#EDF2F7", color:"#4A5568" }}>닫기</button>
        </div>
        <p style={{ fontSize:"11px", color:"#A0AEC0", marginTop:14, lineHeight:1.6 }}>
          이 QR코드를 인쇄해서 약품 용기에<br />부착하면 스캔으로 바로 조회됩니다.
        </p>
      </div>
    </div>
  );
}

// ─── 새 약품 등록 모달 ───
function AddChemicalModal({ chemicals, onClose, onAdd, onSelectExisting, showToast }) {
  const nextId = () => {
    const nums = chemicals.map((c) => parseInt(c.id.replace("C", ""))).filter((n) => !isNaN(n));
    return `C${String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`;
  };
  const [form, setForm] = useState({
    name:"", category:"", unit:"mL",
    stock:"", minStock:"", location:"",
    grade:"", supplier:"", hazards:[],
    msdsUrl:"https://www.kosha.or.kr/msds/MSDSInfo.do",
  });
  // suggestions: { existing: [...], presets: [...] }
  const [suggestions, setSuggestions] = useState({ existing: [], presets: [] });
  const [autoFilled, setAutoFilled] = useState(false);
  const [dupWarning, setDupWarning] = useState(null); // 정확히 일치하는 기존 약품

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleHazard = (h) => setForm((f) => ({ ...f, hazards: f.hazards.includes(h) ? f.hazards.filter((x) => x !== h) : [...f.hazards, h] }));
  const hasAnySuggestion = suggestions.existing.length > 0 || suggestions.presets.length > 0;

  const handleNameChange = (val) => {
    set("name", val);
    setAutoFilled(false);
    setDupWarning(null);
    if (val.trim().length >= 1) {
      const q = val.toLowerCase();
      // 기등록 약품 중 일치하는 것
      const existing = chemicals
        .filter((c) => c.name.toLowerCase().includes(q))
        .slice(0, 3);
      // 프리셋 중 일치하는 것 (기등록과 이름이 완전히 같은 것은 제외)
      const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));
      const presets = CHEMICAL_PRESETS
        .filter((p) => p.name.toLowerCase().includes(q) && !existingNames.has(p.name.toLowerCase()))
        .slice(0, 5);
      setSuggestions({ existing, presets });
    } else {
      setSuggestions({ existing: [], presets: [] });
    }
  };

  const applyPreset = (preset) => {
    setForm((f) => ({
      ...f,
      name: preset.name, category: preset.category,
      unit: preset.unit, grade: preset.grade, hazards: preset.hazards,
    }));
    setSuggestions({ existing: [], presets: [] });
    setAutoFilled(true);
    setDupWarning(null);
  };

  const closeSuggestions = () => {
    setTimeout(() => setSuggestions({ existing: [], presets: [] }), 150);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.category.trim() || !form.unit.trim()) {
      showToast("약품명, 분류, 단위는 필수입니다.", "error"); return;
    }
    // 정확히 같은 이름의 약품이 이미 있으면 경고
    const exact = chemicals.find((c) => c.name.toLowerCase() === form.name.trim().toLowerCase());
    if (exact) {
      setDupWarning(exact);
      return;
    }
    onAdd({ ...form, id: nextId(), stock: Number(form.stock)||0, minStock: Number(form.minStock)||0, lastUpdated: new Date().toISOString().slice(0,10) });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:500, padding:"20px", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:"16px", fontWeight:700 }}>➕ 새 약품 등록</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#718096" }}>✕</button>
        </div>
        <div style={{ background:"#EBF8FF", borderRadius:10, padding:"8px 12px", marginBottom:14, fontSize:"12px", color:"#2B6CB0" }}>
          자동 배정 코드: <strong>{nextId()}</strong>
        </div>

        {/* 중복 경고 배너 */}
        {dupWarning && (
          <div style={{ background:"#FFFBEB", border:"1.5px solid #F6AD55", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
            <div style={{ fontSize:"13px", fontWeight:700, color:"#744210", marginBottom:8 }}>
              ⚠️ 이미 등록된 약품입니다
            </div>
            <div style={{ fontSize:"12px", color:"#744210", marginBottom:10 }}>
              <strong>{dupWarning.name}</strong> — 현재 재고 {dupWarning.stock}{dupWarning.unit} · 위치 {dupWarning.location || "미지정"}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <button onMouseDown={() => onSelectExisting(dupWarning, "in")}
                style={{ padding:"8px", background:"#38A169", color:"#fff", border:"none", borderRadius:9, fontSize:"12px", fontWeight:700, cursor:"pointer" }}>
                📥 입고 처리하기
              </button>
              <button onMouseDown={() => onSelectExisting(dupWarning, "out")}
                style={{ padding:"8px", background:"#E53E3E", color:"#fff", border:"none", borderRadius:9, fontSize:"12px", fontWeight:700, cursor:"pointer" }}>
                📤 출고 처리하기
              </button>
            </div>
            <button onClick={() => setDupWarning(null)}
              style={{ width:"100%", marginTop:8, padding:"6px", background:"none", border:"1px solid #F6AD55", borderRadius:9, fontSize:"12px", color:"#744210", cursor:"pointer" }}>
              무시하고 새 항목으로 등록
            </button>
          </div>
        )}

        {/* 약품명 + 자동완성 드롭다운 */}
        <div style={{ marginBottom:10, position:"relative" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <label style={labelStyle}>약품명 *</label>
            {autoFilled && (
              <span style={{ fontSize:"11px", fontWeight:600, color:"#38A169", background:"#F0FFF4", padding:"2px 8px", borderRadius:10 }}>
                ✓ GHS 자동입력됨
              </span>
            )}
          </div>
          <input
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            onBlur={closeSuggestions}
            placeholder="약품명 입력 시 자동완성..."
            style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }}
          />
          {hasAnySuggestion && (
            <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1.5px solid #CBD5E0", borderRadius:10, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", zIndex:10, overflow:"hidden" }}>

              {/* 기등록 약품 섹션 */}
              {suggestions.existing.length > 0 && (
                <>
                  <div style={{ padding:"6px 12px", fontSize:"11px", fontWeight:700, color:"#744210", background:"#FFFBEB", borderBottom:"1px solid #F6E05E" }}>
                    ⚠️ 이미 등록된 약품
                  </div>
                  {suggestions.existing.map((c) => (
                    <div key={c.id} style={{ padding:"9px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #EDF2F7", background:"#FFFFF0" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:"13px", fontWeight:600, color:"#1A202C" }}>{c.name}</div>
                        <div style={{ fontSize:"11px", color:"#718096" }}>재고 {c.stock}{c.unit} · {c.location || "위치 미지정"}</div>
                      </div>
                      <div style={{ display:"flex", gap:5, flexShrink:0, marginLeft:8 }}>
                        <button onMouseDown={() => onSelectExisting(c, "in")}
                          style={{ padding:"4px 8px", background:"#38A169", color:"#fff", border:"none", borderRadius:7, fontSize:"11px", fontWeight:700, cursor:"pointer" }}>입고</button>
                        <button onMouseDown={() => onSelectExisting(c, "out")}
                          style={{ padding:"4px 8px", background:"#E53E3E", color:"#fff", border:"none", borderRadius:7, fontSize:"11px", fontWeight:700, cursor:"pointer" }}>출고</button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* 프리셋 자동완성 섹션 */}
              {suggestions.presets.length > 0 && (
                <>
                  {suggestions.existing.length > 0 && (
                    <div style={{ padding:"6px 12px", fontSize:"11px", fontWeight:700, color:"#2B6CB0", background:"#EBF8FF", borderBottom:"1px solid #BEE3F8" }}>
                      신규 등록 자동완성
                    </div>
                  )}
                  {suggestions.presets.map((p) => (
                    <button key={p.name} onMouseDown={() => applyPreset(p)}
                      style={{ width:"100%", padding:"10px 12px", background:"none", border:"none", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #EDF2F7" }}>
                      <div>
                        <div style={{ fontSize:"13px", fontWeight:600, color:"#1A202C" }}>{p.name}</div>
                        <div style={{ fontSize:"11px", color:"#718096", marginTop:1 }}>{p.category} · {p.unit} · {p.grade}</div>
                      </div>
                      <div style={{ display:"flex", gap:2, flexShrink:0, marginLeft:8 }}>
                        {p.hazards.slice(0, 4).map((h) => (
                          <span key={h} style={{ fontSize:"13px" }} title={GHS_PICTOGRAMS[h]?.label}>{GHS_PICTOGRAMS[h]?.icon}</span>
                        ))}
                        {p.hazards.length > 4 && <span style={{ fontSize:"10px", color:"#A0AEC0" }}>+{p.hazards.length-4}</span>}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* 나머지 필드 */}
        {[
          { label:"분류 *",    key:"category", placeholder:"예: 금속염" },
          { label:"공급처",    key:"supplier", placeholder:"예: 대정화금" },
          { label:"보관위치",  key:"location", placeholder:"예: E-1" },
          { label:"등급",      key:"grade",    placeholder:"예: 특급" },
          { label:"MSDS URL",  key:"msdsUrl",  placeholder:"MSDS 링크" },
        ].map(({ label, key, placeholder }) => (
          <div key={key} style={{ marginBottom:10 }}>
            <label style={labelStyle}>{label}</label>
            <input value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder}
              style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} />
          </div>
        ))}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
          <div>
            <label style={labelStyle}>단위 *</label>
            <select value={form.unit} onChange={(e) => set("unit", e.target.value)}
              style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }}>
              {["mL","L","g","kg","개"].map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>현재 재고</label>
            <input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)}
              placeholder="0" style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} />
          </div>
          <div>
            <label style={labelStyle}>최소 재고</label>
            <input type="number" value={form.minStock} onChange={(e) => set("minStock", e.target.value)}
              placeholder="0" style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} />
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={labelStyle}>GHS 위험성</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {Object.entries(GHS_PICTOGRAMS).map(([key, val]) => (
              <button key={key} onClick={() => toggleHazard(key)}
                style={{ padding:"5px 10px", borderRadius:20, border:"1.5px solid", cursor:"pointer", fontSize:"12px", fontWeight:600,
                  borderColor: form.hazards.includes(key) ? val.color : "#E2E8F0",
                  background:  form.hazards.includes(key) ? val.color+"22" : "#fff",
                  color:       form.hazards.includes(key) ? val.color : "#718096" }}>
                {val.icon} {val.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleSubmit}
          style={{ ...btnStyle, width:"100%", background:"#3182CE", color:"#fff", fontSize:"15px", padding:"14px" }}>
          등록하기
        </button>
      </div>
    </div>
  );
}

// ─── Edit Log Modal ───
function EditLogModal({ log, chem, onClose, onSave, onDelete }) {
  const unitOpts = getUnitOptions(chem?.unit || "");
  const [editData, setEditData] = useState({ type: log.type, amount: String(log.amount), user: log.user, purpose: log.purpose, note: log.note });
  const [editUnit, setEditUnit] = useState(chem?.unit || "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (!editData.amount || !editData.user) return;
    setSaving(true);
    const convFactor = unitOpts.find((o) => o.label === editUnit)?.factor ?? 1;
    const finalAmount = Number(editData.amount) * convFactor;
    await onSave({ ...editData, amount: finalAmount });
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:500, padding:"20px", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <h3 style={{ margin:0, fontSize:"16px", fontWeight:700 }}>✏️ 이력 수정</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#718096" }}>✕</button>
        </div>
        {chem && <div style={{ fontSize:"12px", color:"#718096", marginBottom:16 }}>{chem.name}</div>}

        {confirmDelete ? (
          <div style={{ background:"#FFF5F5", border:"1.5px solid #FED7D7", borderRadius:12, padding:"16px", marginBottom:16 }}>
            <div style={{ fontSize:"14px", fontWeight:600, color:"#C53030", marginBottom:12 }}>정말 이 이력을 삭제하시겠어요?</div>
            <div style={{ fontSize:"12px", color:"#718096", marginBottom:16 }}>삭제하면 재고에서도 자동으로 되돌려집니다.</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ ...btnStyle, background:"#EDF2F7", color:"#4A5568" }}>취소</button>
              <button onClick={() => onDelete()} style={{ ...btnStyle, background:"#E53E3E", color:"#fff" }}>삭제 확인</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={labelStyle}>유형</label>
                <div style={{ display:"flex", gap:8 }}>
                  {["out","in"].map((t) => (
                    <button key={t} onClick={() => setEditData((p) => ({ ...p, type:t }))}
                      style={{ flex:1, padding:"8px", borderRadius:8, border:"2px solid", cursor:"pointer", fontWeight:600, fontSize:"13px",
                        borderColor: editData.type===t ? (t==="in"?"#38A169":"#E53E3E") : "#E2E8F0",
                        background:  editData.type===t ? (t==="in"?"#F0FFF4":"#FFF5F5") : "#fff",
                        color:       editData.type===t ? (t==="in"?"#22543D":"#822727") : "#718096" }}>
                      {t==="in"?"입고":"출고"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>수량 *</label>
                <div style={{ display:"flex", gap:6 }}>
                  <input type="number" value={editData.amount} onChange={(e) => setEditData((p) => ({ ...p, amount:e.target.value }))}
                    placeholder="0" style={{ ...inputStyle, flex:1, minWidth:0 }} />
                  {unitOpts.length > 1
                    ? <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)}
                        style={{ ...inputStyle, padding:"10px 6px", width:60, flexShrink:0 }}>
                        {unitOpts.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
                      </select>
                    : <span style={{ ...inputStyle, background:"#F7FAFC", color:"#718096", flexShrink:0, display:"flex", alignItems:"center" }}>{chem?.unit}</span>
                  }
                </div>
              </div>
            </div>
            {[
              { label:"담당자 *", key:"user",    placeholder:"이름" },
              { label:"용도 / 사유", key:"purpose", placeholder:"예: 산염기 적정 실험 (2학년)" },
              { label:"비고",     key:"note",    placeholder:"추가 메모" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom:12 }}>
                <label style={labelStyle}>{label}</label>
                <input type="text" value={editData[key]} onChange={(e) => setEditData((p) => ({ ...p, [key]:e.target.value }))}
                  placeholder={placeholder} style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} />
              </div>
            ))}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <button onClick={() => setConfirmDelete(true)} style={{ ...btnStyle, background:"#FFF5F5", color:"#C53030", border:"1.5px solid #FED7D7" }}>🗑 삭제</button>
              <button onClick={onClose} style={{ ...btnStyle, background:"#EDF2F7", color:"#4A5568" }}>취소</button>
              <button onClick={handleSave} disabled={saving}
                style={{ ...btnStyle, background:"#3182CE", color:"#fff", opacity:saving?0.6:1 }}>
                {saving?"저장 중...":"저장"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main App ───
export default function LabInventoryApp() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [chemicals, setChemicals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChemical, setSelectedChemical] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showEditLog, setShowEditLog] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [logFormData, setLogFormData] = useState({ chemicalId:"", type:"out", amount:"", user:"", purpose:"", note:"" });
  const [logUnit, setLogUnit] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  // 로그인한 사용자의 학교명 (데이터 격리 키)
  const schoolId = user?.user_metadata?.school_name?.trim() || "";

  // ─── Auth ───
  useEffect(() => {
    if (IS_DEMO) {
      setUser({ email: "demo@demo.com", user_metadata: {} });
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ─── Data Fetch ───
  const fetchChemicals = async () => {
    if (IS_DEMO) return;
    const { data } = await supabase.from("chemicals").select("*").order("id");
    if (data) setChemicals(data.map(chemToApp));
  };
  const fetchLogs = async () => {
    if (IS_DEMO) return;
    const { data } = await supabase.from("logs").select("*").order("date", { ascending: false });
    if (data) setLogs(data.map(logToApp));
  };

  // ─── Realtime 구독 + 초기 데이터 로드 ───
  useEffect(() => {
    if (!user) return;
    if (IS_DEMO) {
      setChemicals(SAMPLE_CHEMICALS);
      setLogs(SAMPLE_LOGS.map((l, i) => ({ ...l, id: `demo-log-${i}` })));
      return;
    }
    const init = async () => {
      const { count } = await supabase.from("chemicals").select("id", { count:"exact", head:true });
      if (count === 0) { setShowSetup(true); }
      else { await fetchChemicals(); await fetchLogs(); }
    };
    init();
    const channel = supabase
      .channel("lab-changes")
      .on("postgres_changes", { event:"*", schema:"public", table:"chemicals" }, fetchChemicals)
      .on("postgres_changes", { event:"*", schema:"public", table:"logs" }, fetchLogs)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (selectedChemical) {
      const updated = chemicals.find((c) => c.id === selectedChemical.id);
      if (updated) setSelectedChemical(updated);
    }
  }, [chemicals]);

  const handleSetupComplete = async () => {
    setShowSetup(false);
    await fetchChemicals();
    await fetchLogs();
  };

  // ─── Stats ───
  const stats = {
    total:     chemicals.length,
    lowStock:  chemicals.filter((c) => c.stock <= c.minStock).length,
    warning:   chemicals.filter((c) => c.stock > c.minStock && c.stock <= c.minStock * 2).length,
    todayLogs: logs.filter((l) => new Date(l.date).toDateString() === new Date().toDateString()).length,
    hazardous: chemicals.filter((c) => c.hazards.includes("toxic") || c.hazards.includes("corrosive")).length,
  };
  const categories = [...new Set(chemicals.map((c) => c.category))];

  // ─── 입출고 제출 ───
  const handleLogSubmit = async () => {
    if (!logFormData.chemicalId || !logFormData.amount || !logFormData.user) {
      showToast("필수 항목을 입력해주세요.", "error"); return;
    }
    const chem = chemicals.find((c) => c.id === logFormData.chemicalId);
    const unitOpts = getUnitOptions(chem?.unit || "");
    const convFactor = unitOpts.find((o) => o.label === logUnit)?.factor ?? 1;
    const finalAmount = Number(logFormData.amount) * convFactor;
    const newLog = {
      id: `demo-log-${Date.now()}`, chemicalId: logFormData.chemicalId,
      type: logFormData.type, amount: finalAmount,
      user: logFormData.user, purpose: logFormData.purpose,
      note: logFormData.note, date: new Date().toISOString(),
    };
    if (IS_DEMO) {
      setLogs((prev) => [newLog, ...prev]);
      setChemicals((prev) => prev.map((c) => {
        if (c.id !== logFormData.chemicalId) return c;
        const delta = logFormData.type === "in" ? finalAmount : -finalAmount;
        return { ...c, stock: Math.max(0, c.stock + delta), lastUpdated: new Date().toISOString().slice(0,10) };
      }));
    } else {
      try {
        await supabase.from("logs").insert({
          chemical_id: logFormData.chemicalId, type: logFormData.type,
          amount: finalAmount, user_name: logFormData.user,
          purpose: logFormData.purpose, note: logFormData.note, date: new Date().toISOString(), school_id: schoolId,
        });
        if (chem) {
          const delta = logFormData.type === "in" ? finalAmount : -finalAmount;
          await supabase.from("chemicals").update({ stock: Math.max(0, chem.stock + delta), last_updated: new Date().toISOString().slice(0,10) }).eq("id", logFormData.chemicalId);
        }
      } catch { showToast("처리 중 오류가 발생했습니다.", "error"); return; }
    }
    showToast(logFormData.type === "in" ? "입고 처리되었습니다." : "출고 처리되었습니다.");
    setShowLogForm(false);
    setLogFormData({ chemicalId:"", type:"out", amount:"", user:"", purpose:"", note:"" });
    setLogUnit("");
  };

  // ─── 입출고 이력 수정 ───
  const handleEditLog = async ({ type, amount, user, purpose, note }) => {
    const log = editingLog;
    const chem = chemicals.find((c) => c.id === log.chemicalId);
    const oldEffect = log.type === "in" ? log.amount : -log.amount;
    const newEffect = type === "in" ? amount : -amount;
    const delta = newEffect - oldEffect;
    const newStock = chem ? Math.max(0, chem.stock + delta) : 0;
    if (IS_DEMO) {
      setLogs((prev) => prev.map((l) => l.id !== log.id ? l : { ...l, type, amount, user, purpose, note }));
      if (chem) setChemicals((prev) => prev.map((c) => c.id !== chem.id ? c : { ...c, stock: newStock, lastUpdated: new Date().toISOString().slice(0,10) }));
    } else {
      const { error: logErr } = await supabase.from("logs").update({ type, amount, user_name: user, purpose, note }).eq("id", log.id);
      if (logErr) { showToast("수정 중 오류가 발생했습니다.", "error"); return; }
      if (chem) {
        const { error: chemErr } = await supabase.from("chemicals").update({ stock: newStock, last_updated: new Date().toISOString().slice(0,10) }).eq("id", chem.id);
        if (chemErr) { showToast("재고 업데이트 중 오류가 발생했습니다.", "error"); return; }
      }
      await fetchLogs();
      await fetchChemicals();
    }
    showToast("이력이 수정되었습니다.");
    setShowEditLog(false);
    setEditingLog(null);
  };

  // ─── 새 약품 등록 ───
  const handleAddChemical = async (chem) => {
    if (IS_DEMO) {
      setChemicals((prev) => [...prev, chem].sort((a, b) => a.id.localeCompare(b.id)));
    } else {
      const { error } = await supabase.from("chemicals").insert({ ...chemToDb(chem), school_id: schoolId });
      if (error) { showToast("등록에 실패했습니다.", "error"); return; }
    }
    showToast(`${chem.name} 등록 완료!`);
    setShowAddForm(false);
  };

  // ─── 입출고 이력 삭제 ───
  const handleDeleteLog = async () => {
    const log = editingLog;
    const chem = chemicals.find((c) => c.id === log.chemicalId);
    const revertDelta = log.type === "in" ? -log.amount : log.amount;
    const newStock = chem ? Math.max(0, chem.stock + revertDelta) : 0;
    if (IS_DEMO) {
      setLogs((prev) => prev.filter((l) => l.id !== log.id));
      if (chem) setChemicals((prev) => prev.map((c) => c.id !== chem.id ? c : { ...c, stock: newStock, lastUpdated: new Date().toISOString().slice(0,10) }));
    } else {
      const { error: delErr } = await supabase.from("logs").delete().eq("id", log.id);
      if (delErr) { showToast("삭제 중 오류가 발생했습니다.", "error"); return; }
      if (chem) {
        const { error: chemErr } = await supabase.from("chemicals").update({ stock: newStock, last_updated: new Date().toISOString().slice(0,10) }).eq("id", chem.id);
        if (chemErr) { showToast("재고 업데이트 중 오류가 발생했습니다.", "error"); return; }
      }
      await fetchLogs();
      await fetchChemicals();
    }
    showToast("이력이 삭제되었습니다.");
    setShowEditLog(false);
    setEditingLog(null);
  };

  // ─── 기존 약품 선택 (중복 등록 방지) ───
  const handleSelectExisting = (chem, type = "in") => {
    setShowAddForm(false);
    setLogFormData({ chemicalId: chem.id, type, amount: "", user: "", purpose: "", note: "" });
    setShowLogForm(true);
  };

  const handleSignOut = async () => {
    if (!IS_DEMO) await supabase.auth.signOut();
    setChemicals([]); setLogs([]); setUser(null);
  };

  const handleScan = (code) => {
    setShowScanner(false);
    const found = chemicals.find((c) => c.id === code);
    if (found) { setSelectedChemical(found); setActiveTab("detail"); showToast(`${found.name} 인식됨`); }
    else showToast("등록되지 않은 약품입니다.", "error");
  };

  const filteredChemicals = chemicals.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
      && (filterCategory === "all" || c.category === filterCategory);
  });

  // ─── Render: Dashboard ───
  const renderDashboard = () => (
    <div style={{ padding:"0 16px 100px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"20px" }}>
        <div style={{ ...cardStyle, background:"linear-gradient(135deg, #1a365d 0%, #2a4a7f 100%)", color:"#fff", gridColumn:"span 2", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:"13px", opacity:0.8, marginBottom:4 }}>전체 약품</div>
            <div style={{ fontSize:"32px", fontWeight:700, fontFamily:"monospace" }}>{stats.total}<span style={{ fontSize:"14px", fontWeight:400, marginLeft:4 }}>종</span></div>
          </div>
          <div style={{ fontSize:"40px" }}>🧪</div>
        </div>
        {[
          { label:"오늘 입출고", val:stats.todayLogs, color:"#3182CE" },
          { label:"위험물",    val:stats.hazardous,  color:"#805AD5" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ ...cardStyle, borderLeft:`4px solid ${color}` }}>
            <div style={{ fontSize:"12px", color:"#718096", marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:"28px", fontWeight:700, color, fontFamily:"monospace" }}>{val}</div>
          </div>
        ))}
      </div>

      {stats.lowStock > 0 && (
        <div style={{ marginBottom:"20px" }}>
          <div style={{ fontSize:"14px", fontWeight:600, color:"#E53E3E", marginBottom:10 }}>⚠️ 재고 부족 알림</div>
          {chemicals.filter((c) => c.stock <= c.minStock).map((c) => (
            <div key={c.id} onClick={() => { setSelectedChemical(c); setActiveTab("detail"); }}
              style={{ ...cardStyle, borderLeft:"4px solid #E53E3E", marginBottom:8, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:"14px", fontWeight:600 }}>{c.name}</div>
                <div style={{ fontSize:"12px", color:"#718096" }}>위치: {c.location}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"16px", fontWeight:700, color:"#E53E3E", fontFamily:"monospace" }}>{c.stock}{c.unit}</div>
                <div style={{ fontSize:"11px", color:"#A0AEC0" }}>최소 {c.minStock}{c.unit}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <div style={{ fontSize:"14px", fontWeight:600, color:"#2D3748", marginBottom:10 }}>📋 최근 입출고 내역</div>
        {logs.slice(0,5).map((log) => {
          const chem = chemicals.find((c) => c.id === log.chemicalId);
          return (
            <div key={log.id} style={{ ...cardStyle, marginBottom:8, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", fontWeight:700, flexShrink:0, background: log.type==="in"?"#C6F6D5":"#FED7D7", color: log.type==="in"?"#22543D":"#822727" }}>
                {log.type==="in"?"입":"출"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:"13px", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{chem?.name||log.chemicalId}</div>
                <div style={{ fontSize:"11px", color:"#718096" }}>{log.purpose}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:"14px", fontWeight:600, fontFamily:"monospace", color: log.type==="in"?"#38A169":"#E53E3E" }}>
                  {log.type==="in"?"+":"-"}{log.amount}{chem?.unit}
                </div>
                <div style={{ fontSize:"10px", color:"#A0AEC0" }}>{formatDate(log.date)}</div>
              </div>
              <button onClick={() => { setEditingLog(log); setShowEditLog(true); }}
                style={{ background:"#EDF2F7", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:"14px", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}
                title="수정">✏️</button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Render: Inventory ───
  const renderInventory = () => (
    <div style={{ padding:"0 16px 100px" }}>
      {/* 검색 */}
      <div style={{ position:"relative", marginBottom:12 }}>
        <input type="text" placeholder="약품명, 코드로 검색..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, paddingLeft:"36px", width:"100%", boxSizing:"border-box" }} />
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:"16px", color:"#A0AEC0" }}>🔍</span>
      </div>

      {/* 카테고리 필터 + 엑셀 저장 */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, gap:8 }}>
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:2, flex:1 }}>
          {["all",...categories].map((cat) => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              style={{ ...chipStyle, ...(filterCategory===cat ? chipActiveStyle : {}) }}>
              {cat==="all"?"전체":cat}
            </button>
          ))}
        </div>
        <button onClick={() => exportToCSV(filteredChemicals)}
          style={{ flexShrink:0, display:"flex", alignItems:"center", gap:5, padding:"7px 12px", background:"#F0FFF4", border:"1.5px solid #C6F6D5", borderRadius:10, fontSize:"12px", fontWeight:700, color:"#276749", cursor:"pointer", whiteSpace:"nowrap" }}>
          📊 엑셀 저장
        </button>
      </div>

      {/* 약품 수 */}
      <div style={{ fontSize:"12px", color:"#A0AEC0", marginBottom:10 }}>
        {filterCategory === "all" ? `전체 ${filteredChemicals.length}종` : `${filterCategory} ${filteredChemicals.length}종`}
      </div>

      {filteredChemicals.map((chem) => {
        const status = getStockStatus(chem.stock, chem.minStock);
        return (
          <div key={chem.id} onClick={() => { setSelectedChemical(chem); setActiveTab("detail"); }}
            style={{ ...cardStyle, marginBottom:10, cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"14px", fontWeight:700, color:"#1A202C" }}>{chem.name}</div>
                <div style={{ fontSize:"11px", color:"#A0AEC0", fontFamily:"monospace" }}>{chem.id} · {chem.category}</div>
              </div>
              <span style={{ fontSize:"11px", fontWeight:600, padding:"2px 8px", borderRadius:10, color:status.color, background:status.bg }}>{status.label}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", gap:4 }}>
                {chem.hazards.map((h) => <span key={h} title={GHS_PICTOGRAMS[h]?.label} style={{ fontSize:"14px" }}>{GHS_PICTOGRAMS[h]?.icon}</span>)}
              </div>
              <div>
                <span style={{ fontSize:"18px", fontWeight:700, fontFamily:"monospace", color:status.color }}>{chem.stock.toLocaleString()}</span>
                <span style={{ fontSize:"12px", color:"#718096", marginLeft:2 }}>{chem.unit}</span>
              </div>
            </div>
            <div style={{ marginTop:8, height:4, background:"#EDF2F7", borderRadius:2, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:2, width:`${Math.min(100,(chem.stock/(chem.minStock*5))*100)}%`, background:status.color }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
              <span style={{ fontSize:"10px", color:"#A0AEC0" }}>위치: {chem.location}</span>
              <span style={{ fontSize:"10px", color:"#A0AEC0" }}>최소: {chem.minStock}{chem.unit}</span>
            </div>
          </div>
        );
      })}
      {filteredChemicals.length===0 && (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#A0AEC0" }}>
          <div style={{ fontSize:"40px", marginBottom:8 }}>🔍</div>
          <div style={{ fontSize:"14px" }}>검색 결과가 없습니다</div>
        </div>
      )}
    </div>
  );

  // ─── Render: Detail ───
  const renderDetail = () => {
    if (!selectedChemical) return null;
    const chem = selectedChemical;
    const status = getStockStatus(chem.stock, chem.minStock);
    const chemLogs = logs.filter((l) => l.chemicalId === chem.id);
    return (
      <div style={{ padding:"0 16px 100px" }}>
        <button onClick={() => { setSelectedChemical(null); setActiveTab("inventory"); }}
          style={{ background:"none", border:"none", color:"#3182CE", fontSize:"14px", padding:"8px 0", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
          ← 목록으로
        </button>

        <div style={{ ...cardStyle, marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <h2 style={{ fontSize:"18px", fontWeight:700, color:"#1A202C", margin:0 }}>{chem.name}</h2>
            <span style={{ fontSize:"12px", fontWeight:600, padding:"3px 10px", borderRadius:10, color:status.color, background:status.bg }}>{status.label}</span>
          </div>
          <div style={{ textAlign:"center", padding:"16px 0", background:"#F7FAFC", borderRadius:12, marginBottom:16 }}>
            <div style={{ fontSize:"12px", color:"#718096", marginBottom:4 }}>현재 재고</div>
            <div style={{ fontSize:"36px", fontWeight:700, fontFamily:"monospace", color:status.color }}>
              {chem.stock.toLocaleString()}<span style={{ fontSize:"16px", fontWeight:400, color:"#718096", marginLeft:4 }}>{chem.unit}</span>
            </div>
            <div style={{ margin:"8px 20px 0", height:6, background:"#E2E8F0", borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:3, width:`${Math.min(100,(chem.stock/(chem.minStock*5))*100)}%`, background:status.color }} />
            </div>
            <div style={{ fontSize:"11px", color:"#A0AEC0", marginTop:4 }}>최소 권장: {chem.minStock}{chem.unit}</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, fontSize:"13px" }}>
            {[["분류",chem.category],["등급",chem.grade],["보관위치",chem.location],["공급처",chem.supplier],["코드",chem.id],["최종수정",chem.lastUpdated]].map(([label,value]) => (
              <div key={label} style={{ background:"#F7FAFC", padding:"8px 10px", borderRadius:8 }}>
                <div style={{ fontSize:"11px", color:"#A0AEC0", marginBottom:2 }}>{label}</div>
                <div style={{ fontWeight:600, color:"#2D3748" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom:16 }}>
          <div style={{ fontSize:"14px", fontWeight:600, marginBottom:10 }}>⚠️ GHS 위험성 정보</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {chem.hazards.length === 0
              ? <span style={{ fontSize:"13px", color:"#A0AEC0" }}>위험성 정보 없음</span>
              : chem.hazards.map((h) => {
                  const info = GHS_PICTOGRAMS[h];
                  return (
                    <div key={h} style={{ display:"flex", alignItems:"center", gap:6, background:"#FFF5F5", padding:"6px 10px", borderRadius:8, border:`1px solid ${info?.color}22` }}>
                      <span style={{ fontSize:"18px" }}>{info?.icon}</span>
                      <span style={{ fontSize:"12px", fontWeight:600, color:info?.color }}>{info?.label}</span>
                    </div>
                  );
                })}
          </div>
          {chem.msdsUrl && (
            <a href={chem.msdsUrl} target="_blank" rel="noopener noreferrer"
              style={{ display:"block", marginTop:12, fontSize:"13px", color:"#3182CE", textDecoration:"none", fontWeight:600 }}>
              📄 MSDS 상세보기 (KOSHA) →
            </a>
          )}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <button onClick={() => { setLogFormData({ ...logFormData, chemicalId:chem.id, type:"out" }); setShowLogForm(true); }}
            style={{ ...btnStyle, background:"#E53E3E", color:"#fff" }}>📤 출고</button>
          <button onClick={() => { setLogFormData({ ...logFormData, chemicalId:chem.id, type:"in" }); setShowLogForm(true); }}
            style={{ ...btnStyle, background:"#38A169", color:"#fff" }}>📥 입고</button>
        </div>
        <button onClick={() => setShowQRModal(true)}
          style={{ ...btnStyle, width:"100%", background:"#EBF8FF", color:"#2B6CB0", marginBottom:16, border:"1.5px solid #BEE3F8" }}>
          📱 QR 코드 보기 / PNG 저장
        </button>

        <div style={{ fontSize:"14px", fontWeight:600, marginBottom:10 }}>📋 입출고 이력</div>
        {chemLogs.length===0
          ? <div style={{ textAlign:"center", padding:20, color:"#A0AEC0", fontSize:"13px" }}>이력이 없습니다</div>
          : chemLogs.map((log) => (
            <div key={log.id} style={{ ...cardStyle, marginBottom:8, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:700, flexShrink:0, background: log.type==="in"?"#C6F6D5":"#FED7D7", color: log.type==="in"?"#22543D":"#822727" }}>
                {log.type==="in"?"입":"출"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"12px", fontWeight:600 }}>{log.purpose || <span style={{ color:"#A0AEC0" }}>사유 없음</span>}</div>
                <div style={{ fontSize:"11px", color:"#A0AEC0" }}>{log.user} · {formatDate(log.date)}</div>
              </div>
              <div style={{ fontSize:"14px", fontWeight:700, fontFamily:"monospace", color: log.type==="in"?"#38A169":"#E53E3E", marginRight:4 }}>
                {log.type==="in"?"+":"-"}{log.amount}{chem.unit}
              </div>
              <button onClick={() => { setEditingLog(log); setShowEditLog(true); }}
                style={{ background:"#EDF2F7", border:"none", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:"14px", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}
                title="수정">✏️</button>
            </div>
          ))}
      </div>
    );
  };

  // ─── Render: Log Form ───
  const renderLogForm = () => (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:500, padding:"20px", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:"16px", fontWeight:700 }}>{logFormData.type==="in"?"📥 입고 처리":"📤 출고 처리"}</h3>
          <button onClick={() => setShowLogForm(false)} style={{ background:"none", border:"none", fontSize:"20px", cursor:"pointer", color:"#718096" }}>✕</button>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={labelStyle}>약품 선택 *</label>
          <select value={logFormData.chemicalId} onChange={(e) => {
            const selChem = chemicals.find((c) => c.id === e.target.value);
            setLogFormData({...logFormData, chemicalId:e.target.value});
            setLogUnit(selChem?.unit || "");
          }} style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }}>
            <option value="">선택해주세요</option>
            {chemicals.map((c) => <option key={c.id} value={c.id}>{c.name} (재고: {c.stock}{c.unit})</option>)}
          </select>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div>
            <label style={labelStyle}>유형</label>
            <div style={{ display:"flex", gap:8 }}>
              {["out","in"].map((t) => (
                <button key={t} onClick={() => setLogFormData({...logFormData, type:t})}
                  style={{ flex:1, padding:"8px", borderRadius:8, border:"2px solid", cursor:"pointer", fontWeight:600, fontSize:"13px",
                    borderColor: logFormData.type===t ? (t==="in"?"#38A169":"#E53E3E") : "#E2E8F0",
                    background:  logFormData.type===t ? (t==="in"?"#F0FFF4":"#FFF5F5") : "#fff",
                    color:       logFormData.type===t ? (t==="in"?"#22543D":"#822727") : "#718096" }}>
                  {t==="in"?"입고":"출고"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>수량 *</label>
            {(() => {
              const selChem = chemicals.find((c) => c.id === logFormData.chemicalId);
              const unitOpts = getUnitOptions(selChem?.unit || "");
              return (
                <div style={{ display:"flex", gap:6 }}>
                  <input type="number" value={logFormData.amount} onChange={(e) => setLogFormData({...logFormData, amount:e.target.value})}
                    placeholder="0" style={{ ...inputStyle, flex:1, minWidth:0 }} />
                  {unitOpts.length > 1
                    ? <select value={logUnit} onChange={(e) => setLogUnit(e.target.value)}
                        style={{ ...inputStyle, padding:"10px 6px", width:60, flexShrink:0 }}>
                        {unitOpts.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
                      </select>
                    : <span style={{ ...inputStyle, background:"#F7FAFC", color:"#718096", flexShrink:0, display:"flex", alignItems:"center", padding:"10px 10px" }}>{selChem?.unit || "-"}</span>
                  }
                </div>
              );
            })()}
          </div>
        </div>
        {[
          { label:"담당자 *", key:"user",    placeholder:"이름" },
          { label:"용도 / 사유", key:"purpose", placeholder:"예: 산염기 적정 실험 (2학년)" },
          { label:"비고",     key:"note",    placeholder:"추가 메모" },
        ].map(({ label, key, placeholder }) => (
          <div key={key} style={{ marginBottom:12 }}>
            <label style={labelStyle}>{label}</label>
            <input type="text" value={logFormData[key]} onChange={(e) => setLogFormData({...logFormData, [key]:e.target.value})}
              placeholder={placeholder} style={{ ...inputStyle, width:"100%", boxSizing:"border-box" }} />
          </div>
        ))}
        <button onClick={handleLogSubmit}
          style={{ ...btnStyle, width:"100%", background: logFormData.type==="in"?"#38A169":"#E53E3E", color:"#fff", fontSize:"15px", padding:"14px" }}>
          {logFormData.type==="in"?"입고 확인":"출고 확인"}
        </button>
      </div>
    </div>
  );

  // ─── Auth Screens ───
  if (authLoading) return <LoadingScreen />;
  if (!user)       return <LoginScreen schoolName={SCHOOL_NAME} />;

  return (
    <div style={{ maxWidth:500, margin:"0 auto", background:"#F7FAFC", minHeight:"100vh", fontFamily:"'Pretendard',-apple-system,sans-serif", position:"relative" }}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {IS_DEMO && (
        <div style={{ background:"#ECC94B", color:"#744210", fontSize:"12px", fontWeight:600, textAlign:"center", padding:"6px", letterSpacing:"0.3px" }}>
          ⚡ 데모 모드 — 데이터는 저장되지 않습니다 (새로고침 시 초기화)
        </div>
      )}

      {/* Header */}
      <div style={{ padding:"12px 16px", background:"#fff", borderBottom:"1px solid #E2E8F0", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ margin:0, fontSize:"18px", fontWeight:800, color:"#1A202C", letterSpacing:"-0.5px" }}>🧪 약품 재고관리</h1>
            <div style={{ fontSize:"11px", color:"#A0AEC0", marginTop:2 }}>{SCHOOL_NAME}</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setShowScanner(true)}
              style={{ width:38, height:38, borderRadius:10, background:"#EBF8FF", border:"none", fontSize:"18px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>📷</button>
            <button onClick={() => setShowAddForm(true)}
              style={{ width:38, height:38, borderRadius:10, background:"#F0FFF4", border:"none", fontSize:"18px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>➕</button>
            <button onClick={handleSignOut} title={user.email}
              style={{ width:38, height:38, borderRadius:10, border:"none", cursor:"pointer", background:"#EDF2F7", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:"18px" }}>👤</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab==="dashboard" && renderDashboard()}
      {activeTab==="inventory" && renderInventory()}
      {activeTab==="detail"    && renderDetail()}

      {activeTab !== "detail" && (
        <button onClick={() => { setLogFormData({ chemicalId:"", type:"out", amount:"", user:"", purpose:"", note:"" }); setShowLogForm(true); }}
          style={{ position:"fixed", bottom:80, right:20, width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg, #3182CE 0%, #2B6CB0 100%)", color:"#fff", border:"none", fontSize:"24px", cursor:"pointer", boxShadow:"0 4px 14px rgba(49,130,206,0.4)", zIndex:90, display:"flex", alignItems:"center", justifyContent:"center" }}>
          +
        </button>
      )}

      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:500, background:"#fff", borderTop:"1px solid #E2E8F0", display:"flex", padding:"6px 0 env(safe-area-inset-bottom, 8px)", zIndex:100 }}>
        {[
          { id:"dashboard", icon:"📊", label:"대시보드" },
          { id:"inventory", icon:"🧪", label:"약품목록" },
          { id:"scanner",   icon:"📷", label:"스캔", action: () => setShowScanner(true) },
        ].map((tab) => (
          <button key={tab.id} onClick={tab.action||(() => { setActiveTab(tab.id); setSelectedChemical(null); })}
            style={{ flex:1, background:"none", border:"none", padding:"8px 0", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, color: activeTab===tab.id?"#3182CE":"#A0AEC0", transition:"color 0.2s" }}>
            <span style={{ fontSize:"20px" }}>{tab.icon}</span>
            <span style={{ fontSize:"10px", fontWeight: activeTab===tab.id?700:500 }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {showSetup   && <SetupWizard onComplete={handleSetupComplete} showToast={showToast} schoolId={schoolId} />}
      {showScanner && <QRScanner chemicals={chemicals} onScan={handleScan} onClose={() => setShowScanner(false)} />}
      {showLogForm  && renderLogForm()}
      {showAddForm  && <AddChemicalModal chemicals={chemicals} onClose={() => setShowAddForm(false)} onAdd={handleAddChemical} onSelectExisting={handleSelectExisting} showToast={showToast} />}
      {showQRModal  && selectedChemical && <QRCodeModal chem={selectedChemical} onClose={() => setShowQRModal(false)} />}
      {showEditLog  && editingLog && (
        <EditLogModal
          log={editingLog}
          chem={chemicals.find((c) => c.id === editingLog.chemicalId)}
          onClose={() => { setShowEditLog(false); setEditingLog(null); }}
          onSave={handleEditLog}
          onDelete={handleDeleteLog}
        />
      )}

      {toast && (
        <div style={{ position:"fixed", top:60, left:"50%", transform:"translateX(-50%)", background: toast.type==="error"?"#E53E3E":"#38A169", color:"#fff", padding:"10px 20px", borderRadius:12, fontSize:"13px", fontWeight:600, zIndex:2000, boxShadow:"0 4px 12px rgba(0,0,0,0.15)", animation:"slideDown 0.3s ease" }}>
          {toast.message}
        </div>
      )}
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}

// ─── Shared Styles ───
const cardStyle        = { background:"#fff", borderRadius:14, padding:"14px", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" };
const inputStyle       = { padding:"10px 12px", borderRadius:10, border:"1.5px solid #E2E8F0", fontSize:"14px", outline:"none", background:"#fff" };
const labelStyle       = { display:"block", fontSize:"12px", fontWeight:600, color:"#4A5568", marginBottom:4 };
const btnStyle         = { padding:"12px", borderRadius:12, border:"none", fontWeight:700, fontSize:"14px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 };
const chipStyle        = { padding:"6px 14px", borderRadius:20, border:"1.5px solid #E2E8F0", background:"#fff", fontSize:"12px", fontWeight:500, color:"#718096", cursor:"pointer", whiteSpace:"nowrap" };
const chipActiveStyle  = { background:"#EBF8FF", borderColor:"#3182CE", color:"#3182CE", fontWeight:600 };
const setupOptionStyle = { background:"#fff", border:"2px solid", borderRadius:16, padding:"16px 20px", textAlign:"center", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", alignItems:"center" };
