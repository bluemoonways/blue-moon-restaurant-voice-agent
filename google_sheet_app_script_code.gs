/**
 * Blue Moon Restaurant — Vapi Custom Tools webhook
 * Handles multiple tools in one Apps Script Web App:
 *   1. check_table_availability (Vapi tool name: "Table_Availability")
 *   2. book_reservation        (Vapi tool name: "Reservations" or "book_reservation")
 *   3. place_order             (Vapi tool name: "Orders" or "place_order")
 *   4. get_menu                (Vapi tool name: "Menu" or "get_menu")
 *   5. check_order_status      (Vapi tool name: "Order_Status" or "check_order_status")
 *   6. manage_reservation      (Vapi tool name: "Manage_Reservation" or "manage_reservation")
 *      - action: "cancel" -> cancels the reservation, releases the table
 *      - action: "update" -> changes date/time/guests, adjusts table counts
 *   7. manage_order            (Vapi tool name: "Manage_Order" or "manage_order")
 *      - action: "cancel"        -> cancels the order (only if Confirmed/Preparing)
 *      - action: "update_items"  -> changes items/quantities (only if Confirmed/Preparing)
 *   8. get_restaurant_info     (Vapi tool name: "Restaurant_Info" or "get_restaurant_info")
 *
 * SETUP:
 * 1. Open your Google Sheet, copy its ID from the URL:
 *    docs.google.com/spreadsheets/d/THIS_PART/edit
 *    Paste it into SHEET_ID below.
 * 2. Works whether the script is bound (Extensions -> Apps Script,
 *    opened from inside the Sheet) or a standalone project
 *    (script.google.com) — SHEET_ID makes both work the same way.
 * 3. Click "Deploy" -> "New deployment" -> Type: "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. The FIRST time you deploy or run any function here, Google will
 *    ask you to authorize the script (Advanced -> Go to project
 *    (unsafe) -> Allow). Do this once, or every request will get a
 *    403 from Google's own consent screen instead of reaching your code.
 * 5. Copy the generated Web App URL (ends in /exec). This is your
 *    Vapi tools' "Server URL" — use the SAME URL for every tool.
 * 6. Every time you edit this script, create a NEW deployment
 *    (or "Manage deployments" -> edit -> New version) or Vapi will
 *    keep hitting the old code.
 */

// Paste your Google Sheet ID here (from the sheet's URL:
// docs.google.com/spreadsheets/d/THIS_PART/edit)
var SHEET_ID = '1fOpTdU9Mw6tc6UdsMvY6S3esK4uMILFcHtqNtXkigOA';
var AVAILABILITY_SHEET = 'Table_Availability';
var RESERVATIONS_SHEET = 'Reservations';
var MENU_SHEET = 'Menu';
var ORDERS_SHEET = 'Orders';
var RESTAURANT_INFO_SHEET = 'Restaurant_Info';

