/*** Copyright 2018 Johannes Kessler
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as jQuery from 'jquery';

import { Group, GroupInfo, GroupSourceType, HeaderTranslated, SourceInfo } from 'calc2/store/groups';
import { parseRelalgGroup, relalgFromRelalgAstNode, replaceVariables } from 'db/relax-core';
import { Relation } from 'db/exec/Relation';

const ld_tp3_data: any = require('../data/tp3_data.txt');
const ld_tp5_data: any = require('../data/tp5_data.txt');
const ld_sb: any = require('../data/sb.txt');
const ld_ufes: any = require('../data/ufes.txt');
const ld: any = require('../data/uibk.txt');
const LOCAL_DATA: { [id: string]: string } = {
  'tp3_data': ld_tp3_data.default ? ld_tp3_data.default : '',
  'tp5_data': ld_tp5_data.default ? ld_tp5_data.default : '',
	'sb': ld_sb.default ? ld_sb.default : '',
  'ufes': ld_ufes.default ? ld_ufes.default : '',
  'uibk': ld.default ? ld.default : '',
};

export function parseGroupsFromDefinition(text: string, groupInfo: GroupInfo, sourceInfo: SourceInfo) {
  const groupAst = parseRelalgGroup(text);
  return getGroupsFromGroupAst(groupAst, groupInfo, sourceInfo);
}


function extractTranslatedHeader<T extends string | null>(
  headers: relalgAst.Group['headers'],
  headerName: string,
  emptyFallback: string,
): HeaderTranslated {

  headers = headers.filter(({ name }) => name === headerName);

  if (headers.length === 0) {
    return {
      fallback: emptyFallback,
    };
  }

  let fallback: null | string = null;
  const tmp: { [lang: string]: string } = {};

  for (let i = 0; i < headers.length; i++) {
    let { name, lang, text } = headers[i];
    text = text.trim();

    if (lang === null || fallback === null) {
      // use the first one as fallback (if no generic one appears later)
      fallback = text;
    }
    else {
      lang = lang.toLocaleLowerCase();

      tmp[lang] = text;
    }
  }

  return {
    fallback: fallback!,
    ...tmp,
  };
}

export function getGroupsFromGroupAst(groupAst: relalgAst.GroupRoot, groupInfo: GroupInfo, sourceInfo: SourceInfo) {
  const groups: Group[] = [];
	
  for (let i = 0; i < groupAst.groups.length; i++) {
    const astGroup = groupAst.groups[i];
    replaceVariables(astGroup, {});

    // empty should not happen as the parser ensures that at least one 'group' header is present;
    const groupName = extractTranslatedHeader(astGroup.headers, 'group', 'unknown group');
    const groupDesc = extractTranslatedHeader(astGroup.headers, 'description', '');

    const category = extractTranslatedHeader(astGroup.headers, 'category', '');
    // FIXME: category need to be null for misc/no group
		
		
    const group: Group = {
      groupName,
      groupDesc,
      category,
			exampleSQL: astGroup.exampleSql,
			exampleBags: astGroup.exampleBags,
			exampleRA: astGroup.exampleRA,
      tables: [],
      groupInfo: {
        ...groupInfo,
        index: i,
      },
      sourceInfo,
      definition: astGroup.codeInfo.text,
    };
		
    // tables
    for (let j = 0; j < astGroup.assignments.length; j++) {
      const result = relalgFromRelalgAstNode(astGroup.assignments[j].child, {});
		
      result.check();

      const relation = result.getResult(false).createRelation(astGroup.assignments[j].name);

      const schema = relation.getSchema();
      const columnNames = new Array(schema.getSize());
      const columnTypes = new Array(schema.getSize());
      for (let k = 0; k < schema.getSize(); k++) {
        const c = schema.getColumn(k);
        columnNames[k] = c.getName();
        columnTypes[k] = c.getType();
      }

      group.tables[j] = {
        tableId: 1,
        tableName: astGroup.assignments[j].name,
        columnNames: columnNames,
        columnTypes: columnTypes,
        relation: relation,
      };
    }

    groups.push(group);
  }
  return groups;
}

/**
 * loads group definition(s) from a (remote) location
 */
