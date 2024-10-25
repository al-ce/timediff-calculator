// %% Globals %%
const title = "Time Diff Calculator";
const defaultSubtotal = "---";
const defaultTime = "09:00";
const defaultDate = "2000-01-01";
const defaultX = -0.5;
const defaultY = 6;

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

/**
 * Toggle the adjust by `adjustVarX` for every `adjustVarY` hours flag and
 * update all subtotals and the total.
 **/
function toggleAdjustPerHour() {
	state.adjustPerHour = !state.adjustPerHour;
	timeRows.forEach((v, k, _) => {
		updateTimeDiff("startInput", k);
	});
	updateTotal();
}

/**
 * Focus the first row of the table
 **/
function focusFirstRow() {
	idGet("startInput1").focus();
}

/**
 * Show/hide keymap content
 **/
function toggleKeymapVisibility() {
	const keymapContent = idGet("keymapContent");
	const visible = keymapContent.style.display;
	keymapContent.style.display = visible == "block" ? "none" : "block";
}

// %% Main functionality %%

/**
 * Update the time diff (subtotal) of a timeRow.
 * @param {"startInput" | "endInput"} name Name of input element
 * @param {number} idx Index to identify the timeRow
 **/
function updateTimeDiff(name, idx) {
	const timeRow = timeRows.get(idx);
	const inputElement = idGet(`${name}${idx}`);
	const subtotalCell = idGet(`subtotalCell${idx}`);
	const value = inputElement.value;
	const x = idGet("adjustVarX").value;
	const y = idGet("adjustVarY").value;

	// Re-evaluate whether we should set adjusted-style
	subtotalCell.classList.remove("adjusted");

	if (value == "") {
		subtotalCell.innerText = defaultSubtotal;
		timeRow.diff = 0;
		return;
	}

	timeRow[name] = new Date(`${defaultDate}T${inputElement.value}Z`);
	timeRow.diff = timeRow.endInput - timeRow.startInput;

	// Handle overflows past midnight
	if (timeRow.endInput < timeRow.startInput) {
		timeRow.diff += 24 * 60 * 60 * 1000;
	}

	const hh = Math.floor(timeRow.diff / 1000 / 60 / 60);

	if (state.adjustPerHour && hh >= y) {
		const adjustment = Math.floor(hh / y) * x * 1000 * 60 * 60;
		timeRow.diff += adjustment;
		subtotalCell.classList.add("adjusted");
	}

	let fractionalTime = dateToFraction(timeRow.diff);
	subtotalCell.innerText = twoPad(fractionalTime);
}

/**
 * Update the total cell in the table to reflect the current totals.
 @return {number} The fractional total
 **/
function updateTotal() {
	let total = 0;
	timeRows.forEach((v, _) => {
		total += v.diff;
	});

	let fractional = dateToFraction(total);
	fractional = twoPad(fractional);

	idGet("totalDiv").innerText = fractional;
	return fractional;
}

/**
 * Reset the HTML timeRows table and the timeRows Object.
 **/
