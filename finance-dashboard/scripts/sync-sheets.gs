/**
 * Finance Dashboard — Google Sheets Sync Script
 *
 * 원본 시트 → _SYNC_ 클론 탭 자동 동기화
 * 대시보드가 _SYNC_ 탭에서 읽으므로 원본을 자유롭게 편집 가능
 *
 * 설치: Extensions → Apps Script → 이 코드 붙여넣기 → syncAll 실행
 * 자동화: createTimeTrigger() 실행 → 5분마다 자동 동기화
 */

const SYNC_PREFIX = '_SYNC_';
const YEAR = new Date().getFullYear();

// ─── 메뉴 ─────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📊 Dashboard Sync')
    .addItem('🔄 전체 동기화', 'syncAll')
    .addSeparator()
    .addItem('Revenue 동기화', 'syncRevenue')
    .addItem('Cash 동기화', 'syncCash')
    .addItem('Income 동기화', 'syncIncome')
    .addItem('AR 동기화', 'syncAR')
    .addItem('YoY 동기화', 'syncYoY')
    .addSeparator()
    .addItem('⏰ 5분 자동동기화 설정', 'createTimeTrigger')
    .addItem('⏹️ 자동동기화 해제', 'removeTimeTrigger')
    .addToUi();
}

function syncAll() {
  const results = [
    syncRevenue(),
    syncCash(),
    syncIncome(),
    syncAR(),
    syncYoY(),
  ];

  const failed = results.filter(r => r.status === 'ERROR');
  if (failed.length > 0) {
    SpreadsheetApp.getUi().alert(
      '동기화 완료 (' + (results.length - failed.length) + '/' + results.length + ' 성공)\n\n' +
      failed.map(r => '❌ ' + r.tab + ': ' + r.message).join('\n')
    );
  } else {
    SpreadsheetApp.getUi().alert('✅ 전체 동기화 완료 (' + results.length + '개 탭)');
  }
}

function syncAllSilent() {
  syncRevenue();
  syncCash();
  syncIncome();
  syncAR();
  syncYoY();
}

// ─── 헬퍼 ─────────────────────────────────────

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(ss.getNumSheets());
  }
  return sheet;
}