function doPost(e) {
  var results = [];
  var toolCalls = [];
  try {
    var body = JSON.parse(e.postData.contents);
    toolCalls = (body.message && body.message.toolCallList) || [];

    var ss = SpreadsheetApp.openById(SHEET_ID);

    toolCalls.forEach(function (call) {
      var toolName = call.name || (call.function && call.function.name);
      var rawArgs = call.arguments || (call.function && call.function.arguments) || {};
      var args = rawArgs;
      if (typeof rawArgs === 'string') {
        try {
          args = JSON.parse(rawArgs);
        } catch (parseErr) {
          args = {};
        }
      }
      var callId = call.id || call.toolCallId;
      var resultText;

      Logger.log('Incoming tool call: ' + toolName + ' args: ' + JSON.stringify(args));

      if (toolName === 'Table_Availability' || toolName === 'check_table_availability') {
        var availSheet = ss.getSheetByName(AVAILABILITY_SHEET);
        var availData = availSheet.getDataRange().getValues();
        resultText = checkTableAvailability(args, availData, availData[0]);
      } else if (toolName === 'Reservations' || toolName === 'book_reservation') {
        resultText = bookReservation(args, ss);
      } else if (toolName === 'Orders' || toolName === 'place_order') {
        resultText = placeOrder(args, ss);
      } else if (toolName === 'Menu' || toolName === 'get_menu') {
        resultText = getMenu(args, ss);
      } else if (toolName === 'Order_Status' || toolName === 'check_order_status') {
        resultText = checkOrderStatus(args, ss);
      } else if (toolName === 'Manage_Reservation' || toolName === 'manage_reservation' || toolName === 'Cancel_Reservation' || toolName === 'cancel_reservation') {
        resultText = manageReservation(args, ss);
      } else if (toolName === 'Manage_Order' || toolName === 'manage_order' || toolName === 'Cancel_Order' || toolName === 'cancel_order') {
        resultText = manageOrder(args, ss);
      } else if (toolName === 'Restaurant_Info' || toolName === 'get_restaurant_info') {
        resultText = getRestaurantInfo(args, ss);
      } else {
        resultText = 'Unknown tool: ' + toolName;
      }

      results.push({ toolCallId: callId, result: resultText });
    });
  } catch (err) {
    results.push({ toolCallId: (toolCalls && toolCalls[0] && (toolCalls[0].id || toolCalls[0].toolCallId)) || 'error', result: 'DEBUG_ERROR: ' + err.message + ' | stack: ' + err.stack });
  }

  return ContentService
    .createTextOutput(JSON.stringify({ results: results }))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkTableAvailability(args, data, headers) {
  var dateIdx = headers.indexOf('date');
  var timeIdx = headers.indexOf('time');
  var availIdx = headers.indexOf('available_tables');

  if (!args.date || !args.time) {
    return 'Please provide both a date (YYYY-MM-DD) and a time (HH:MM) to check availability.';
  }

  var reqDate = normalizeDate(args.date);
  var reqTime = normalizeTime(args.time);

  Logger.log('Looking for date="' + reqDate + '" time="' + reqTime + '"');

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowDate = normalizeDate(row[dateIdx]);
    var rowTime = normalizeTime(row[timeIdx]);

    Logger.log('Row ' + i + ': date="' + rowDate + '" time="' + rowTime + '"');

    if (rowDate === reqDate && rowTime === reqTime) {
      var avail = Number(row[availIdx]) || 0;
      if (avail > 0) {
        return 'Yes, ' + avail + ' table(s) are available on ' + reqDate + ' at ' + reqTime + '.';
      } else {
        return 'Sorry, no tables are available on ' + reqDate + ' at ' + reqTime + '. Would you like another time?';
      }
    }
  }

  return 'We have no availability record for ' + reqDate + ' at ' + reqTime + '. Please try a different date or time.';
}

function bookReservation(args, ss) {
  if (!args.date || !args.time) {
    return 'Please provide both a date (YYYY-MM-DD) and a time (HH:MM) for the reservation.';
  }
  if (!args.customer_name || !args.phone || !args.guests) {
    return 'To complete the booking I need the customer name, phone number, and number of guests.';
  }

  var reqDate = normalizeDate(args.date);
  var reqTime = normalizeTime(args.time);

  var availSheet = ss.getSheetByName(AVAILABILITY_SHEET);
  var availData = availSheet.getDataRange().getValues();
  var availHeaders = availData[0];
  var dateIdx = availHeaders.indexOf('date');
  var timeIdx = availHeaders.indexOf('time');
  var tablesIdx = availHeaders.indexOf('available_tables');

  var matchRow = -1;
  for (var i = 1; i < availData.length; i++) {
    if (normalizeDate(availData[i][dateIdx]) === reqDate && normalizeTime(availData[i][timeIdx]) === reqTime) {
      matchRow = i;
      break;
    }
  }

  if (matchRow === -1) {
    return 'Sorry, we have no availability record for ' + reqDate + ' at ' + reqTime + '. Please choose a different date or time.';
  }

  var currentAvail = Number(availData[matchRow][tablesIdx]) || 0;
  if (currentAvail <= 0) {
    return 'Sorry, there are no tables available on ' + reqDate + ' at ' + reqTime + '. Would you like a different time?';
  }

  var resSheet = ss.getSheetByName(RESERVATIONS_SHEET);
  var resData = resSheet.getDataRange().getValues();
  var resHeaders = resData[0];
  var newId = 'RES' + ('000' + resData.length).slice(-3); // header row counts as 0, so first booking = RES001

  var targetRow = resSheet.getLastRow() + 1;
  var phoneColNum = resHeaders.indexOf('phone') + 1;

  // Write the row with a blank phone first, then force the phone cell to
  // Plain Text format BEFORE writing the value — this stops Google Sheets
  // from auto-converting a leading-zero number (e.g. 03001234567) into
  // 3001234567 and silently dropping the 0.
  resSheet.getRange(targetRow, 1, 1, resHeaders.length).setValues([[
    newId, args.customer_name, '', reqDate, reqTime, args.guests, 'Confirmed'
  ]]);
  var phoneCell = resSheet.getRange(targetRow, phoneColNum);
  phoneCell.setNumberFormat('@');
  phoneCell.setValue(String(args.phone));

  // Reduce available_tables by 1 (row index +1 because getRange is 1-based, matchRow already skips header via loop start at 1)
  availSheet.getRange(matchRow + 1, tablesIdx + 1).setValue(currentAvail - 1);

  return 'Your reservation is confirmed! Reservation ID ' + newId + ' for ' + args.guests + ' guest(s) on ' + reqDate + ' at ' + reqTime + '. We look forward to seeing you, ' + args.customer_name + '.';
}

