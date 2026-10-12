const URL_KEY = "gsheetsUrl";

export const getGSheetsUrl = () => (localStorage.getItem(URL_KEY) || "").trim();
export const setGSheetsUrl = (url) => localStorage.setItem(URL_KEY, url.trim());
export const clearGSheetsUrl = () => localStorage.removeItem(URL_KEY);
export const isDemoMode = () => !getGSheetsUrl();

const buildUrl = (action, params = {}) => {
  const base = getGSheetsUrl();
  if (!base) return null;
  const url = new URL(base);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  return url.toString();
};

const getJson = async (action, params) => {
  const url = buildUrl(action, params);
  if (!url) return null;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Google Sheets request failed");
  return json.data ?? null;
};

const postJson = async (action, data = {}) => {
  const url = getGSheetsUrl();
  if (!url) return null;
  const res = await fetch(url, { method: "POST", body: JSON.stringify({ action, ...data }) });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Google Sheets request failed");
  return json.data ?? null;
};

export const fetchChemicals = () => getJson("getChemicals");
export const addChemical = (data) => postJson("addChemical", data);
export const updateChemical = (id, data) => postJson("updateChemicalDetails", { ...data, id });
export const deleteChemical = (id) => postJson("deleteChemical", { id });

export const fetchLogs = () => getJson("getLogs");
export const addLog = (data) => postJson("addLog", data);
export const recordTransactions = (logs) => postJson("recordTransactions", { logs });
export const updateLog = (id, data) => postJson("updateLog", { ...data, id });
export const deleteLog = (id) => postJson("deleteLog", { id });

export const fetchExperiments = () => getJson("getExperiments");
export const addExperiment = (data) => postJson("addExperiment", data);
export const deleteExperiment = (id) => postJson("deleteExperiment", { id });

export const fetchExpChemicals = (experimentId) => getJson("getExpChemicals", experimentId ? { experimentId } : {});
export const addExpChemical = (data) => postJson("addExpChemical", data);
export const deleteExpChemical = (id) => postJson("deleteExpChemical", { id });
export const batchAddRows = (sheet, rows) => postJson("batchAddRows", { sheet, rows });