export function loadGroupsFromSource(source: GroupSourceType, id: string, maintainer: string, maintainerGroup: string, hidden: boolean): Promise<Group[]> {
  return new Promise<Group[]>((resolve, reject) => {

    function gist_success(data: gist.Gist) {
      const newGroups: Group[] = [];

      for (const filename in data.files) {
        if (!data.files.hasOwnProperty(filename)) {
          continue;
        }

        const author = data.owner === null ? 'anonymous' : data.owner.login;
        const authorUrl = data.owner === null ? undefined : data.owner.html_url;
        const info: GroupInfo = {
          source,
          id: data.id,
          filename,
          index: -1,
          
          maintainer: maintainer,
          maintainerGroup: maintainerGroup,

          hidden: hidden,
        };

        const sourceInfo: SourceInfo = {
          author,
          authorUrl,
          lastModified: new Date(data.updated_at),
          url: data.url,
        };

        try {
          newGroups.push(...parseGroupsFromDefinition(data.files[filename].content, info, sourceInfo));
        }
        catch (e) {
          // tslint:disable-next-line: prefer-template
          const msg = 'could not parse given group from gist with id "' + id + '": ' + e;
          console.error(msg, id, e, filename, data);
          reject(new Error(msg));
        }
      }

      resolve(newGroups);
    }

    switch (source) {
      case 'gist': {
        jQuery.ajax({
          url: `https://api.github.com/gists/${id}`,
          dataType: 'json',
          success: gist_success,
          crossDomain: true,
          statusCode: {
            403: function (data: any) {
              reject(new Error(data.responseJSON.message));
            },
            404: function () {
              reject(new Error('gist ' + id + ' not found'));
            },
          },
          timeout: 10000,
          async: false,
        });
        break;
      }
      case 'local': {
        try {
          const data: string = LOCAL_DATA[id];
          const info: GroupInfo = {
            source,
            id,
            filename: 'local',
            index: -1,

            maintainer: maintainer,
            maintainerGroup: maintainerGroup,

            hidden: hidden,
          };
          const newGroups = parseGroupsFromDefinition(data, info, {});

          resolve(newGroups);
        }
        catch (e) {
          let msg = 'cannot parse groups file: ' + (e as Error).message;
          msg += ' see log for more information';
          console.error(msg, e);
          reject(new Error(msg));
        }
        break;
      }
      case 'http': {
        const msg = 'parsing groups from arbitrary urls is no longer supported; use github gists instead.';
        window.alert(msg);
        reject(new Error(msg));

        break;
      }
      default:
        reject(new Error('unknown source ' + source));
    }
  });
}

export function alignGroupToDataset(source: Group, target: Group): Group {
  const alignedGroup: Group = { ...source, tables: [] };

  // for each table in the target dataset, try to find a matching table in the source dataset.
  let sourceToTargetTables = target.tables.map(targetTable => {
    let match = source.tables.find(sourceTable => sourceTable.tableName === targetTable.tableName);

    if(match){ // if there is a table with the same name in the source dataset, 
      const sourceSchema = match.relation.getSchema();
      const targetSchema = targetTable.relation.getSchema();

      if(!sourceSchema.equals(targetSchema)){ // check if the schemas are compatible.
        console.warn('table ', targetTable.tableName, ' exists in both the reference and test dataset but has incompatible schema so the schema from the reference dataset will be used');
        match = undefined; // if they are not compatible, ignore the table from the test dataset.
      }
    }

    if(!match){ // if the table does not exist in the source dataset,
      const targetRelation = new Relation(targetTable.tableName);
      targetRelation.setSchema(targetTable.relation.getSchema(), true);

      match = { // create an empty table with the same schema as the target table.
        ...targetTable,
        relation: targetRelation
      };
    }

    return match;
  });

  source.tables.forEach(sourceTable => { // for each table in the source dataset, 
    const match = target.tables.find(targetTable => targetTable.tableName === sourceTable.tableName); // try to find a matching table in the target dataset.
    if (!match) { // if the there are tables in the source dataset that do not exist in the target dataset,
      alignedGroup.tables.push(sourceTable); // add them to the end of the aligned group.
    }
  });

  alignedGroup.tables = sourceToTargetTables;
  return alignedGroup;
}