function computeOrderLines(items, ss) {
  var menuSheet = ss.getSheetByName(MENU_SHEET);
  var menuData = menuSheet.getDataRange().getValues();
  var menuHeaders = menuData[0];
  var nameIdx = menuHeaders.indexOf('item_name');
  var priceIdx = menuHeaders.indexOf('price');

  var priceMap = {};
  for (var m = 1; m < menuData.length; m++) {
    priceMap[String(menuData[m][nameIdx]).trim().toLowerCase()] = Number(menuData[m][priceIdx]) || 0;
  }

  var total = 0;
  var lineDescriptions = [];
  var notFound = [];

  for (var k = 0; k < items.length; k++) {
    var reqItem = items[k];
    var itemName = String(reqItem.item_name || '').trim();
    var qty = Number(reqItem.quantity) || 1;
    var key = itemName.toLowerCase();

    if (!(key in priceMap)) {
      notFound.push(itemName);
      continue;
    }

    total += priceMap[key] * qty;
    lineDescriptions.push(qty + ' ' + itemName);
  }

  return { total: total, summary: lineDescriptions.join(' + '), notFound: notFound };
}

function placeOrder(args, ss) {
  if (!args.customer_name) {
    return 'Please provide the customer name for the order.';
  }
  if (!args.items || !Array.isArray(args.items) || args.items.length === 0) {
    return 'Please tell me which menu items and quantities you would like to order.';
  }

  var lines = computeOrderLines(args.items, ss);

  if (lines.notFound.length > 0) {
    return "Sorry, these items aren't on our menu: " + lines.notFound.join(', ') + '. Could you please confirm the correct item names?';
  }

  var ordersSheet = ss.getSheetByName(ORDERS_SHEET);
  var ordersData = ordersSheet.getDataRange().getValues();
  var idIdx = ordersData[0].indexOf('order_id');

  // Existing IDs look like "BM1001" — find the highest number and add 1
  var maxNum = 1000;
  for (var o = 1; o < ordersData.length; o++) {
    var idStr = String(ordersData[o][idIdx] || '');
    var num = parseInt(idStr.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  var newOrderId = 'BM' + (maxNum + 1);

  ordersSheet.appendRow([newOrderId, args.customer_name, lines.summary, lines.total, 'Confirmed']);

  return 'Your order is confirmed! Order ID ' + newOrderId + ': ' + lines.summary + '. Total: PKR ' + lines.total + '. Thank you, ' + args.customer_name + '!';
}

function getMenu(args, ss) {
  var menuSheet = ss.getSheetByName(MENU_SHEET);
  var menuData = menuSheet.getDataRange().getValues();
  var headers = menuData[0];
  var nameIdx = headers.indexOf('item_name');
  var categoryIdx = headers.indexOf('category');
  var priceIdx = headers.indexOf('price');

  var categoryFilter = args && args.category ? String(args.category).trim().toLowerCase() : null;

  var byCategory = {};
  for (var i = 1; i < menuData.length; i++) {
    var row = menuData[i];
    var category = String(row[categoryIdx] || 'Other');

    if (categoryFilter && category.toLowerCase().indexOf(categoryFilter) === -1) {
      continue;
    }

    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(row[nameIdx] + ' (PKR ' + row[priceIdx] + ')');
  }

  var categories = Object.keys(byCategory);
  if (categories.length === 0) {
    return categoryFilter
      ? "We don't have any items in the '" + args.category + "' category. Would you like to hear the full menu instead?"
      : 'The menu is currently empty.';
  }

  var parts = categories.map(function (cat) {
    return cat + ': ' + byCategory[cat].join(', ');
  });

  return 'Here is our menu — ' + parts.join('. ') + '.';
}

function checkOrderStatus(args, ss) {
  if (!args || (!args.order_id && !args.customer_name)) {
    return "Please provide the order ID, or the customer name it was placed under, so I can check the status.";
  }

  var ordersSheet = ss.getSheetByName(ORDERS_SHEET);
  var data = ordersSheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('order_id');
  var nameIdx = headers.indexOf('customer_name');
  var itemsIdx = headers.indexOf('items');
  var totalIdx = headers.indexOf('total');
  var statusIdx = headers.indexOf('status');

  var match = null;

  if (args.order_id) {
    var reqId = String(args.order_id).trim().toLowerCase();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]).trim().toLowerCase() === reqId) {
        match = data[i];
        break;
      }
    }
    if (!match) {
      return "I couldn't find any order with ID " + args.order_id + ". Could you please double-check the order number?";
    }
  } else {
    var reqName = String(args.customer_name).trim().toLowerCase();
    // Search from the bottom so we return the customer's most recent order
    for (var j = data.length - 1; j >= 1; j--) {
      if (String(data[j][nameIdx]).trim().toLowerCase() === reqName) {
        match = data[j];
        break;
      }
    }
    if (!match) {
      return "I couldn't find any orders under the name " + args.customer_name + ". Could you please confirm the order ID instead?";
    }
  }

  return 'Order ' + match[idIdx] + ' for ' + match[nameIdx] + ' (' + match[itemsIdx] + ', total PKR ' + match[totalIdx] + ') is currently: ' + match[statusIdx] + '.';
}

