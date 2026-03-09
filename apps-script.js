/**
 * ============================================================
 * Wedding RSVP — Google Apps Script Backend
 * ============================================================
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Open your Google Sheet:
 *    https://docs.google.com/spreadsheets/d/1-rHfd-Nf47nYVXBTEZld3okftBHPd_tDxfh4zRO6lr8/edit
 *
 * 2. Create three tabs (if they don't exist):
 *    - "Guests"  — master guest list
 *    - "Views"   — page view log
 *    - "RSVPs"   — RSVP submissions
 *
 * 3. In the Sheet, go to Extensions → Apps Script
 *
 * 4. Paste this entire file into the script editor (replace any existing code)
 *
 * 5. Deploy:
 *    - Click Deploy → New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Click Deploy
 *    - Copy the Web App URL (you'll use this in rsvp.html)
 *
 * 6. Update APPS_SCRIPT_URL in rsvp.html with your deployment URL
 *
 * 7. After ANY code change, you must create a NEW deployment
 *    (or update the existing one) for changes to take effect.
 *
 * CONFIGURATION:
 */

const CONFIG = {
  SHEET_ID: '1-rHfd-Nf47nYVXBTEZld3okftBHPd_tDxfh4zRO6lr8',
  TAB_GUESTS: 'Guests',
  TAB_VIEWS: 'Views',
  TAB_RSVPS: 'RSVPs',
  SALT: 'jaume-irina-bcn-2026', // Change this to any secret string
};

// ============================================================
// doGet — Log page views + look up guest info
// ============================================================

function doGet(e) {
  try {
    const params = e.parameter || {};
    // v2 - JSONP support added
    const callback = (params.callback || '').replace(/[^a-zA-Z0-9_]/g, '');
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);

    // Log the view
    logView_(ss, params);

    // Look up guest info if ID or names provided
    let guest = null;
    if (params.id) {
      guest = lookupById_(ss, params.id);
    } else if (params.name1 && params.surname1) {
      guest = lookupByName_(ss, params.name1, params.surname1);
    }

    // Check if this is a submitted confirmation redirect
    if (params.submitted === 'true') {
      return jsonResponse_({ status: 'ok', submitted: true, guest: guest }, callback);
    }

    return jsonResponse_({
      status: 'ok',
      guest: guest,
    }, callback);

  } catch (err) {
    return jsonResponse_({ status: 'error', message: err.toString() }, callback);
  }
}

// ============================================================
// doPost — Handle RSVP submissions
// ============================================================

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    let data;

    // Parse the POST body
    if (e.postData && e.postData.type === 'application/json') {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      // Form-encoded fallback
      data = e.parameter;
    } else {
      return jsonResponse_({ status: 'error', message: 'No data received' });
    }

    // Write to RSVPs tab
    const rsvpSheet = ss.getSheetByName(CONFIG.TAB_RSVPS);
    if (!rsvpSheet) {
      return jsonResponse_({ status: 'error', message: 'RSVPs tab not found' });
    }

    const timestamp = new Date().toISOString();

    rsvpSheet.appendRow([
      timestamp,
      data.id || '',
      data.group_label || '',
      data.person1_attending || '',
      data.person1_dietary || '',
      data.person2_attending || '',
      data.person2_dietary || '',
      data.plus_one_name || '',
      data.plus_one_dietary || '',
      data.song_request || '',
      data.message || '',
      JSON.stringify(data),
    ]);

    // Update Guests tab with RSVP status
    if (data.id) {
      updateGuestStatus_(ss, data.id, data, timestamp);
    }

    return jsonResponse_({ status: 'ok', message: 'RSVP received! 🎉' });

  } catch (err) {
    return jsonResponse_({ status: 'error', message: err.toString() });
  }
}

// ============================================================
// Helper: Log a page view
// ============================================================

function logView_(ss, params) {
  const viewSheet = ss.getSheetByName(CONFIG.TAB_VIEWS);
  if (!viewSheet) return;

  const names = [params.name1, params.surname1, params.name2, params.surname2]
    .filter(Boolean)
    .join(' ');

  viewSheet.appendRow([
    new Date().toISOString(),
    params.id || '',
    names || '',
    params.ua || '',  // User agent passed as param (JS can't set headers in no-cors)
    params.source || '',
  ]);
}

// ============================================================
// Helper: Look up guest by opaque ID
// ============================================================

function lookupById_(ss, id) {
  const sheet = ss.getSheetByName(CONFIG.TAB_GUESTS);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === id.trim().toLowerCase()) {
      return rowToGuest_(headers, data[i]);
    }
  }
  return null;
}

// ============================================================
// Helper: Look up guest by name
// ============================================================

function lookupByName_(ss, name1, surname1) {
  const sheet = ss.getSheetByName(CONFIG.TAB_GUESTS);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const n = name1.trim().toLowerCase();
  const s = surname1.trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const pn = String(data[i][2]).trim().toLowerCase(); // person1_name (col C)
    const ps = String(data[i][3]).trim().toLowerCase(); // person1_surname (col D)
    if (pn === n && ps === s) {
      return rowToGuest_(headers, data[i]);
    }
  }
  return null;
}

// ============================================================
// Helper: Convert a row to a guest object
// ============================================================

function rowToGuest_(headers, row) {
  return {
    id: row[0],
    group_label: row[1],
    person1_name: row[2],
    person1_surname: row[3],
    person2_name: row[4] || null,
    person2_surname: row[5] || null,
    email: row[6] || null,
    plus_one_allowed: row[7] === true || row[7] === 'TRUE',
    party_size: row[8] || 1,
    language: row[9] || 'en',
    rsvp_status: row[12] || 'pending',
  };
}

// ============================================================
// Helper: Update guest RSVP status in Guests tab
// ============================================================

function updateGuestStatus_(ss, id, data, timestamp) {
  const sheet = ss.getSheetByName(CONFIG.TAB_GUESTS);
  if (!sheet) return;

  const dataRange = sheet.getDataRange().getValues();
  for (let i = 1; i < dataRange.length; i++) {
    if (String(dataRange[i][0]).trim().toLowerCase() === id.trim().toLowerCase()) {
      const row = i + 1; // 1-indexed

      // Determine overall status
      let status = 'no';
      const p1 = (data.person1_attending || '').toLowerCase();
      const p2 = (data.person2_attending || '').toLowerCase();
      if (p1 === 'yes' && (!data.person2_attending || p2 === 'yes')) {
        status = 'yes';
      } else if (p1 === 'yes' || p2 === 'yes') {
        status = 'partial';
      }

      sheet.getRange(row, 13).setValue(status);     // Column M: rsvp_status
      sheet.getRange(row, 14).setValue(timestamp);  // Column N: rsvp_timestamp
      break;
    }
  }
}

// ============================================================
// Helper: JSON response (handles CORS redirect quirk)
// ============================================================

function jsonResponse_(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// Custom menu: Generate URLs for all guests
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎊 Wedding')
    .addItem('Generate Guest IDs & URLs', 'generateUrls')
    .addToUi();
}

function generateUrls() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.TAB_GUESTS);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Guests tab not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const baseUrl = 'https://irinaijaume.cat/rsvp.html';
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const row = i + 1;
    // Generate ID from row number + salt
    const raw = i + ':' + CONFIG.SALT;
    const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
    const id = hash.map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('').substring(0, 8);

    sheet.getRange(row, 1).setValue(id);  // Column A: id
    sheet.getRange(row, 12).setValue(baseUrl + '?id=' + id);  // Column L: url
    count++;
  }

  SpreadsheetApp.getUi().alert('Generated ' + count + ' URLs! ✨');
}
