/**
 * Backend for the survey page.
 * Paste this file into the Apps Script editor of the "Anket yanıtları" Sheet
 * (Extensions > Apps Script) and deploy it as a web app:
 *   Execute as: Me. Who has access: Anyone.
 * The page sends POST requests with a JSON body (Content-Type text/plain).
 */

const SHEET_ID = '1IeALs2aaku-5wezEf0Gi9Rg3v01MOtqRCZ4EDRb5o6s';
const TAB_PEOPLE = 'Katılımcılar';
const TAB_ANSWERS = 'Yanıtlar';
const TAB_SETTINGS = 'Ayarlar';
const FOLDER_NAME = 'Anket ses kayıtları';
const STATE_OPEN = 'açık';
const STATE_LOCKED = 'kilitli';
const MAX_TEXT = 10000;
const MAX_AUDIO_B64 = 20 * 1024 * 1024;

function doGet() {
  return ContentService.createTextOutput('Anket servisi çalışıyor.');
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    out = handle(req);
  } catch (err) {
    out = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}

function handle(req) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const person = findPerson(ss, String(req.token || ''));
  if (!person) {
    return { ok: false, error: 'unknown_token' };
  }
  if (req.action === 'load') {
    return {
      ok: true,
      kod: person.kod,
      tur: person.tur,
      locked: person.durum === STATE_LOCKED,
      answers: readAnswers(ss, person.kod),
    };
  }
  if (req.action === 'getAudio') {
    const row = findAnswerRow(ss, person.kod, Number(req.q));
    const id = row ? fileIdFrom(row.values[6]) : '';
    if (!id) {
      return { ok: false, error: 'no_audio' };
    }
    const blob = DriveApp.getFileById(id).getBlob();
    return { ok: true, mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const fresh = findPerson(ss, String(req.token));
    if (fresh.durum === STATE_LOCKED) {
      return { ok: false, error: 'locked' };
    }
    const q = Number(req.q);
    if (req.action === 'save') {
      const text = String(req.text || '').slice(0, MAX_TEXT);
      upsertAnswer(ss, fresh, q, req, { text: text });
    } else if (req.action === 'audio') {
      const data = String(req.data || '');
      if (data.length > MAX_AUDIO_B64) {
        return { ok: false, error: 'too_large' };
      }
      const mime = String(req.mime || 'audio/webm').split(';')[0];
      const ext = mime.indexOf('mp4') >= 0 || mime.indexOf('aac') >= 0 ? 'm4a' : (mime.indexOf('ogg') >= 0 ? 'ogg' : 'webm');
      const stamp = Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyyMMdd-HHmmss');
      const blob = Utilities.newBlob(Utilities.base64Decode(data), mime, fresh.kod + '-soru' + q + '-' + stamp + '.' + ext);
      const file = audioFolder(ss).createFile(blob);
      const old = findAnswerRow(ss, fresh.kod, q);
      if (old && fileIdFrom(old.values[6])) {
        trashQuietly(fileIdFrom(old.values[6]));
      }
      upsertAnswer(ss, fresh, q, req, { audio: file.getUrl() });
    } else if (req.action === 'deleteAudio') {
      const old = findAnswerRow(ss, fresh.kod, q);
      if (old && fileIdFrom(old.values[6])) {
        trashQuietly(fileIdFrom(old.values[6]));
      }
      upsertAnswer(ss, fresh, q, req, { audio: '' });
    } else if (req.action === 'submit') {
      const now = new Date();
      const sheet = ss.getSheetByName(TAB_PEOPLE);
      sheet.getRange(fresh.row, 3).setValue(STATE_LOCKED);
      sheet.getRange(fresh.row, 5).setValue(now);
      sortAnswers(ss);
    } else {
      return { ok: false, error: 'unknown_action' };
    }
    ss.getSheetByName(TAB_PEOPLE).getRange(fresh.row, 4).setValue(new Date());
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function findPerson(ss, token) {
  if (!token) {
    return null;
  }
  const sheet = ss.getSheetByName(TAB_PEOPLE);
  const last = sheet.getLastRow();
  if (last < 2) {
    return null;
  }
  const rows = sheet.getRange(2, 1, last - 1, 7).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][6]) === token) {
      return { row: i + 2, kod: String(rows[i][0]), tur: String(rows[i][1]), durum: String(rows[i][2]).trim() };
    }
  }
  return null;
}