// Reads current available_tables count for a date/time slot. Returns null if no record exists.
function getAvailableCount(ss, date, time) {
  var availSheet = ss.getSheetByName(AVAILABILITY_SHEET);
  var availData = availSheet.getDataRange().getValues();
  var headers = availData[0];
  var dateIdx = headers.indexOf('date');
  var timeIdx = headers.indexOf('time');
  var tablesIdx = headers.indexOf('available_tables');

  for (var i = 1; i < availData.length; i++) {
    if (normalizeDate(availData[i][dateIdx]) === date && normalizeTime(availData[i][timeIdx]) === time) {
      return Number(availData[i][tablesIdx]) || 0;
    }
  }
  return null;
}

// Adds delta (+1 to release, -1 to take) to available_tables for a date/time slot.
// Returns true if a matching slot was found and updated.
function adjustTableCount(ss, date, time, delta) {
  var availSheet = ss.getSheetByName(AVAILABILITY_SHEET);
  var availData = availSheet.getDataRange().getValues();
  var headers = availData[0];
  var dateIdx = headers.indexOf('date');
  var timeIdx = headers.indexOf('time');
  var tablesIdx = headers.indexOf('available_tables');

  for (var i = 1; i < availData.length; i++) {
    if (normalizeDate(availData[i][dateIdx]) === date && normalizeTime(availData[i][timeIdx]) === time) {
      var current = Number(availData[i][tablesIdx]) || 0;
      availSheet.getRange(i + 1, tablesIdx + 1).setValue(current + delta);
      return true;
    }
  }
  return false;
}