function writeSync(tabName, headers, rows, status, message) {
  var sheet = getOrCreateSheet(SYNC_PREFIX + tabName);
  sheet.clear();

  var timestamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

  // Row 1: sync 메타데이터
  sheet.getRange(1, 1, 1, 4).setValues([['_SYNC', status, timestamp, message]]);
  var statusRange = sheet.getRange(1, 1, 1, 4);
  statusRange.setFontWeight('bold');
  statusRange.setBackground(status === 'OK' ? '#d4edda' : '#f8d7da');

  // Row 2: 헤더
  if (headers.length > 0) {
    sheet.getRange(2, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(2, 1, 1, headers.length).setFontWeight('bold').setBackground('#e9ecef');
  }

  // Row 3+: 데이터
  if (rows.length > 0) {
    // 모든 행의 길이를 헤더와 맞춤
    var normalizedRows = rows.map(function(row) {
      var r = row.slice();
      while (r.length < headers.length) r.push('');
      return r.slice(0, headers.length);
    });
    sheet.getRange(3, 1, normalizedRows.length, headers.length).setValues(normalizedRows);
  }

  // 숫자 컬럼에 천단위 콤마 서식 (3번째 열부터)
  if (rows.length > 0 && headers.length > 2) {
    var numRange = sheet.getRange(3, 3, rows.length, headers.length - 2);
    numRange.setNumberFormat('#,##0');
  }

  // 열 너비 자동 조절
  for (var i = 1; i <= Math.min(headers.length, 20); i++) {
    sheet.autoResizeColumn(i);
  }

  return { tab: tabName, status: status, message: message };
}

function readOriginal(sheetName, range) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;
  return sheet.getRange(range).getValues();
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  var cleaned = String(val).replace(/[^0-9.\-]/g, '');
  var num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// ─── Revenue 동기화 ───────────────────────────

function syncRevenue() {
  try {
    var sheetName = YEAR + ' 매출';
    var rows = readOriginal(sheetName, 'A1:T45');
    if (!rows) return writeSync('Revenue', [], [], 'ERROR', '시트 "' + sheetName + '" 없음');

    // 월 헤더 찾기 ("1월" 있는 행)
    var months = [];
    var monthStartCol = 3;

    for (var i = 0; i < rows.length; i++) {
      if (rows[i][monthStartCol] === '1월') {
        for (var c = monthStartCol; c < rows[i].length; c++) {
          var label = String(rows[i][c] || '').trim();
          if (/^\d{1,2}월$/.test(label)) months.push(label);
          else break;
        }
        break;
      }
    }

    if (months.length === 0) {
      return writeSync('Revenue', [], [], 'ERROR', '"1월" 헤더를 찾을 수 없음');
    }

    var headers = ['division', 'category'].concat(months);
    var dataRows = [];
    var currentSegment = '';

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var col1 = String(row[1] || '').trim();
      var col2 = String(row[2] || '').trim();
      var specials = ['소계', '인원수', '인당 매출', '합계'];

      // 사업부명 + 세부항목 행
      if (col1 && col2 && specials.indexOf(col2) === -1) {
        currentSegment = col1;
        var vals = months.map(function(_, m) { return parseNum(row[monthStartCol + m]); });
        dataRows.push([currentSegment, col2].concat(vals));
        continue;
      }

      // 세부항목 행 (division 비어있음)
      if (!col1 && col2 && specials.indexOf(col2) === -1 && currentSegment) {
        var vals = months.map(function(_, m) { return parseNum(row[monthStartCol + m]); });
        dataRows.push([currentSegment, col2].concat(vals));
        continue;
      }

      // 소계 행
      if (col2 === '소계' && currentSegment) {
        var vals = months.map(function(_, m) { return parseNum(row[monthStartCol + m]); });
        dataRows.push([currentSegment, '소계'].concat(vals));

        // 인원수 (다음 행)
        if (rows[i + 1] && String(rows[i + 1][2] || '').trim() === '인원수') {
          var hVals = months.map(function(_, m) { return parseNum(rows[i + 1][monthStartCol + m]); });
          dataRows.push([currentSegment, '인원수'].concat(hVals));
        }

        // 인당 매출 (2행 뒤)
        if (rows[i + 2] && String(rows[i + 2][2] || '').trim() === '인당 매출') {
          var pVals = months.map(function(_, m) { return parseNum(rows[i + 2][monthStartCol + m]); });
          dataRows.push([currentSegment, '인당 매출'].concat(pVals));
        }

        currentSegment = '';
        continue;
      }

      // 합계 행
      if (col2 === '합계') {
        var vals = months.map(function(_, m) { return parseNum(row[monthStartCol + m]); });
        dataRows.push(['전체', '합계'].concat(vals));
      }
    }

    return writeSync('Revenue', headers, dataRows, 'OK',
      dataRows.length + '행, ' + months.length + '개월');
  } catch (e) {
    return writeSync('Revenue', [], [], 'ERROR', e.message);
  }
}

// ─── Cash Position 동기화 ─────────────────────

