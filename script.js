// %% Globals %%
const title = "Time Diff Calculator";
const defaultSubtotal = "---";
const defaultTime = "09:00";
const defaultDate = "2000-01-01";

/**
 * @typedef {Object} State
 * @property {boolean} adjustPerHour - Adjust calculations by x per y hours
 */

/** @type {State} */
const state = {
  adjustPerHour: false,
};

/**
 * @typedef {Object} TimeRow
 * @property {number} startInput - Start time in milliseconds
 * @property {number} endInput - End time in milliseconds
 * @property {number} diff - Difference between start and end times
 */

/**
 * Creates a new TimeRow Object
 * @return {TimeRow}
 */
function createTimeRow() {
  return {
    startInput: new Date(`${defaultDate}T${defaultTime}Z`),
    endInput: new Date(`${defaultDate}T${defaultTime}Z`),
    diff: 0,
  };
}

/**
 * @typedef {Map<number, TimeRow>} TimeRows
 * @description
 * A Map of numerical indices as keys and TimeRow Objects as values
 */

/** @type {TimeRows} */
let timeRows = new Map();

/** @typedef {Object} ParsedId
 * @description Results of regex parse of an id with format `{name}{index}`
 * @property {string} name - name from parsed id, e.g. "row" parsed from "row1"
 * @property {number} idx - idx from parsed id, e.g. 1 parsed from "row1"
 */

/** @typedef {Object} VimKeymap
 * @property {string} decMin - Decrease minutes by 1
 * @property {string} incMin - Increase minutes by 1
 * @property {string} decHour - Decrease hour by 1
 * @property {string} incHour - Increase hour by 1
 * @property {string} middayToggle - toggle AM/PM
 * @property {string} moveUp - Move up a row
 * @property {string} moveDown - Move down a row
 * @property {string} moveLeft - Move left within a row
 * @property {string} moveRight - Move right within a row
 * @property {string} goFirst - Go to the first row
 * @property {string} goLast - Go to the last row
 * @property {string} newRow - Create a new row
 * @property {string} deleteRow - Delete the currently focused row
 * @property {string} clearField - Clear the current input field
 * @property {string} yankTotal - Yank the total to the system clipboard
 * @property {string} yankTable - Yank the total to the system clipboard
 * @property {string} adjustToggle - Toggle x for y adjustment
 */

/** @type {VimKeymap} **/
const vimKeys = {
  decMin: "J",
  incMin: "K",
  decHour: "H",
  incHour: "L",
  middayToggle: "x",
  moveUp: "k",
  moveDown: "j",
  moveLeft: "h",
  moveRight: "l",
  goFirst: "g",
  goLast: "G",
  newRow: "o",
  deleteRow: "d",
  clearField: "c",
  yankTotal: "y",
  yankTable: "Y",
  adjustToggle: "a",
};

// %% Helpers %%

/**
 * Shorthand for getting an HTMLElement by id
 * @param {string} id Element id
 * @returns {HTMLElement}
 **/
function idGet(id) {
  return document.getElementById(id);
}

/**
 * Pad or truncate a number to two decimal places
 * @param {number} num A Number object
 * @return {number}
 **/
function twoPad(num) {
  return num.toFixed(2);
}

/**
 * Transform a Date object into a number truncated to two decimal places
 * @param {Date} dateObj A Date object
 * @return {number}
 **/
function dateToFraction(dateObj) {
  const mm = Math.floor(dateObj / 1000 / 60) % 60;
  const hh = Math.floor(dateObj / 1000 / 60 / 60);
  const fractionalTime = hh + mm / 60;
  return Math.round(fractionalTime * 100) / 100;
}

/**
 * Uncheck all HTML input elements.
 **/
function uncheckInputElements() {
  const inputs = document.getElementsByTagName("input");
  for (let i = 0; i < inputs.length; i++) {
    inputs[i].checked = false;
  }
}

/**
 * Get an element's row index by parsing its id.
 * @param {!string} id The id of an HTML element to parse.
 * @return {ParsedId} name/idx pair parsed from id
 **/
function parseElementId(id) {
  const matches = id.match(/([A-Za-z]+)(\d+)/);
  const name = matches[1];
  const idx = Number(matches[2]);
  return { name, idx };
}

// %% Main functionality %%

/**
 * Update the time diff (subtotal) of a timeRow.
 * @param {"start" | "end"} name Name of input element
 * @param {number} idx Index to identify the timeRow
 **/
function updateTimeDiff(name, idx) {
  const timeRow = timeRows.get(idx);
  const inputElement = idGet(`${name}${idx}`);
  const subtotalCell = idGet(`subtotalCell${idx}`);
  timeRow[name] = new Date(`${defaultDate}T${inputElement.value}Z`);
  timeRow.diff = timeRow.endInput - timeRow.startInput;

  // Handle overflows past midnight
  if (timeRow.endInput < timeRow.startInput) {
    timeRow.diff += 24 * 60 * 60 * 1000;
  }

  let fractionalTime = dateToFraction(timeRow.diff);
  subtotalCell.innerText = twoPad(fractionalTime);
}

