/*** Copyright 2016 Johannes Kessler 2016 Johannes Kessler
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as i18n from 'i18next';
import { Column } from './Column';
import { RANode, RANodeUnary, Session } from './RANode';
import { DataType, Schema } from './Schema';
import { Table, Tuple } from './Table';
import { ValueExpr, ValueExprColumnValue } from './ValueExpr';


export interface GroupByCol {
	name: string | number,
	relAlias: string | null,
}

export interface AggregateFunction {
	name: string | number,
	aggFunction: string,
	col: ValueExpr | null,
}


/**
 * relational algebra group-by operator
 *
 * @extends RANode
 * @constructor
 * @param   {RANode}  child              the child expression
 * @param   {Array}   groupByCols        Array of {name, relAlias} objects
 * @param   {Array}   aggregateFunctions Array of {aggFunction, col{name, relAlias}} objects
 * @returns {GroupBy}
 */
export class GroupBy extends RANodeUnary {
	private groupByCols: GroupByCol[];
	private aggregateFunctions: AggregateFunction[];

	private checked: {
		schema: Schema,
		aggregateFunctionsExpr: (ValueExpr | null)[],
		groupByColumnIndices: number[],
	} | null = null;

	constructor(child: RANode, groupByCols: GroupByCol[], aggregateFunctions: AggregateFunction[]) {
		super('&gamma;', 'relalg-operations-groupby', child);

		this.groupByCols = groupByCols;
		this.aggregateFunctions = aggregateFunctions;
	}

	getSchema() {
		if (this.checked === null) {
			throw new Error(`check not called`);
		}
		return this.checked.schema;
	}

	check() {
		this._child.check();
		const childSchema = this._child.getSchema();

		const groupByColumnIndices = new Array<number>(this.groupByCols.length);
		const aggregateFunctionsExpr = new Array<ValueExpr | null>(this.aggregateFunctions.length);

		// Get relation aliases
		const relAliases = this._child.getMetaData('fromVariable');
		// Split relation aliases into array
		const vars = relAliases ? relAliases.split(" ") : [];

		for (let i = 0; i < this.groupByCols.length; i++) {
			let index = -1;
			const iSchema = vars.indexOf(this.groupByCols[i].relAlias + '');

			if (iSchema >= 0) {
				let j = 0, k = 0;
				// Set first relation alias
				let lastAlias = childSchema.getColumn(j).getRelAlias();
				// Check if relation alias already found
				let found = false;
				for (; j < childSchema.getSize(); j++) {
					// Check if relation alias changed
					if (childSchema.getColumn(j).getRelAlias() !== lastAlias) {
						lastAlias = childSchema.getColumn(j).getRelAlias();
						if (k < vars.length - 1) k++;
					}

					// Check if column name and relation alias match
					if (childSchema.getColumn(j).getName() === this.groupByCols[i].name &&
					  k === iSchema) {

						// Column name and alias found previously
						if (found) {
							throw new Error(i18n.t('db.messages.exec.error-column-ambiguous', {
								column: Column.printColumn(
									this.groupByCols[i].name,
									this.groupByCols[i].relAlias
								),
								schema: childSchema,
							}));
						}

						// Set index
						index = j;
						found = true;
					}
				}

				// Throw error if column not found
				if (index === -1) {
					// Column not found
					try {
						childSchema.getColumnIndex(
							this.groupByCols[i].name,
							this.groupByCols[i].relAlias);
					}
					catch (e) {
						this.throwExecutionError(e.message);
					}
				}
			}
			else {
				// default case
				try {
					index = childSchema.getColumnIndex(
						this.groupByCols[i].name,
						this.groupByCols[i].relAlias
					);
				}
				catch (e) {
					this.throwExecutionError(e.message);
				}
			}

			groupByColumnIndices[i] = index;
		}

		for (let i = 0; i < this.aggregateFunctions.length; i++) {
			const f = this.aggregateFunctions[i];

			switch (f.aggFunction) {
				case 'COUNT_ALL':
				case 'COUNT':
				case 'SUM':
				case 'AVG':
				case 'MIN':
				case 'MAX':
					break;
				default:
					throw new Error('should not happen; unknown aggregate function');
			}

			if (f.aggFunction === 'COUNT_ALL') {
				aggregateFunctionsExpr[i] = null;
				continue;
			}

			if (!f.col) {
				throw new Error('should not happen; aggregate function has no argument');
			}

			let expr: ValueExpr;
			if (typeof (f.col as any).check === 'function' && typeof (f.col as any).evaluate === 'function') {
				expr = f.col as ValueExpr;
			}
			else {
				const c = f.col as any;
				expr = new ValueExprColumnValue(c.name, c.relAlias);
			}

			// check expression against child schema
			expr.check(childSchema);

			aggregateFunctionsExpr[i] = expr;
		}

		// create new Schema
		const schema = new Schema();
		for (let i = 0; i < groupByColumnIndices.length; i++) {
			schema.addColumn2(childSchema.getColumn(groupByColumnIndices[i]));
		}
		for (let i = 0; i < this.aggregateFunctions.length; i++) {
			const func = this.aggregateFunctions[i];
			let type: DataType;

			switch (func.aggFunction) {
				case 'MIN':
				case 'MAX': {
					const expr = aggregateFunctionsExpr[i];
					if (!expr) {
						throw new Error('missing expression for aggregate function');
					}
					type = expr.getDataType();
					break;
				}
				case 'SUM':
				case 'AVG': {
					const expr = aggregateFunctionsExpr[i];
					if (!expr) {
						throw new Error('missing expression for aggregate function');
					}
					const colType = expr.getDataType();
					if (colType !== 'number') {
						this.throwExecutionError(i18n.t('db.messages.exec.error-func-not-defined-for-column-type', {
							func: func.aggFunction,
							colType,
						}));
					}
					type = colType;
					break;
				}
				case 'COUNT_ALL':
				case 'COUNT':
					type = 'number';
					break;
				default:
					throw new Error('unknown aggregate function ' + func.aggFunction);
			}
			schema.addColumn(func.name, null, type);
		}

		this.checked = {
			schema,
			aggregateFunctionsExpr,
			groupByColumnIndices,
		};
	}