function manageReservation(args, ss) {
  if (!args || !args.reservation_id) {
    return 'Please provide the reservation ID.';
  }
  if (!args.action) {
    return "Please specify what you'd like to do: cancel the reservation, or update its date, time, or guest count.";
  }

  var resSheet = ss.getSheetByName(RESERVATIONS_SHEET);
  var resData = resSheet.getDataRange().getValues();
  var headers = resData[0];
  var idIdx = headers.indexOf('reservation_id');
  var dateIdx = headers.indexOf('date');
  var timeIdx = headers.indexOf('time');
  var guestsIdx = headers.indexOf('guests');
  var statusIdx = headers.indexOf('status');

  var reqId = String(args.reservation_id).trim().toLowerCase();
  var rowNum = -1;

  for (var i = 1; i < resData.length; i++) {
    if (String(resData[i][idIdx]).trim().toLowerCase() === reqId) {
      rowNum = i;
      break;
    }
  }

  if (rowNum === -1) {
    return "I couldn't find a reservation with ID " + args.reservation_id + '. Could you please double-check it?';
  }

  var currentStatus = String(resData[rowNum][statusIdx]).trim();
  if (currentStatus.toLowerCase() === 'cancelled') {
    return 'Reservation ' + args.reservation_id + ' is already cancelled.';
  }

  var oldDate = normalizeDate(resData[rowNum][dateIdx]);
  var oldTime = normalizeTime(resData[rowNum][timeIdx]);
  var action = String(args.action).trim().toLowerCase();

  if (action === 'cancel') {
    resSheet.getRange(rowNum + 1, statusIdx + 1).setValue('Cancelled');
    adjustTableCount(ss, oldDate, oldTime, 1);
    return 'Reservation ' + args.reservation_id + ' has been cancelled. The table has been released back for ' + oldDate + ' at ' + oldTime + '.';
  }

  if (action === 'update') {
    var newDate = args.date ? normalizeDate(args.date) : oldDate;
    var newTime = args.time ? normalizeTime(args.time) : oldTime;
    var newGuests = args.guests ? Number(args.guests) : resData[rowNum][guestsIdx];
    var slotChanged = (newDate !== oldDate) || (newTime !== oldTime);

    if (slotChanged) {
      var newSlotCount = getAvailableCount(ss, newDate, newTime);
      if (newSlotCount === null) {
        return 'We have no availability record for ' + newDate + ' at ' + newTime + '. Please choose a different date or time.';
      }
      if (newSlotCount <= 0) {
        return 'Sorry, there are no tables available on ' + newDate + ' at ' + newTime + '. Would you like a different time?';
      }
      // Release the old slot, take the new slot
      adjustTableCount(ss, oldDate, oldTime, 1);
      adjustTableCount(ss, newDate, newTime, -1);
    }

    resSheet.getRange(rowNum + 1, dateIdx + 1).setValue(newDate);
    resSheet.getRange(rowNum + 1, timeIdx + 1).setValue(newTime);
    resSheet.getRange(rowNum + 1, guestsIdx + 1).setValue(newGuests);

    return 'Reservation ' + args.reservation_id + ' has been updated: ' + newGuests + ' guest(s) on ' + newDate + ' at ' + newTime + '.';
  }

  return "I didn't understand that action. Please say whether you'd like to cancel the reservation or update it.";
}

function manageOrder(args, ss) {
  if (!args || !args.order_id) {
    return 'Please provide the order ID.';
  }
  if (!args.action) {
    return "Please specify what you'd like to do with this order: cancel it, or update the items.";
  }

  var ordersSheet = ss.getSheetByName(ORDERS_SHEET);
  var data = ordersSheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf('order_id');
  var itemsIdx = headers.indexOf('items');
  var totalIdx = headers.indexOf('total');
  var statusIdx = headers.indexOf('status');

  var reqId = String(args.order_id).trim().toLowerCase();
  var rowNum = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]).trim().toLowerCase() === reqId) {
      rowNum = i;
      break;
    }
  }

  if (rowNum === -1) {
    return "I couldn't find an order with ID " + args.order_id + '. Could you please double-check it?';
  }

  var currentStatus = String(data[rowNum][statusIdx]).trim();
  var statusLower = currentStatus.toLowerCase();

  if (statusLower === 'cancelled') {
    return 'Order ' + args.order_id + ' is already cancelled.';
  }

  var cancellableStatuses = ['confirmed', 'preparing'];
  var isEditable = cancellableStatuses.indexOf(statusLower) !== -1;

  var action = String(args.action).trim().toLowerCase();

  if (action === 'cancel') {
    if (!isEditable) {
      return 'Sorry, order ' + args.order_id + ' is already "' + currentStatus + '" and can no longer be cancelled. Orders can only be cancelled while still Confirmed or Preparing. Please contact the restaurant directly if you need help.';
    }
    ordersSheet.getRange(rowNum + 1, statusIdx + 1).setValue('Cancelled');
    return 'Order ' + args.order_id + ' has been cancelled successfully.';
  }

  if (action === 'update_items') {
    if (!isEditable) {
      return 'Sorry, order ' + args.order_id + ' is already "' + currentStatus + '" and its items can no longer be changed. Please contact the restaurant directly if you need help.';
    }
    if (!args.items || !Array.isArray(args.items) || args.items.length === 0) {
      return 'Please tell me the new items and quantities for this order.';
    }

    var lines = computeOrderLines(args.items, ss);
    if (lines.notFound.length > 0) {
      return "Sorry, these items aren't on our menu: " + lines.notFound.join(', ') + '. Could you please confirm the correct item names?';
    }

    ordersSheet.getRange(rowNum + 1, itemsIdx + 1).setValue(lines.summary);
    ordersSheet.getRange(rowNum + 1, totalIdx + 1).setValue(lines.total);

    return 'Order ' + args.order_id + ' has been updated to: ' + lines.summary + '. New total: PKR ' + lines.total + '.';
  }

  return "I didn't understand that action. Please say whether you'd like to cancel the order or update its items.";
}