function resetTable() {
	idGet("timeRows").replaceChildren([]);
	timeRows = new Map();
	addNewTimeRow();
	updateTotal();
	focusFirstRow();
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
		resetTable();
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

		const subtotalCell = idGet(`subtotalCell${idx}`);
		const isNumber = !isNaN(subtotalCell.innerText);
		if (isNumber && !idGet(`row${parsedId.idx + 1}`)) {
			addNewTimeRow();
		}
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
		const parsedId = parseElementId(button.id);
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

/**
 * A representation of a key to press and the description of its action.
 * @typedef {Object} VimKey
 * @property {!string} key - The key to be pressed
 * @property {?string} display - Optional display character for the key
 * @property {!string} desc - The description of its action
 * @property {!string} cat - The action's category (nav, manipulation, etc.)
 */

/** @typedef {Object} VimKeymap
 * @property {VimKey} decMin - Decrease minutes by 1
 * @property {VimKey} incMin - Increase minutes by 1
 * @property {VimKey} decHour - Decrease hour by 1
 * @property {VimKey} incHour - Increase hour by 1
 * @property {VimKey} middayToggle - toggle AM/PM
 * @property {VimKey} moveUp - Move up a row
 * @property {VimKey} moveDown - Move down a row
 * @property {VimKey} moveLeft - Move left within a row
 * @property {VimKey} moveRight - Move right within a row
 * @property {VimKey} goFirst - Go to the first row
 * @property {VimKey} goLast - Go to the last row
 * @property {VimKey} moveNext - Go to the start of the next row
 * @property {VimKey} newRow - Create a new row
 * @property {VimKey} deleteRow - Delete the currently focused row
 * @property {VimKey} resetTable - Reset the table's content
 * @property {VimKey} clearField - Clear the current input field
 * @property {VimKey} yankTotal - Yank the total to the system clipboard
 * @property {VimKey} yankTable - Yank the total to the system clipboard
 * @property {VimKey} toggleAdjust - Toggle x for y adjustment
 */

class VimActions {
	/**
	 * Create object for adding Vim like keybinds for the page
	 * @class
	 */
	constructor() {
		/** @type {VimKeymap} **/
		this.keymap = {
			moveNext: {
				key: "Enter",
				display: "⏎",
				desc: "move to start of next row",
				cat: "Navigation",

				action: this.navigate,
			},
			moveDown: {
				key: "j",
				desc: "move down a row",
				cat: "Navigation",
				action: this.navigate,
			},
			moveUp: {
				key: "k",
				desc: "move up a row",
				cat: "Navigation",
				action: this.navigate,
			},
			moveLeft: {
				key: "h",
				desc: "move left a field",
				cat: "Navigation",
				action: this.navigate,
			},
			moveRight: {
				key: "l",
				desc: "move right a field",
				cat: "Navigation",
				action: this.navigate,
			},
			goFirst: {
				key: "g",
				desc: "go to first row",
				cat: "Navigation",
				action: this.navigate,
			},
			goLast: {
				key: "G",
				desc: "go to last row",
				cat: "Navigation",
				action: this.navigate,
			},
			decMin: {
				key: "J",
				desc: "decrease by 1 minute",
				cat: "Input",
				action: this.adjustTime,
			},
			incMin: {
				key: "K",
				desc: "increase by 1 minute",
				cat: "Input",
				action: this.adjustTime,
			},
			decHour: {
				key: "H",
				desc: "decrease by 1 hour",
				cat: "Input",
				action: this.adjustTime,
			},
			incHour: {
				key: "L",
				desc: "increase by 1 hour",
				cat: "Input",
				action: this.adjustTime,
			},
			middayToggle: {
				key: "x",
				desc: "toggle AM/PM",
				cat: "Input",
				action: this.adjustTime,
			},
			newRow: {
				key: "n",
				desc: "create a new row",
				cat: "Table",
				action: this.newRow,
			},
			deleteRow: {
				key: "d",
				desc: "delete the current row",
				cat: "Table",
				action: this.deleteRow,
			},
			clearField: {
				key: "c",
				desc: "clear the current input field",
				cat: "Table",
				action: this.clear,
			},
			resetTable: {
				key: "r",
				desc: "reset the table",
				cat: "Table",
				action: this.reset,
			},
			yankTotal: {
				key: "y",
				desc: "yank (copy) the total to the system clipboard",
				cat: "Table",
				action: this.yankTotal,
			},
			yankTable: {
				key: "Y",
				desc: "copy all complete rows in TSV format to the system clipboard",
				cat: "Table",
				action: this.yankTable,
			},
			toggleAdjust: {
				key: "z",
				desc: "toggle adjustments",
				cat: "Misc",
				action: this.toggleAdjust,
			},
			displayKeymap: {
				key: "?",
				desc: "show/hide this keymap",
				cat: "Misc",
				action: this.displayKeymap,
			},
		};
	}

	/**
	 * Set keybinds
	 */
	keymapSet() {
		for (const [_, v] of Object.entries(this.keymap)) {
			document.addEventListener("keydown", (e) => {
				if (e.key == v.key) {
					v.action(e, this.keymap);
				}
			});
		}
	}

	/**
	 * Create a new timeRow
	 */
	newRow() {
		addNewTimeRow();
	}

	/**
	 * Delete a time row
	 */
	deleteRow() {
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
	}

	/**
	 * Clear the focused input field
	 */
	clear() {
		const currNode = document.activeElement;
		currNode.value = "";
		currNode.blur();
		currNode.focus();
		const parsedId = parseElementId(currNode.id);
		updateTimeDiff(parsedId.name, parsedId.idx);
		updateTotal();
	}

	/**
	 * Reset all content
	 */
	reset() {
		resetTable();
	}

	/**
	 * Adjust time minutes or hours by 1 unit, and toggle AM/PM
	 */
	adjustTime(e, keymap) {
		let currNode = document.activeElement;
		if (!currNode || !currNode.classList.contains("timeInput")) {
			return;
		}

		switch (e.key) {
			case keymap.decHour.key:
				currNode.stepDown(60);
				break;
			case keymap.decMin.key:
				currNode.stepDown(1);
				break;
			case keymap.incMin.key:
				currNode.stepUp(1);
				break;
			case keymap.incHour.key:
				currNode.stepUp(60);
				break;
			case keymap.middayToggle.key:
				const hh = currNode.value.match(/(\d+)/)[1];
				let step = Number(hh) < 12 ? 720 : -720;
				currNode.stepUp(step);
				break;
		}

		const event = new Event("input");
		currNode.dispatchEvent(event);
	}

	/**
	 * Navigate to next, previous, first, or last row, or move to next/prev field
	 */
	navigate(e, keymap) {
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
		if (e.key == keymap.moveUp.key) {
			siblingRow = currRow.previousSibling;
		} else if (e.key == keymap.moveDown.key || e.key == keymap.moveNext.key) {
			siblingRow = currRow.nextSibling;
		}
		if (siblingRow) {
			rowIdx = siblingRow.id.match(/row(\d+)/)[1];
		}

		switch (e.key) {
			case keymap.moveNext.key:
				type = startType;
				break;
			case keymap.moveLeft.key:
				type = startType;
				break;
			case keymap.moveDown.key:
				break;
			case keymap.moveUp.key:
				break;
			case keymap.moveRight.key:
				type = endType;
				break;
			case keymap.goFirst.key:
				rowIdx = 1;
				type = startType;
				break;
			case keymap.goLast.key:
				rowIdx = timeRows.size;
				type = startType;
				break;
		}

		idGet(`${type}${rowIdx}`).focus();
	}

	/**
	 * Yank total to the system clipboard.
	 */
	yankTotal() {
		const total = updateTotal();
		navigator.clipboard
			.writeText(total)
			.then(() => {
				console.log("Copy success:", total);
			})
			.catch((err) => {
				console.error("Error copying text: ", err);
			});
	}

	/**
	 * Yank all completed rows as a TSV to the system clipboard.
	 **/
	yankTable() {
		let data = "";
		let startTime, endTime, subtotal;
		timeRows.forEach((v, k, _) => {
			startTime = idGet(`startInput${k}`).value;
			endTime = idGet(`endInput${k}`).value;
			subtotal = dateToFraction(v.diff);
			data += `${startTime}\t${endTime}\t${subtotal}\n`;
		});

		const total = updateTotal();
		data += `\n\t\t${total}`;

		navigator.clipboard
			.writeText(data)
			.then(() => {
				console.log("Copy success:\n\n", data);
			})
			.catch((err) => {
				console.error("Error copying text: ", err);
			});
	}

	/**
	 * Toggle the adjustments flag
	 **/
	toggleAdjust() {
		const adjustCheck = idGet("adjustCheck");
		adjustCheck.click();
	}

	/**
	 * Show/hide the keymap
	 **/
	displayKeymap() {
		toggleKeymapVisibility();
	}
}

// %% Set HTML %%

/**
	Set the HTML content of the keymap guide
	*/
function setKeymapContent(vim) {
	for (const [action, vimKey] of Object.entries(vim.keymap)) {
		const entry = document.createElement("div");
		const keyIcon = document.createElement("span");
		const description = document.createElement("span");

		entry.id = `vim${action.charAt(0).toUpperCase()}${action.slice(1)}`;

		keyIcon.innerText = vimKey.display == null ? vimKey.key : vimKey.display;
		keyIcon.className = "key";

		description.innerText = vimKey.desc;

		entry.append(keyIcon, description);
		entry.className = "keymapEntry";

		idGet(`keyCat${vimKey.cat}`).append(entry);

		// keymapContent.append(entry);
	}
}

// %% On Load %%
document.title = title;

function onLoad() {
	const vim = new VimActions();
	vim.keymapSet();
	setKeymapContent(vim);

	idGet("calcCaption").innerText = title;

	uncheckInputElements();

	idGet("adjustVarX").value = defaultX;
	idGet("adjustVarY").value = defaultY;

	addNewTimeRow();

	focusFirstRow();

	idGet("keymapHeader").addEventListener("click", (e) => {
		toggleKeymapVisibility();
	});

	idGet("adjustCheck").addEventListener("click", (e) => {
		toggleAdjustPerHour(e);
	});

	idGet("resetButton").addEventListener("click", () => {
		resetTable();
	});
}

document.body.onload = onLoad;
