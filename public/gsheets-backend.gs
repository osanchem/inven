const SHEETS = {
  chemicals: [
    "id", "name", "category", "unit", "stock", "minStock", "location",
    "hazards", "msdsUrl", "memo", "supplier", "lastUpdated", "aliases", "casNo"
  ],
  logs: ["id", "chemicalId", "chemicalName", "type", "amount", "unit", "user", "purpose", "note", "date"],
  experiments: ["id", "name", "description", "subject", "grade"],
  experiment_chemicals: ["experimentId", "chemicalName", "amount", "unit", "note"],
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "";
  const p = (e && e.parameter) || {};
  try {
    if (action === "getChemicals") return jsonResponse({ ok: true, data: listRows_("chemicals") });
    if (action === "getLogs") return jsonResponse({ ok: true, data: listRows_("logs") });
    if (action === "getExperiments") return jsonResponse({ ok: true, data: listRows_("experiments") });
    if (action === "getExpChemicals") {
      const rows = listRows_("experiment_chemicals").filter(function (r) {
        return !p.experimentId || String(r.experimentId) === String(p.experimentId);
      });
      return jsonResponse({ ok: true, data: rows });
    }
    return jsonResponse({ ok: false, error: "Unknown action: " + action }, 400);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message || err) }, 500);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = body.action || "";

    if (action === "addChemical") return jsonResponse({ ok: true, data: addRow_("chemicals", withId_(body)) });
    if (action === "updateChemical") return jsonResponse({ ok: true, data: withScriptLock_(function () { return updateRow_("chemicals", "id", body.id, body); }) });
    if (action === "updateChemicalDetails") return jsonResponse({ ok: true, data: updateChemical_(body.id, body) });
    if (action === "deleteChemical") return jsonResponse({ ok: true, data: withScriptLock_(function () { return deleteRow_("chemicals", "id", body.id); }) });

    if (action === "addLog") return jsonResponse({ ok: true, data: addRow_("logs", withId_(body)) });
    if (action === "recordTransactions") return jsonResponse({ ok: true, data: recordTransactions_(body.logs) });
    if (action === "updateLog") return jsonResponse({ ok: true, data: updateRow_("logs", "id", body.id, body) });
    if (action === "deleteLog") return jsonResponse({ ok: true, data: deleteRow_("logs", "id", body.id) });

    if (action === "addExperiment") return jsonResponse({ ok: true, data: addRow_("experiments", withId_(body, "EXP")) });
    if (action === "deleteExperiment") {
      const sh = sheet_("experiment_chemicals");
      const rows = listRows_("experiment_chemicals");
      for (let i = rows.length - 1; i >= 0; i--) {
        if (String(rows[i].experimentId) === String(body.id)) sh.deleteRow(i + 2);
      }
      return jsonResponse({ ok: true, data: deleteRow_("experiments", "id", body.id) });
    }
    if (action === "addExpChemical") return jsonResponse({ ok: true, data: addRow_("experiment_chemicals", body) });
    if (action === "batchAddRows") {
      const headers = SHEETS[body.sheet];
      if (!headers) throw new Error("Unknown sheet: " + body.sheet);
      (body.rows || []).forEach(function (row) { addRow_(body.sheet, row); });
      return jsonResponse({ ok: true });
    }
    if (action === "deleteExpChemical") {
      const deleted = deleteExpChemical_(body.id, body.experimentId, body.chemicalName);
      return jsonResponse({ ok: true, data: deleted });
    }

    return jsonResponse({ ok: false, error: "Unknown action: " + action }, 400);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message || err) }, 500);
  }
}

function doOptions() {
  return jsonResponse({ ok: true });
}

function jsonResponse(result) {
  result.cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const headers = SHEETS[name];
  const current = sh.getRange(1, 1, 1, Math.max(headers.length, sh.getLastColumn() || 1)).getValues()[0];
  const needsHeader = headers.some(function (h, i) { return current[i] !== h; });
  if (needsHeader) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sh;
}

function listRows_(name) {
  const sh = sheet_(name);
  const headers = SHEETS[name];
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, headers.length).getValues().map(function (row) {
    const obj = {};
    headers.forEach(function (h, i) { obj[h] = decodeValue_(row[i]); });
    return obj;
  });
}

function addRow_(name, data) {
  const sh = sheet_(name);
  const headers = SHEETS[name];
  const row = headers.map(function (h) { return encodeValue_(data[h]); });
  sh.appendRow(row);
  return data;
}