	getArgumentHtml() {
		const group = this.groupByCols.map(col => {
			return Column.printColumn(col.name, col.relAlias);
		});

		const agg = this.aggregateFunctions.map(func => {
			const arg = func.aggFunction === 'COUNT_ALL'
				? '*'
				: (func.col && typeof (func.col as any).getFormulaHtml === 'function'
					? (func.col as any).getFormulaHtml()
					: Column.printColumn((func.col as any)?.name, (func.col as any)?.relAlias));
			const s = `${func.aggFunction}(${arg})`;
			return `${s}→${func.name}`;
		});

		return `${group.join(', ')}; ${agg.join(', ')}`;
	}


	getResult(doEliminateDuplicateRows: boolean = true, session?: Session) {
		session = this._returnOrCreateSession(session);

		if (this.checked === null) {
			throw new Error(`check not called`);
		}

		const org = this.getChild().getResult(doEliminateDuplicateRows, session);
		const res = new Table();
		res.setSchema(this.checked.schema);

		const hasGroupCols = this.groupByCols.length > 0;
		let groupsOfRows; // might be sparsely filled
		let numberOfGroups = 0; // === number of rows in result table

		if (hasGroupCols) {
			const hashTable: {
				[key: string]: {
					rows: Tuple[],
					resultTuple: Tuple,
					rownumber: number,
				},
			} = {};

			for (let i = 0; i < org.getNumRows(); i++) {
				const row = org.getRow(i);
            const keyTuple: any[] = new Array(this.checked.groupByColumnIndices.length);

				for (let j = 0; j < this.checked.groupByColumnIndices.length; j++) {
					keyTuple[j] = row[this.checked.groupByColumnIndices[j]];
				}

				const key = JSON.stringify(keyTuple);
				if (typeof (hashTable[key]) !== 'undefined') {
					hashTable[key].rows.push(row);
				}
				else {
					hashTable[key] = {
						rows: [row],
						resultTuple: keyTuple,
						rownumber: i,
					};
					numberOfGroups++;
				}
			}

			groupsOfRows = new Array(org.getNumRows()); // sparsely filled

			// write hashtable into sparsely filled array to preserve ordering
			let entry;
			for (const key in hashTable) {
				if (!hashTable.hasOwnProperty(key)) {
					continue;
				}

				entry = hashTable[key];
				groupsOfRows[entry.rownumber] = entry;
			}

		}
		else { // no grouping attributes => entire relation is one group
			numberOfGroups = 1;
			groupsOfRows = new Array(numberOfGroups);

			groupsOfRows[0] = {
				rows: org.getRows(),
				resultTuple: [],
			};

		}


		// min and max for strings, numbers and dates
		const genericMin = function (a: string | number | Date, b: string | number | Date) {
			if (a < b) {
				return a;
			}
			return b;
		};
		const genericMax = function (a: string | number | Date, b: string | number | Date) {
			if (a > b) {
				return a;
			}
			return b;
		};


		// execute aggregate functions
		let aggValue: any;
		let group: Tuple[];
		let value: any;
		let entry: any;
		for (let h = 0; h < groupsOfRows.length; h++) {
			if (!groupsOfRows[h]) {
				continue;
			} // skip unfilled rows

			entry = groupsOfRows[h];
			group = entry.rows;

			for (let i = 0; i < this.aggregateFunctions.length; i++) {
				const func = this.aggregateFunctions[i];
				const expr = this.checked.aggregateFunctionsExpr[i];

				if (func.aggFunction === 'COUNT_ALL') {
					aggValue = group.length;
				}
				else {
					switch (func.aggFunction) {
						case 'COUNT':
							aggValue = 0;

							for (let j = 0; j < group.length; j++) {
								value = expr!.evaluate(group[j], [], j, session);
								if (value !== null) {
									aggValue++;
								}
							}

							break;

						case 'MIN':
						case 'MAX':
							aggValue = null;
							const c = func.aggFunction === 'MIN' ? genericMin : genericMax;

							for (let j = 0; j < group.length; j++) {
								value = expr!.evaluate(group[j], [], j, session);
								if (value === null) {
									continue;
								}
								if (aggValue === null) {
									aggValue = value;
								}
								else {
									aggValue = c(aggValue, value);
								}
							}

							break;

						case 'AVG':
						case 'SUM':
							let sum = 0;
							let counter = 0;

							for (let j = 0; j < group.length; j++) {
								value = expr!.evaluate(group[j], [], j, session);
								if (value !== null) {
									sum += value;
									counter++;
								}
							}

							if (counter === 0) {
								aggValue = null;
							}
							else if (func.aggFunction === 'SUM') {
								aggValue = sum;
							}
							else { // AVG
								aggValue = sum / counter;
							}

							break;

						default:
							throw new Error('this should not happen');
					}
				}
				entry.resultTuple.push(aggValue);
			}

		}

		// write into result-table
		for (let i = 0; i < groupsOfRows.length; i++) {
			if (!groupsOfRows[i]) {
				continue;
			}
			res.addRow(groupsOfRows[i].resultTuple);
		}

		if (doEliminateDuplicateRows === true) {
			res.eliminateDuplicateRows();
		}
		this.setResultNumRows(res.getNumRows());
		return res;
	}

