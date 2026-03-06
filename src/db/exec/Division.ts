/*** Copyright 2016 Johannes Kessler 2016 Johannes Kessler
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Table } from './Table';
import { Difference } from './Difference';
import { CrossJoin } from './joins/CrossJoin';
import { Projection } from './Projection';
import { RANode, RANodeBinary, Session } from './RANode';

declare var i18n: any;

/**
 * relational algebra division operator
 */
export class Division extends RANodeBinary {
	// is set by check
	private _delegate: RANode | null = null;

	constructor(child: RANode, child2: RANode) {
		super('÷', 'relalg-operations-division', child, child2);
	}

	getSchema() {
		if (this._delegate === null) { // the schema is the same in the set and multiset implementations
			throw new Error(`check not called`);
		}
		return this._delegate.getSchema();
	}

	getResult(doEliminateDuplicateRows: boolean = true, session?: Session) {
		session = this._returnOrCreateSession(session);

		let res = null;

		if(doEliminateDuplicateRows === true) { // set relational algebra implementation : use (R % S) := (pi r'(R)) -  pi r'( ( (pi r'(R)) x (S) ) - (R) )
			if (this._delegate === null) {
				throw new Error(`check not called`);
			}
			res = this._delegate.getResult(doEliminateDuplicateRows, session);
			res.eliminateDuplicateRows();
		}

		else { // multiset relational algebra implementation : use (R % S) := { t | t in R and for all s in S: t x s in R }
			const schema = this.getSchema();

			const dividend = this._child.getResult(false, session);
			const divisor = this._child2.getResult(false, session);

			res = new Table();
			res.setSchema(schema);

			// Count multiplicities in the divisor relation (S).
			const requiredSCount = new Map<string, number>();
			for (const row of divisor.getRowsMappedToSchema(divisor.getSchema())) {
				const key = JSON.stringify(row); // create a unique key for the row
				requiredSCount.set(key, (requiredSCount.get(key) ?? 0) + 1); // count how many times each s occurs in S
			}

			if(requiredSCount.size === 0) { // if S is empty -> there are no requirements for t -> keep all tuples in R
				for (const row of dividend.getRowsMappedToSchema(schema)) {
					res.addRow(row);
				}
				this.setResultNumRows(res.getNumRows());
				return res;
			}

			// Compute mappings of dividend relation onto the divisor and result schemas.
			const leftRowsT = dividend.getRowsMappedToSchema(schema); 
			const leftRowsS = dividend.getRowsMappedToSchema(divisor.getSchema());

			// For each t, count how often it occurs with each s in R.
			interface TEntry { row: any[]; sCount: Map<string, number>; }
			const tEntries = new Map<string, TEntry>();
			for (let i = 0; i < leftRowsT.length; i++) {
				const tRow = leftRowsT[i]; 
				const tKey = JSON.stringify(tRow); // row t is identified with its mapping to the result schema

				const sKey = JSON.stringify(leftRowsS[i]); // row s is identified with its mapping to the divisor schema

				let entry = tEntries.get(tKey); 
				if (!entry) { // if seeing this t for the first time, create a new entry for it
					entry = { row: tRow, sCount: new Map<string, number>() };
					tEntries.set(tKey, entry);
				}

				entry.sCount.set(sKey, (entry.sCount.get(sKey) ?? 0) + 1); // count how many times t occurs with each s in R
			}

			// For each t, count how much it can be repeated based on s-multiplicities.
			for (const { row, sCount } of tEntries.values()) { // For each t
				let repetitions = Number.POSITIVE_INFINITY; 

				for (const [requiredSKey, requiredCount] of requiredSCount.entries()) { // For each s
					const countInR = sCount.get(requiredSKey) ?? 0; 
					const allowed = Math.floor(countInR / requiredCount); 

					repetitions = Math.min(repetitions, allowed); // for each new s, update the number of repetitions with a lower of equal value
				}
				

				if (repetitions > 0 && repetitions !== Number.POSITIVE_INFINITY) { // if there is at least one repetition
					for (let i = 0; i < repetitions; i++) {
						res.addRow(row); // add the row to the result for each possible repetition
					}
				}
			}
		}
		
		if(res === null) { 
			throw new Error(`unexpected null result`);
		}

		this.setResultNumRows(res.getNumRows());
		return res;
	}

	check() {
		this._child.check();
		this._child2.check();

		// schema r' is (sch(left) \ sch(right))
		const schemaA = this._child.getSchema();
		const schemaB = this._child2.getSchema();
		const numColsA = schemaA.getSize();
		const numColsB = schemaB.getSize();

		const schema = schemaA.copy();
		for (let i = 0; i < numColsB; i++) {
			const index = schema.getColumnIndex(schemaB.getColumn(i).getName(), null, false);
			if (index > -1) {
				schema.removeColumn(index);
			}
		}

		if (schema.getSize() === numColsA) { // size has not changed => schemaB not part of schemaA
			this.throwExecutionError(i18n.t('db.messages.exec.error-schema-a-not-part-of-schema-b', {
				schemaA: schemaB,
				schemaB: schemaA,
			}));
		}

		// (R % S) := (pi r'(R)) -  pi r'( ( (pi r'(R)) x (S) ) - (R) )
		this._delegate = new Difference(
			new Projection(this._child, schema.getColumns()).setCodeInfoObject(this._codeInfo),
			new Projection(
				new Difference(
					new CrossJoin(
						new Projection(this._child, schema.getColumns()).setCodeInfoObject(this._codeInfo),
						this._child2,
					).setCodeInfoObject(this._codeInfo),
					this._child,
				).setCodeInfoObject(this._codeInfo),
				schema.getColumns(),
			).setCodeInfoObject(this._codeInfo),
		);
		this._delegate.check();
	}

	equalsChildren(node: RANodeBinary): boolean {
		if (node instanceof Division) { // same type
			// the order of the children matters for the division operation
			return this._child.equals(node.getChild()) // same child
				&& this._child2.equals(node.getChild2()); // same child2
		}
		else {
			return false;
		}
	}
}