function updateRow_(name, key, value, data) {
  const sh = sheet_(name);
  const headers = SHEETS[name];
  const keyIndex = headers.indexOf(key);
  const rowIndex = findRow_(sh, keyIndex, value);
  if (rowIndex < 0) throw new Error("Row not found: " + value);
  const current = rowObject_(sh, headers, rowIndex);
  const next = Object.assign({}, current, data);
  sh.getRange(rowIndex, 1, 1, headers.length).setValues([headers.map(function (h) { return encodeValue_(next[h]); })]);
  return next;
}

function deleteRow_(name, key, value) {
  const sh = sheet_(name);
  const headers = SHEETS[name];
  const rowIndex = findRow_(sh, headers.indexOf(key), value);
  if (rowIndex < 0) return null;
  const current = rowObject_(sh, headers, rowIndex);
  sh.deleteRow(rowIndex);
  return current;
}

function deleteExpChemical_(id, experimentId, chemicalName) {
  if (id && !experimentId && !chemicalName) {
    const parts = String(id).split("||");
    experimentId = parts[0];
    chemicalName = parts.slice(1).join("||");
  }
  const sh = sheet_("experiment_chemicals");
  const headers = SHEETS.experiment_chemicals;
  const rows = listRows_("experiment_chemicals");
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].experimentId) === String(experimentId) && String(rows[i].chemicalName) === String(chemicalName)) {
      const rowNumber = i + 2;
      const current = rowObject_(sh, headers, rowNumber);
      sh.deleteRow(rowNumber);
      return current;
    }
  }
  return null;
}

function findRow_(sh, zeroBasedColumn, value) {
  if (zeroBasedColumn < 0 || sh.getLastRow() < 2) return -1;
  const values = sh.getRange(2, zeroBasedColumn + 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(value)) return i + 2;
  }
  return -1;
}

function rowObject_(sh, headers, rowNumber) {
  const row = sh.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const obj = {};
  headers.forEach(function (h, i) { obj[h] = decodeValue_(row[i]); });
  return obj;
}

function withId_(data, prefix) {
  const copy = Object.assign({}, data);
  if (!copy.id) copy.id = (prefix || "ID") + "-" + Utilities.getUuid().slice(0, 8);
  return copy;
}

function encodeValue_(value) {
  if (Array.isArray(value) || (value && typeof value === "object")) return JSON.stringify(value);
  return value == null ? "" : value;
}

function decodeValue_(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if ((trimmed[0] === "[" && trimmed[trimmed.length - 1] === "]") || (trimmed[0] === "{" && trimmed[trimmed.length - 1] === "}")) {
    try { return JSON.parse(trimmed); } catch (err) {}
  }
  return value;
}