	equals(node: RANode): boolean {
		if(node instanceof GroupBy) { // same type
			if(this.groupByCols.length !== node.groupByCols.length
			   || this.aggregateFunctions.length !== node.aggregateFunctions.length) {
				return false; // different number of group by columns or aggregate functions
			}

			for(let i = 0; i < this.groupByCols.length; i++) { // for each group by column
				if(this.groupByCols[i].name !== node.groupByCols[i].name
				   || this.groupByCols[i].relAlias !== node.groupByCols[i].relAlias) {
					return false; // different group by columns
				}
			}

			for(let i = 0; i < this.aggregateFunctions.length; i++) { // for each aggregate function
				const a = this.aggregateFunctions[i];
				const b = node.aggregateFunctions[i];

				if (a.aggFunction !== b.aggFunction || a.name !== b.name) {
					return false;
				}

				const aCol = a.col;
				const bCol = b.col;
				if (aCol === null || bCol === null) {
					if (aCol !== bCol) {
						return false;
					}
				}
				else if (typeof (aCol as any).equals === 'function') {
					if (!(aCol as any).equals(bCol)) {
						return false;
					}
				}
				else {
					// fallback for legacy column objects
					if ((aCol as any).name !== (bCol as any).name || (aCol as any).relAlias !== (bCol as any).relAlias) {
						return false;
					}
				}
			}

			return this._child.equals(node._child);
		}
		else {
			return false;
		}
	}
}