/**
 * Update the total cell in the table to reflect the current totals.
 **/
function updateTotal() {
  let total = 0;
  timeRows.forEach((v, _) => {
    total += v.diff;
  });

  let fractional = dateToFraction(total);
  fractional = twoPad(fractional);

  idGet("totalDiv").innerText = fractional;
}

/**
 * Reset the HTML timeRows table and the timeRows Object.
 **/
function reset() {
  idGet("timeRows").replaceChildren([]);
  timeRows = new Map();
  addNewTimeRow();
  updateTotal();
}

/** Renumber the id of each row and its relevant children sequentially from 1.
 * Useful to keep a regular sequence of ids after deleting a row.
 * Also renumbers the entry keys of the timeRows map.
 **/
function renumberRows() {
  const tableRows = idGet("timeRows");
  let currIdx;
  let parsedRowId;
  const toRename = [
    "deleteCell",
    "deleteButton",
    "startCell",
    "startInput",
    "endCell",
    "endInput",
    "subtotalCell",
  ];
  let newIdx = 1;
  let newTimeRows = new Map();
  for (let row of tableRows.children) {
    parsedRowId = parseElementId(row.id);
    currIdx = parsedRowId.idx;
    row.id = `row${newIdx}`;
    toRename.map((name) => {
      idGet(`${name}${currIdx}`).id = `${name}${newIdx}`;
    });
    newTimeRows.set(newIdx, timeRows.get(Number(currIdx)));
    newIdx++;
  }
  timeRows = newTimeRows;
}

/**
 * Delete a row from the timeRows HTML table and the timeRows Object.
 * @param {number} idx Index to identify the timeRow
 **/
function deleteTimeRow(idx) {
  idx = Number(idx);
  const tableRows = idGet("timeRows");
  const row = idGet(`row${idx}`);

  row.remove();
  timeRows.delete(idx);

  updateTotal();

  if (tableRows.children.length == 0) {
    reset();
  } else {
    renumberRows();
  }

  // Always focus the next available row after deletion
  const size = timeRows.size;
  const targetIdx = size < idx + 1 ? size : idx;
  idGet(`startInput${targetIdx}`).focus();
}

/**
 * Create table cell that contains an input[type="time"] element.
 * @param {('start'|'end')} name Name used for the input element's id
 * @param {number} idx Index used for the input element's id
 * @returns {HTMLTableCellElement}
 **/
function createTimeInputCell(name, idx) {
  /** @type {HTMLTableCellElement} */
  const cell = document.createElement("td");
  /** @type {HTMLInputElement} */
  const input = document.createElement("input");

  cell.id = `${name}Cell${idx}`;
  input.id = `${name}Input${idx}`;
  input.type = "time";
  input.value = "09:00";
  input.classList.add("timeInput");

  input.oninput = function () {
    const parsedId = parseElementId(input.id, null);
    updateTimeDiff(parsedId.name, parsedId.idx);
    updateTotal();
  };

  cell.append(input);
  return cell;
}

/**
 * Create a table cell that contains the timeRow's time difference (subtotal)
 * @param {number} idx Index used for the cell's id
 * @returns {HTMLTableCellElement}
 **/
function createSubtotalCell(idx) {
  /** @type {HTMLTableCellElement} */
  const subtotalCell = document.createElement("td");
  subtotalCell.id = `subtotalCell${idx}`;
  subtotalCell.innerText = defaultSubtotal;
  return subtotalCell;
}

/**
 * Create a table cell that contains a button to delete the timeRow
 * @param {number} idx Index used for the cell's id
 * @returns {HTMLTableCellElement}
 **/
function createDeleteCell(idx) {
  /** @type {HTMLTableCellElement} */
  const cell = document.createElement("td");
  /** @type {HTMLButtonElement} */
  const button = document.createElement("button");

  cell.id = `deleteCell${idx}`;
  button.id = `deleteButton${idx}`;
  button.innerText = defaultSubtotal;
  button.innerText = "🗑 ";
  button.setAttribute("tabindex", "-1");
  button.addEventListener("click", () => {
    const parsedId = parseElementId(button);
    deleteTimeRow(parsedId.idx);
  });

  cell.append(button);
  return cell;
}

/**
 * Add a new row to the `timeRows` table.
 **/
function addNewTimeRow() {
  let idx = timeRows.size + 1;
  const tableRow = document.createElement("tr");

  const deleteCell = createDeleteCell(idx);
  const startCell = createTimeInputCell("start", idx);
  const endCell = createTimeInputCell("end", idx);
  const subtotalCell = createSubtotalCell(idx);

  tableRow.id = `row${idx}`;
  tableRow.append(deleteCell, startCell, endCell, subtotalCell);

  idGet("timeRows").append(tableRow);

  timeRows.set(idx, createTimeRow());
}