function recordTransactions_(input) {
  const logs = (input || []).map(function (item) { return withId_(item, "L"); });
  if (!logs.length) throw new Error("출납할 항목이 없습니다.");
  const requestIds = {};
  logs.forEach(function (log) {
    const id = String(log.id);
    if (requestIds[id]) throw new Error("출납 요청에 중복된 기록 ID가 있습니다.");
    requestIds[id] = true;
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const chemicalSheet = sheet_("chemicals");
    const logSheet = sheet_("logs");
    const chemicalHeaders = SHEETS.chemicals;
    const logHeaders = SHEETS.logs;
    const existingLogs = listRows_("logs");
    const existingById = {};
    existingLogs.forEach(function (row) { existingById[String(row.id)] = row; });

    const existingCount = logs.filter(function (log) { return existingById[String(log.id)]; }).length;
    if (existingCount === logs.length) {
      const changedRequest = logs.some(function (log) {
        const existing = existingById[String(log.id)];
        return String(existing.chemicalId) !== String(log.chemicalId)
          || String(existing.type) !== String(log.type)
          || Number(existing.amount) !== Number(log.amount)
          || String(existing.unit) !== String(log.unit)
          || String(existing.user) !== String(log.user)
          || String(existing.purpose) !== String(log.purpose)
          || String(existing.note) !== String(log.note);
      });
      if (changedRequest) throw new Error("같은 출납 요청 ID로 다른 내용이 전송되었습니다. 화면을 새로고침해 주세요.");
      const chemicals = {};
      logs.forEach(function (log) {
        const rowNumber = findRow_(chemicalSheet, chemicalHeaders.indexOf("id"), log.chemicalId);
        if (rowNumber >= 0) chemicals[String(log.chemicalId)] = rowObject_(chemicalSheet, chemicalHeaders, rowNumber);
      });
      return { chemicals: Object.keys(chemicals).map(function (id) { return chemicals[id]; }), logs: logs.map(function (log) { return existingById[String(log.id)]; }) };
    }
    if (existingCount > 0) throw new Error("이미 처리된 출납 기록이 포함되어 있습니다. 화면을 새로고침해 주세요.");

    const originals = {};
    const planned = {};
    const finalLogs = [];
    logs.forEach(function (log) {
      const chemicalId = String(log.chemicalId || "");
      const rowNumber = findRow_(chemicalSheet, chemicalHeaders.indexOf("id"), chemicalId);
      if (!chemicalId || rowNumber < 0) throw new Error("약품을 찾을 수 없습니다: " + chemicalId);
      if (!originals[chemicalId]) {
        originals[chemicalId] = { rowNumber: rowNumber, row: rowObject_(chemicalSheet, chemicalHeaders, rowNumber) };
        planned[chemicalId] = Object.assign({}, originals[chemicalId].row);
      }

      const amount = Number(log.amount);
      const type = String(log.type || "");
      const chemical = planned[chemicalId];
      const stock = Number(chemical.stock || 0);
      if (!isFinite(amount) || amount <= 0) throw new Error("출납 수량은 0보다 커야 합니다.");
      if (!isFinite(stock) || stock < 0) throw new Error(chemical.name + "의 재고 값이 올바르지 않습니다. 시트를 확인해 주세요.");
      if (type !== "in" && type !== "out") throw new Error("출납 유형이 올바르지 않습니다.");
      if (String(log.unit || "") !== String(chemical.unit || "")) throw new Error("약품 기본 단위와 출납 단위가 다릅니다.");
      if (type === "out" && amount > stock) throw new Error(chemical.name + "의 재고가 부족합니다. 현재 재고: " + stock + chemical.unit);

      const nextStock = stock + (type === "in" ? amount : -amount);
      planned[chemicalId] = Object.assign({}, chemical, { stock: nextStock, lastUpdated: String(log.date || new Date().toISOString()).slice(0, 10) });
      finalLogs.push(Object.assign({}, log, { chemicalId: chemicalId, chemicalName: chemical.name, amount: amount, unit: chemical.unit }));
    });

    const writtenLogIds = logs.map(function (log) { return String(log.id); });
    const logStartRow = logSheet.getLastRow() + 1;
    try {
      Object.keys(planned).forEach(function (id) {
        const rowNumber = originals[id].rowNumber;
        chemicalSheet.getRange(rowNumber, 1, 1, chemicalHeaders.length)
          .setValues([chemicalHeaders.map(function (header) { return encodeValue_(planned[id][header]); })]);
      });
      logSheet.getRange(logStartRow, 1, finalLogs.length, logHeaders.length)
        .setValues(finalLogs.map(function (log) { return logHeaders.map(function (header) { return encodeValue_(log[header]); }); }));
    } catch (err) {
      Object.keys(originals).forEach(function (id) {
        const original = originals[id];
        chemicalSheet.getRange(original.rowNumber, 1, 1, chemicalHeaders.length)
          .setValues([chemicalHeaders.map(function (header) { return encodeValue_(original.row[header]); })]);
      });
      const currentLogs = listRows_("logs");
      for (let i = currentLogs.length - 1; i >= 0; i--) {
        if (writtenLogIds.indexOf(String(currentLogs[i].id)) >= 0) logSheet.deleteRow(i + 2);
      }
      throw err;
    }

    return { chemicals: Object.keys(planned).map(function (id) { return planned[id]; }), logs: finalLogs };
  } finally {
    lock.releaseLock();
  }
}

function updateChemical_(id, data) {
  return withScriptLock_(function () {
    const sh = sheet_("chemicals");
    const headers = SHEETS.chemicals;
    const rowNumber = findRow_(sh, headers.indexOf("id"), id);
    if (rowNumber < 0) throw new Error("Row not found: " + id);
    const current = rowObject_(sh, headers, rowNumber);
    const details = Object.assign({}, data, { stock: current.stock });
    return updateRow_("chemicals", "id", id, details);
  });
}

function withScriptLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}