function getRestaurantInfo(args, ss) {
  var infoSheet = ss.getSheetByName(RESTAURANT_INFO_SHEET);
  var data = infoSheet.getDataRange().getValues();
  var headers = data[0];
  var fieldIdx = headers.indexOf('field');
  var valueIdx = headers.indexOf('value');

  var info = {};
  for (var i = 1; i < data.length; i++) {
    info[String(data[i][fieldIdx]).trim().toLowerCase()] = data[i][valueIdx];
  }

  if (args && args.field) {
    var key = String(args.field).trim().toLowerCase();
    if (key in info) {
      return args.field + ': ' + info[key];
    }
    return "I don't have information on '" + args.field + "'. I can tell you our name, location, phone number, opening hours, or cuisine.";
  }

  return 'Blue Moon Restaurant is located at ' + (info['location'] || 'N/A') + '. Phone: ' + (info['phone'] || 'N/A') +
    '. Open from ' + (info['opening_time'] || 'N/A') + ' to ' + (info['closing_time'] || 'N/A') +
    '. We serve ' + (info['cuisine'] || 'N/A') + ' cuisine.';
}

// Handles both real Date objects (Sheets auto-converts date/time columns)
// and plain text, so the script works regardless of column formatting.
function normalizeDate(d) {
  if (Object.prototype.toString.call(d) === '[object Date]') {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(d).trim();
}

function normalizeTime(t) {
  if (Object.prototype.toString.call(t) === '[object Date]') {
    return Utilities.formatDate(t, Session.getScriptTimeZone(), 'HH:mm');
  }
  return String(t).trim().substring(0, 5);
}

// Quick manual tests in the Apps Script editor (Run -> testCheck / testBook)
function testCheck() {
  var availSheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(AVAILABILITY_SHEET);
  var data = availSheet.getDataRange().getValues();
  Logger.log(checkTableAvailability({ date: '2026-09-10', time: '19:00' }, data, data[0]));
}

function testBook() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log(bookReservation({
    customer_name: 'Test Customer',
    phone: '03001234567',
    date: '2026-09-10',
    time: '19:00',
    guests: 2
  }, ss));
}

function testOrder() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log(placeOrder({
    customer_name: 'Test Customer',
    items: [
      { item_name: 'Chicken Biryani', quantity: 2 },
      { item_name: 'Fresh Lime', quantity: 1 }
    ]
  }, ss));
}

function testMenu() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log(getMenu({}, ss));
}

function testOrderStatus() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log(checkOrderStatus({ order_id: 'BM1001' }, ss));
}

function testCancelReservation() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log(manageReservation({ reservation_id: 'R001', action: 'cancel' }, ss));
}

function testUpdateReservation() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log(manageReservation({
    reservation_id: 'R001',
    action: 'update',
    date: '2026-09-11',
    time: '20:00',
    guests: 4
  }, ss));
}

function testCancelOrder() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log(manageOrder({ order_id: 'BM1004', action: 'cancel' }, ss));
}

function testUpdateOrderItems() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log(manageOrder({
    order_id: 'BM1004',
    action: 'update_items',
    items: [{ item_name: 'Chicken Chow Mein', quantity: 3 }]
  }, ss));
}

function testRestaurantInfo() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  Logger.log(getRestaurantInfo({}, ss));
}
