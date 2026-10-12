export const makeId = (prefix) => `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
export const today = () => new Date().toISOString().slice(0, 10);

const normalizeText = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, "");

export const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
};

export const normalizeChemical = (chemical) => ({
  id: chemical.id || makeId("C"),
  name: chemical.name || "",
  category: chemical.category || "",
  unit: chemical.unit || "g",
  stock: Number(chemical.stock || 0),
  minStock: Number(chemical.minStock || 0),
  location: chemical.location || "",
  hazards: toArray(chemical.hazards),
  msdsUrl: chemical.msdsUrl || "",
  memo: chemical.memo || "",
  supplier: chemical.supplier || "",
  lastUpdated: chemical.lastUpdated || today(),
  aliases: toArray(chemical.aliases),
  casNo: chemical.casNo || "",
});

export const normalizeLog = (log) => ({
  id: log.id || makeId("L"),
  chemicalId: log.chemicalId || "",
  chemicalName: log.chemicalName || "",
  type: log.type || "out",
  amount: Number(log.amount || 0),
  unit: log.unit || "",
  user: log.user || "",
  purpose: log.purpose || "",
  note: log.note || "",
  date: log.date || new Date().toISOString(),
});

export const convertToBase = (amount, fromUnit, baseUnit) => {
  const value = Number(amount || 0);
  const from = String(fromUnit || "").toLowerCase();
  const base = String(baseUnit || "").toLowerCase();
  if (!from || !base || from === base) return value;
  if (from === "kg" && base === "g") return value * 1000;
  if (from === "mg" && base === "g") return value / 1000;
  if (from === "g" && base === "kg") return value / 1000;
  if (from === "g" && base === "mg") return value * 1000;
  if (from === "l" && base === "ml") return value * 1000;
  if (from === "ml" && base === "l") return value / 1000;
  return Number.NaN;
};

export const getUnitOptions = (baseUnit) => {
  if (baseUnit === "g") return ["g", "mg", "kg"];
  if (baseUnit === "mL") return ["mL", "L"];
  return baseUnit ? [baseUnit] : [];
};

export const findChemicalByName = (chemicals, name) => {
  const target = normalizeText(name);
  return chemicals.find((chemical) => {
    const aliases = toArray(chemical.aliases);
    return [chemical.name, chemical.id, chemical.casNo, ...aliases].some((candidate) => {
      const normalized = normalizeText(candidate);
      return normalized.includes(target) || target.includes(normalized);
    });
  });
};

export const applyTransactions = (chemicals, entries) => {
  const updatedById = Object.fromEntries(chemicals.map((chemical) => [chemical.id, { ...chemical }]));
  const logs = entries.map(normalizeLog);

  logs.forEach((log) => {
    const chemical = updatedById[log.chemicalId];
    if (!chemical) throw new Error("약품을 찾을 수 없습니다.");
    if (!Number.isFinite(log.amount) || log.amount <= 0) throw new Error("출납 수량은 0보다 커야 합니다.");
    if (log.type !== "in" && log.type !== "out") throw new Error("출납 유형이 올바르지 않습니다.");
    if (log.unit !== chemical.unit) throw new Error("약품 기본 단위와 출납 단위가 다릅니다.");
    if (!Number.isFinite(chemical.stock) || chemical.stock < 0) throw new Error(`${chemical.name}의 재고 값이 올바르지 않습니다.`);
    if (log.type === "out" && log.amount > chemical.stock) throw new Error(`${chemical.name}의 재고가 부족합니다. 현재 재고: ${chemical.stock}${chemical.unit}`);
    chemical.stock += log.type === "in" ? log.amount : -log.amount;
    chemical.lastUpdated = today();
  });

  return {
    chemicals: chemicals.map((chemical) => updatedById[chemical.id] || chemical),
    logs,
  };
};