function readAnswers(ss, kod) {
  const sheet = ss.getSheetByName(TAB_ANSWERS);
  const last = sheet.getLastRow();
  const result = {};
  if (last < 2) {
    return result;
  }
  const rows = sheet.getRange(2, 1, last - 1, 8).getValues();
  rows.forEach(function (r) {
    if (String(r[0]) === kod) {
      result[String(r[2])] = { text: String(r[5] || ''), audio: !!fileIdFrom(r[6]) };
    }
  });
  return result;
}

function findAnswerRow(ss, kod, q) {
  const sheet = ss.getSheetByName(TAB_ANSWERS);
  const last = sheet.getLastRow();
  if (last < 2) {
    return null;
  }
  const rows = sheet.getRange(2, 1, last - 1, 8).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === kod && Number(rows[i][2]) === q) {
      return { row: i + 2, values: rows[i] };
    }
  }
  return null;
}

function upsertAnswer(ss, person, q, req, patch) {
  const sheet = ss.getSheetByName(TAB_ANSWERS);
  const found = findAnswerRow(ss, person.kod, q);
  const values = found ? found.values.slice() : [person.kod, person.tur, q, '', '', '', '', ''];
  values[3] = String(req.section || values[3] || '');
  values[4] = String(req.question || values[4] || '');
  if (patch.text !== undefined) {
    values[5] = patch.text;
  }
  if (patch.audio !== undefined) {
    values[6] = patch.audio;
  }
  values[7] = new Date();
  // Keep text that starts with "=", "+", "-" or "@" as plain text.
  if (/^[=+\-@]/.test(String(values[5]))) {
    values[5] = "'" + values[5];
  }
  if (found) {
    sheet.getRange(found.row, 1, 1, 8).setValues([values]);
  } else {
    sheet.appendRow(values);
  }
}

function sortAnswers(ss) {
  const sheet = ss.getSheetByName(TAB_ANSWERS);
  const last = sheet.getLastRow();
  if (last > 2) {
    sheet.getRange(2, 1, last - 1, 8).sort([{ column: 1, ascending: true }, { column: 3, ascending: true }]);
  }
}

function audioFolder(ss) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('AUDIO_FOLDER_ID');
  if (id) {
    try {
      return DriveApp.getFolderById(id);
    } catch (err) {
      // The folder was deleted. Make a new one.
    }
  }
  const folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('AUDIO_FOLDER_ID', folder.getId());
  ss.getSheetByName(TAB_SETTINGS).getRange('B2').setValue(folder.getUrl());
  return folder;
}

function fileIdFrom(url) {
  const m = String(url || '').match(/\/d\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : '';
}

function trashQuietly(id) {
  try {
    DriveApp.getFileById(id).setTrashed(true);
  } catch (err) {
    // The file is already gone.
  }
}

/** Adds the "Anket" menu to the Sheet. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Anket')
    .addItem('Katılımcı ekle', 'addParticipant')
    .addToUi();
}

function addParticipant() {
  const ui = SpreadsheetApp.getUi();
  const kod = ui.prompt('Katılımcı kodu (örnek: C7). Ad yazma.').getResponseText().trim();
  if (!kod) {
    return;
  }
  const tur = ui.prompt('Tür: uretici, ajans ya da marka').getResponseText().trim().toLowerCase();
  if (['uretici', 'ajans', 'marka'].indexOf(tur) < 0) {
    ui.alert('Tür "uretici", "ajans" ya da "marka" olmalı.');
    return;
  }
  const token = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_PEOPLE);
  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 7).setValues([[kod, tur, STATE_OPEN, '', '', '', token]]);
  sheet.getRange(row, 6).setFormula('=Ayarlar!$B$1&"?t="&G' + row);
  ui.alert('Eklendi. Kişisel link F' + row + ' hücresinde.');
}