function syncCash() {
  try {
    var sheetName = YEAR + ' Cash Position Summary';
    var rows = readOriginal(sheetName, 'A1:Z45');
    if (!rows) return writeSync('Cash', [], [], 'ERROR', '시트 "' + sheetName + '" 없음');

    // 월 헤더 (Row 0, col 3+)
    var monthHeaders = [];
    for (var c = 3; c < rows[0].length; c++) {
      var label = String(rows[0][c] || '').trim();
      if (label) monthHeaders.push(label);
    }

    if (monthHeaders.length === 0) {
      return writeSync('Cash', [], [], 'ERROR', '월 헤더를 찾을 수 없음');
    }

    var headers = ['region', 'currency', 'metric'].concat(monthHeaders);
    var dataRows = [];
    var metrics = ['Balance', 'Inflows', 'Outflows', 'Net Change'];

    // 지역 검색 + 4행(Balance~NetChange) 추출
    function findAndAddRegion(searchKey, maxRow, regionLabel, currency) {
      for (var i = 0; i < Math.min(rows.length, maxRow); i++) {
        var col1 = String(rows[i][1] || '').trim();
        var col2 = String(rows[i][2] || '').trim();
        if (col1.indexOf(searchKey) !== -1 && col2 === 'Balance') {
          for (var j = 0; j < metrics.length; j++) {
            if (!rows[i + j]) continue;
            var vals = monthHeaders.map(function(_, m) { return parseNum(rows[i + j][m + 3]); });
            dataRows.push([regionLabel, currency, metrics[j]].concat(vals));
          }
          return true;
        }
      }
      return false;
    }

    // KRW 섹션 (row 0-16)
    findAndAddRegion('Korea', 17, 'Korea', 'KRW');
    findAndAddRegion('U.S.', 17, 'U.S.', 'KRW');
    findAndAddRegion('Vietnam', 17, 'Vietnam', 'KRW');
    findAndAddRegion('Total', 17, 'Total', 'KRW');

    // USD/VND 디테일 + 환율 (row 17+)
    for (var i = 17; i < rows.length; i++) {
      var col1 = String(rows[i][1] || '').trim();
      var col2 = String(rows[i][2] || '').trim();

      if (col1.indexOf('U.S.') !== -1 && col1.indexOf('USD') !== -1 && col2 === 'Balance') {
        var vals = monthHeaders.map(function(_, m) { return parseNum(rows[i][m + 3]); });
        dataRows.push(['U.S.', 'USD', 'Balance'].concat(vals));
      }

      if (col1.indexOf('Vietnam') !== -1 && col1.indexOf('VND') !== -1 && col2 === 'Balance') {
        var vals = monthHeaders.map(function(_, m) { return parseNum(rows[i][m + 3]); });
        dataRows.push(['Vietnam', 'VND', 'Balance'].concat(vals));
      }

      if (col2 === 'exchange rate') {
        var vals = monthHeaders.map(function(_, m) { return parseNum(rows[i][m + 3]); });
        if (col1 === '' && i < 30) {
          dataRows.push(['FX', 'USD/KRW', 'rate'].concat(vals));
        } else if (i > 30) {
          dataRows.push(['FX', 'USD/VND', 'rate'].concat(vals));
        }
      }
    }

    return writeSync('Cash', headers, dataRows, 'OK',
      dataRows.length + '행, ' + monthHeaders.length + '개월');
  } catch (e) {
    return writeSync('Cash', [], [], 'ERROR', e.message);
  }
}

// ─── Income Statement 동기화 ──────────────────

function syncIncome() {
  try {
    var sheetName = YEAR + '년';
    var rows = readOriginal(sheetName, 'A1:V70');
    if (!rows) return writeSync('Income', [], [], 'ERROR', '시트 "' + sheetName + '" 없음');

    // 월 헤더 (Row 3, col 8+) → 정규화: "26. 01." → "1월"
    var monthStartCol = 8;
    var monthLabels = [];
    var headerRow = rows[3] || [];
    for (var c = monthStartCol; c < Math.min(headerRow.length, monthStartCol + 12); c++) {
      var label = String(headerRow[c] || '').trim();
      if (label) monthLabels.push(label);
    }

    var normalizedMonths = monthLabels.map(function(_, i) { return (i + 1) + '월'; });
    var headers = ['type', 'category'].concat(normalizedMonths);
    var dataRows = [];
    var inExpenseSection = false;

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || [];
      var col3 = String(row[3] || '').trim();

      if (col3 === 'Revenue') {
        var vals = normalizedMonths.map(function(_, m) { return parseNum(row[monthStartCol + m]); });
        dataRows.push(['Revenue', ''].concat(vals));
      }

      if (col3 === 'Expenses') {
        var vals = normalizedMonths.map(function(_, m) { return Math.abs(parseNum(row[monthStartCol + m])); });
        dataRows.push(['Expenses', ''].concat(vals));
        inExpenseSection = true;
        continue;
      }

      if (inExpenseSection && col3) {
        if (col3 === 'Net Income' || col3 === 'EBITDA' || col3.indexOf('Net') === 0) {
          // Net Income도 기록
          var vals = normalizedMonths.map(function(_, m) { return parseNum(row[monthStartCol + m]); });
          dataRows.push(['NetIncome', ''].concat(vals));
          inExpenseSection = false;
          continue;
        }
        var vals = normalizedMonths.map(function(_, m) { return Math.abs(parseNum(row[monthStartCol + m])); });
        var total = vals.reduce(function(s, v) { return s + v; }, 0);
        if (total > 0) {
          dataRows.push(['Expense', col3].concat(vals));
        }
      }
    }

    return writeSync('Income', headers, dataRows, 'OK',
      dataRows.length + '행, ' + normalizedMonths.length + '개월');
  } catch (e) {
    return writeSync('Income', [], [], 'ERROR', e.message);
  }
}