// %% Vim-like bindings %%
class VimActions {
  /**
   * Create object for adding Vim like keybinds for the page
   * @class
   */
  constructor() {}

  /**
   * Set keybinds
   */
  keymapSet() {
    this.newRow();
    this.deleteRow();
    this.clear();
    this.adjustTime();
    this.navigate();
  }

  /**
   * Create a new timeRow
   */
  newRow() {
    const key = vimKeys.newRow;
    document.addEventListener("keydown", (e) => {
      if (e.key == key) {
        addNewTimeRow();
      }
    });
  }

  /**
   * Delete a time row
   */
  deleteRow() {
    document.addEventListener("keydown", (e) => {
      if (e.key != vimKeys.deleteRow) {
        return;
      }
      const currEl = document.activeElement.parentNode.parentNode;
      try {
        const parsedId = parseElementId(currEl.id);
        const idx = parsedId.idx;
        const row = idGet(`row${idx}`);
        if (row !== undefined) {
          deleteTimeRow(idx);
        }
      } catch (err) {
        console.log(err);
      }
    });
  }

  /**
   * Clear the focused input field with c
   */
  clear() {
    document.addEventListener("keydown", (e) => {
      if (e.key != vimKeys.clearField) {
        return;
      }
      const currNode = document.activeElement;
      currNode.value = "";
      currNode.blur();
      currNode.focus();
    });
  }

  /**
   * Adjust time with jk  (minutes) hl (hours) or x (AM/PM toggle)
   */
  adjustTime() {
    document.addEventListener("keydown", (e) => {
      const adjustKeys = [
        vimKeys.decHour,
        vimKeys.decMin,
        vimKeys.incMin,
        vimKeys.incHour,
        vimKeys.middayToggle,
      ];
      if (e.altKey || !adjustKeys.includes(e.key)) {
        return;
      }

      let currNode = document.activeElement;
      if (!currNode || !currNode.classList.contains("timeInput")) {
        return;
      }

      switch (e.key) {
        case vimKeys.decHour:
          currNode.stepDown(60);
          break;
        case vimKeys.decMin:
          currNode.stepDown(1);
          break;
        case vimKeys.incMin:
          currNode.stepUp(1);
          break;
        case vimKeys.incHour:
          currNode.stepUp(60);
          break;
        case vimKeys.middayToggle:
          const hh = currNode.value.match(/(\d+)/)[1];
          let step = Number(hh) < 12 ? 720 : -720;
          currNode.stepUp(step);
          break;
      }

      const event = new Event("input");
      currNode.dispatchEvent(event);
    });
  }

  /**
   * Navigate with JK (next/prev row), HL (next/prev input) or gG (first/last start input)
   */
  navigate() {
    // Navigation
    document.addEventListener("keydown", (e) => {
      const navKeys = [
        vimKeys.moveLeft,
        vimKeys.moveDown,
        vimKeys.moveUp,
        vimKeys.moveRight,
        vimKeys.goFirst,
        vimKeys.goLast,
      ];

      if (!navKeys.includes(e.key)) {
        return;
      }

      const startType = "startInput";
      const endType = "endInput";

      let currNode = document.activeElement;

      if (!currNode || !currNode.classList.contains("timeInput")) {
        currNode = idGet(`startInput1`);
      }

      const matches = currNode.id.match(/([A-Za-z]+)(\d+)/);
      let type = matches[1];
      let rowIdx = Number(matches[2]);

      const currRow = idGet(`row${rowIdx}`);
      let siblingRow;
      if (e.key == vimKeys.moveUp) {
        siblingRow = currRow.previousSibling;
      } else if (e.key == vimKeys.moveDown) {
        siblingRow = currRow.nextSibling;
      }
      if (siblingRow) {
        rowIdx = siblingRow.id.match(/row(\d+)/)[1];
      }

      switch (e.key) {
        case vimKeys.moveLeft:
          type = startType;
          break;
        case vimKeys.moveDown:
          break;
        case vimKeys.moveUp:
          break;
        case vimKeys.moveRight:
          type = endType;
          break;
        case vimKeys.goFirst:
          rowIdx = 1;
          type = startType;
          break;
        case vimKeys.goLast:
          rowIdx = timeRows.size;
          type = startType;
          break;
      }

      idGet(`${type}${rowIdx}`).focus();
    });
  }
}

// %% On Load %%
document.title = title;

function onLoad() {
  const vim = new VimActions();
  vim.keymapSet();

  idGet("calcCaption").innerText = title;

  uncheckInputElements();

  addNewTimeRow();

  // Focus first row on initial page load
  idGet("startInput1").focus();
}

document.body.onload = onLoad;
