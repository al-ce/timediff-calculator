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
 * @property {number} startTime - Start time in milliseconds
 * @property {number} endTime - End time in milliseconds
 * @property {number} diff - Difference between start and end times
 */

/**
 * Creates a new TimeRow Object
 * @return {TimeRow}
 */
function createTimeRow() {
  return {
    startTime: new Date(`${defaultDate}T${defaultTime}Z`),
    endTime: new Date(`${defaultDate}T${defaultTime}Z`),
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
 * Get an array of keys from the timeRow Map object's entries
 **/
function getTimeRowKeys() {
  const entries = Array.from(timeRows.entries());
  return entries.map((el) => {
    return el.at(0);
  });
}

/**
 * Focus either the previous input cell in the timeRows Map given a start
 * index, or the first if one is not specified.
 * @param {start?} number An optional start index
 * @return {number}
 **/
function focusPrevInput(start) {
  start = start == null ? keys.length : start;
  let startInputElement;
  for (; start > 0; start--) {
    startInputElement = idGet(`startInput${start}`);
    if (startInputElement !== null) {
      break;
    }
  }

  if (startInputElement === null) {
    const keys = getTimeRowKeys();
    startInputElement = idGet(`startInput${keys.at(0)}`);
  }

  startInputElement.focus();
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

// %% Main functionality %%

/**
 * Update the time diff (subtotal) of a timeRow.
 * @param {"start" | "end"} name Name of input element
 * @param {number} idx Index to identify the timeRow
 **/
function updateTimeDiff(name, idx) {
  const timeRow = timeRows.get(idx);
  const inputElement = idGet(`${name}Input${idx}`);
  const subtotalCell = idGet(`subtotalCell${idx}`);
  timeRow[`${name}Time`] = new Date(`${defaultDate}T${inputElement.value}Z`);
  timeRow.diff = timeRow.endTime - timeRow.startTime;

  // Handle overflows past midnight
  if (timeRow.endTime < timeRow.startTime) {
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
  }
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
    updateTimeDiff(name, idx);
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
    deleteTimeRow(idx);
  });

  cell.append(button);
  return cell;
}

/**
 * Add a new row to the `timeRows` table.
 **/
function addNewTimeRow() {
  const idx = timeRows.size + 1;
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
class Vim {
  /**
   * Create object for adding Vim like keybinds for the page
   * @class
   */
  constructor() {
    this.keys = {
      newRow: "o",
      delete: "d",
    };
  }

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
   * @param key? Optional `newRow` override
   */
  newRow(key) {
    key = key ? key : this.keys.newRow;
    document.addEventListener("keydown", (e) => {
      if (e.key == key) {
        addNewTimeRow();
      }
    });
  }

  /**
   * Delete a time row
   * @param key? Optional `newRow` override
   */
  deleteRow(key) {
    key = key ? key : this.keys.delete;
    document.addEventListener("keydown", (e) => {
      if (e.key != key) {
        return;
      }
      const currEl = document.activeElement.parentNode.parentNode;
      try {
        const idx = currEl.id.match(/row(\d+)/)[1];
        const row = idGet(`row${idx}`);
        if (row !== undefined) {
          deleteTimeRow(idx);
          focusPrevInput(idx);
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
      if (e.key == "c") {
        const currNode = document.activeElement;
        currNode.value = "";
        currNode.blur();
        currNode.focus();
      }
    });
  }

  /**
   * Adjust time with jk  (minutes) hl (hours) or x (AM/PM toggle)
   */
  adjustTime() {
    document.addEventListener("keydown", (e) => {
      if (!e.altKey && "hjklx".includes(e.key)) {
        let currNode = document.activeElement;
        if (!currNode || !currNode.classList.contains("timeInput")) {
          return;
        }

        switch (e.key) {
          case "h":
            currNode.stepDown(60);
            break;
          case "j":
            currNode.stepDown(1);
            break;
          case "k":
            currNode.stepUp(1);
            break;
          case "l":
            currNode.stepUp(60);
            break;
          case "x":
            const hh = currNode.value.match(/(\d+)/)[1];
            let step = Number(hh) < 12 ? 720 : -720;
            currNode.stepUp(step);
            break;
        }

        const event = new Event("input");
        currNode.dispatchEvent(event);
      }
    });
  }

  /**
   * Navigate with JK (next/prev row), HL (next/prev input) or gG (first/last start input)
   */
  navigate() {
    // Navigation
    document.addEventListener("keydown", (e) => {
      if ("HJKLgG".includes(e.key)) {
        const keys = getTimeRowKeys();
        const startType = "startInput";
        const endType = "endInput";

        let currNode = document.activeElement;

        if (!currNode || !currNode.classList.contains("timeInput")) {
          currNode = idGet(`startInput${keys.at(0)}`);
        }
        const matches = currNode.id.match(/([A-Za-z]+)(\d+)/);
        let type = matches[1];
        let rowIdx = Number(matches[2]);

        const currRow = idGet(`row${rowIdx}`);
        let siblingRow;
        if (e.key == "K") {
          siblingRow = currRow.previousSibling;
        } else if (e.key == "J") {
          siblingRow = currRow.nextSibling;
        }
        if (siblingRow) {
          rowIdx = siblingRow.id.match(/row(\d+)/)[1];
        }

        switch (e.key) {
          case "H":
            type = startType;
            break;
          case "J":
            break;
          case "K":
            break;
          case "L":
            type = endType;
            break;
          case "g":
            rowIdx = keys.at(0);
            type = startType;
            break;
          case "G":
            rowIdx = keys.at(-1);
            type = startType;
            break;
        }

        idGet(`${type}${rowIdx}`).focus();
      }
    });
  }
}

// %% On Load %%
document.title = title;

function onLoad() {
  const vim = new Vim();
  vim.keymapSet();

  idGet("calcCaption").innerText = title;

  uncheckInputElements();

  addNewTimeRow();

  // Focus first row on initial page load
  idGet("startInput1").focus();
}

document.body.onload = onLoad;