// ─── AR (미수금) 동기화 ───────────────────────

function syncAR() {
  try {
    var sheetName = '거래처별 미수금/회수기간 관리표';
    var rows = readOriginal(sheetName, 'A1:R200');
    if (!rows) return writeSync('AR', [], [], 'ERROR', '시트 "' + sheetName + '" 없음');

    var headers = ['month', 'client', 'amount', 'description', 'invoiceDate', 'paymentDate', 'collectionDays', 'note'];
    var dataRows = [];

    for (var i = 4; i < rows.length; i++) {
      var row = rows[i];
      if (!row || row.length < 9) continue;
      if (String(row[4] || '').trim() !== 'Actual') continue;

      var client = String(row[6] || '').trim();
      var amount = parseNum(row[8]);
      if (!client || amount === 0) continue;

      dataRows.push([
        String(row[5] || '').trim(),   // month
        client,                         // client
        amount,                         // amount
        String(row[9] || '').trim(),   // description
        String(row[10] || '').trim(),  // invoiceDate
        String(row[11] || '').trim(),  // paymentDate
        parseNum(row[12]),             // collectionDays
        String(row[16] || '').trim(), // note
      ]);
    }

    return writeSync('AR', headers, dataRows, 'OK', dataRows.length + '건');
  } catch (e) {
    return writeSync('AR', [], [], 'ERROR', e.message);
  }
}

// ─── YoY 비교 동기화 ─────────────────────────

function syncYoY() {
  try {
    var sheetName = '매출비교';
    var rows = readOriginal(sheetName, 'A1:R15');
    if (!rows) return writeSync('YoY', [], [], 'ERROR', '시트 "' + sheetName + '" 없음');

    var headers = ['year', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월', 'total', 'headcount', 'perPerson', 'target'];
    var dataRows = [];

    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      var label = String(row[1] || '').trim();
      if (label.indexOf('매출액') === -1) continue;

      var year = label.replace('년도 매출액', '').trim();
      var monthly = [];
      for (var c = 2; c <= 13; c++) monthly.push(parseNum(row[c]));

      dataRows.push([year].concat(monthly).concat([
        parseNum(row[14]),            // total
        parseNum(row[15]),            // headcount
        parseNum(row[16]),            // perPerson
        row[17] ? parseNum(row[17]) : '', // target
      ]));
    }

    return writeSync('YoY', headers, dataRows, 'OK', dataRows.length + '개 연도');
  } catch (e) {
    return writeSync('YoY', [], [], 'ERROR', e.message);
  }
}

// ─── Web App 엔드포인트 ──────────────────────
// 대시보드에서 HTTP GET으로 동기화 트리거
// 배포: Deploy → New deployment → Web app → Anyone 접근 허용

function doGet() {
  var results = [
    syncRevenue(),
    syncCash(),
    syncIncome(),
    syncAR(),
    syncYoY(),
  ];

  var failed = results.filter(function(r) { return r.status === 'ERROR'; });
  var output = {
    ok: failed.length === 0,
    total: results.length,
    success: results.length - failed.length,
    results: results.map(function(r) { return { tab: r.tab, status: r.status, message: r.message }; }),
    timestamp: Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
  };

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
