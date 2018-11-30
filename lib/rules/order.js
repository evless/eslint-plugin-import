'use strict';

var _importType = require('../core/importType');

var _importType2 = _interopRequireDefault(_importType);

var _staticRequire = require('../core/staticRequire');

var _staticRequire2 = _interopRequireDefault(_staticRequire);

var _docsUrl = require('../docsUrl');

var _docsUrl2 = _interopRequireDefault(_docsUrl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const defaultGroups = ['builtin', 'external', 'private', 'absolute', 'parent', 'sibling', 'index', 'flow'];

// REPORTING AND FIXING

function reverse(array) {
  return array.map(function (v) {
    return {
      name: v.name,
      rank: -v.rank,
      node: v.node
    };
  }).reverse();
}

function getTokensOrCommentsAfter(sourceCode, node, count) {
  let currentNodeOrToken = node;
  const result = [];
  for (let i = 0; i < count; i++) {
    currentNodeOrToken = sourceCode.getTokenOrCommentAfter(currentNodeOrToken);
    if (currentNodeOrToken == null) {
      break;
    }
    result.push(currentNodeOrToken);
  }
  return result;
}

function getTokensOrCommentsBefore(sourceCode, node, count) {
  let currentNodeOrToken = node;
  const result = [];
  for (let i = 0; i < count; i++) {
    currentNodeOrToken = sourceCode.getTokenOrCommentBefore(currentNodeOrToken);
    if (currentNodeOrToken == null) {
      break;
    }
    result.push(currentNodeOrToken);
  }
  return result.reverse();
}

function takeTokensAfterWhile(sourceCode, node, condition) {
  const tokens = getTokensOrCommentsAfter(sourceCode, node, 100);
  const result = [];
  for (let i = 0; i < tokens.length; i++) {
    if (condition(tokens[i])) {
      result.push(tokens[i]);
    } else {
      break;
    }
  }
  return result;
}

function takeTokensBeforeWhile(sourceCode, node, condition) {
  const tokens = getTokensOrCommentsBefore(sourceCode, node, 100);
  const result = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (condition(tokens[i])) {
      result.push(tokens[i]);
    } else {
      break;
    }
  }
  return result.reverse();
}

function findOutOfOrder(imported) {
  if (imported.length === 0) {
    return [];
  }
  let maxSeenRankNode = imported[0];
  return imported.filter(function (importedModule) {
    const res = importedModule.rank < maxSeenRankNode.rank;
    if (maxSeenRankNode.rank < importedModule.rank) {
      maxSeenRankNode = importedModule;
    }
    return res;
  });
}

function findRootNode(node) {
  let parent = node;
  while (parent.parent != null && parent.parent.body == null) {
    parent = parent.parent;
  }
  return parent;
}

function findEndOfLineWithComments(sourceCode, node) {
  const tokensToEndOfLine = takeTokensAfterWhile(sourceCode, node, commentOnSameLineAs(node));
  let endOfTokens = tokensToEndOfLine.length > 0 ? tokensToEndOfLine[tokensToEndOfLine.length - 1].range[1] : node.range[1];
  let result = endOfTokens;
  for (let i = endOfTokens; i < sourceCode.text.length; i++) {
    if (sourceCode.text[i] === '\n') {
      result = i + 1;
      break;
    }
    if (sourceCode.text[i] !== ' ' && sourceCode.text[i] !== '\t' && sourceCode.text[i] !== '\r') {
      break;
    }
    result = i + 1;
  }
  return result;
}

function commentOnSameLineAs(node) {
  return token => (token.type === 'Block' || token.type === 'Line') && token.loc.start.line === token.loc.end.line && token.loc.end.line === node.loc.end.line;
}

function findStartOfLineWithComments(sourceCode, node) {
  const tokensToEndOfLine = takeTokensBeforeWhile(sourceCode, node, commentOnSameLineAs(node));
  let startOfTokens = tokensToEndOfLine.length > 0 ? tokensToEndOfLine[0].range[0] : node.range[0];
  let result = startOfTokens;
  for (let i = startOfTokens - 1; i > 0; i--) {
    if (sourceCode.text[i] !== ' ' && sourceCode.text[i] !== '\t') {
      break;
    }
    result = i;
  }
  return result;
}

function isPlainRequireModule(node) {
  if (node.type !== 'VariableDeclaration') {
    return false;
  }
  if (node.declarations.length !== 1) {
    return false;
  }
  const decl = node.declarations[0];
  const result = decl.id != null && decl.id.type === 'Identifier' && decl.init != null && decl.init.type === 'CallExpression' && decl.init.callee != null && decl.init.callee.name === 'require' && decl.init.arguments != null && decl.init.arguments.length === 1 && decl.init.arguments[0].type === 'Literal';
  return result;
}

function isPlainImportModule(node) {
  return node.type === 'ImportDeclaration' && node.specifiers != null && node.specifiers.length > 0;
}

function canCrossNodeWhileReorder(node) {
  return isPlainRequireModule(node) || isPlainImportModule(node);
}

function canReorderItems(firstNode, secondNode) {
  const parent = firstNode.parent;
  const firstIndex = parent.body.indexOf(firstNode);
  const secondIndex = parent.body.indexOf(secondNode);
  const nodesBetween = parent.body.slice(firstIndex, secondIndex + 1);
  for (var nodeBetween of nodesBetween) {
    if (!canCrossNodeWhileReorder(nodeBetween)) {
      return false;
    }
  }
  return true;
}

function fixOutOfOrder(context, firstNode, secondNode, order) {
  const sourceCode = context.getSourceCode();

  const firstRoot = findRootNode(firstNode.node);
  let firstRootStart = findStartOfLineWithComments(sourceCode, firstRoot);
  const firstRootEnd = findEndOfLineWithComments(sourceCode, firstRoot);

  const secondRoot = findRootNode(secondNode.node);
  let secondRootStart = findStartOfLineWithComments(sourceCode, secondRoot);
  let secondRootEnd = findEndOfLineWithComments(sourceCode, secondRoot);
  const canFix = canReorderItems(firstRoot, secondRoot);

  let newCode = sourceCode.text.substring(secondRootStart, secondRootEnd);
  if (newCode[newCode.length - 1] !== '\n') {
    newCode = newCode + '\n';
  }

  const message = '`' + secondNode.name + '` import should occur ' + order + ' import of `' + firstNode.name + '`';

  if (order === 'before') {
    context.report({
      node: secondNode.node,
      message: message,
      fix: canFix && (fixer => fixer.replaceTextRange([firstRootStart, secondRootEnd], newCode + sourceCode.text.substring(firstRootStart, secondRootStart)))
    });
  } else if (order === 'after') {
    context.report({
      node: secondNode.node,
      message: message,
      fix: canFix && (fixer => fixer.replaceTextRange([secondRootStart, firstRootEnd], sourceCode.text.substring(secondRootEnd, firstRootEnd) + newCode))
    });
  }
}

function reportOutOfOrder(context, imported, outOfOrder, order) {
  outOfOrder.forEach(function (imp) {
    const found = imported.find(function hasHigherRank(importedItem) {
      return importedItem.rank > imp.rank;
    });
    fixOutOfOrder(context, found, imp, order);
  });
}

function makeOutOfOrderReport(context, imported) {
  const outOfOrder = findOutOfOrder(imported);
  if (!outOfOrder.length) {
    return;
  }
  // There are things to report. Try to minimize the number of reported errors.
  const reversedImported = reverse(imported);
  const reversedOrder = findOutOfOrder(reversedImported);
  if (reversedOrder.length < outOfOrder.length) {
    reportOutOfOrder(context, reversedImported, reversedOrder, 'after');
    return;
  }
  reportOutOfOrder(context, imported, outOfOrder, 'before');
}

// DETECTING

function computeRank(context, ranks, name, type, groups, node) {
  let rankType;
  if (type === 'import' && node.importKind === 'type') {
    rankType = 'flow';
  } else {
    rankType = (0, _importType2.default)(name, context, groups);
  }

  return ranks[rankType] + (type === 'import' ? 0 : 100);
}

function registerNode(context, node, name, type, ranks, imported, groups) {
  const rank = computeRank(context, ranks, name, type, groups, node);

  if (rank !== -1) {
    imported.push({ name, rank, node });
  }
}

function isInVariableDeclarator(node) {
  return node && (node.type === 'VariableDeclarator' || isInVariableDeclarator(node.parent));
}

const types = ['builtin', 'external', 'private', 'internal', 'parent', 'sibling', 'index', 'absolute', 'flow'];

// Creates an object with type-rank pairs.
// Example: { index: 0, sibling: 1, parent: 1, external: 1, builtin: 2, internal: 2 }
// Will throw an error if it contains a type that does not exist, or has a duplicate
function convertGroupsToRanks(groups) {
  const rankObject = groups.reduce(function (res, group, index) {
    if (typeof group === 'string') {
      group = [group];
    }

    if (typeof group === 'object' && group !== null && group.constructor === Object) {
      group = [group];
    }

    group.forEach(function (groupItem) {
      if (typeof groupItem === 'object' && groupItem !== null && groupItem.constructor === Object && groupItem.name) {
        groupItem = groupItem.name;
      }

      const isCorrectGroup = types.find(typeItem => typeItem === groupItem);

      if (!isCorrectGroup) {
        throw new Error('Incorrect configuration of the rule: Unknown type `' + JSON.stringify(groupItem) + '`');
      }

      if (res[groupItem] !== undefined) {
        throw new Error('Incorrect configuration of the rule: `' + groupItem + '` is duplicated');
      }

      res[groupItem] = index;
    });

    return res;
  }, {});

  const omittedTypes = types.filter(function (type) {
    return rankObject[type] === undefined;
  });

  return omittedTypes.reduce(function (res, type) {
    res[type] = groups.length;

    return res;
  }, rankObject);
}

function fixNewLineAfterImport(context, previousImport) {
  const prevRoot = findRootNode(previousImport.node);
  const tokensToEndOfLine = takeTokensAfterWhile(context.getSourceCode(), prevRoot, commentOnSameLineAs(prevRoot));

  let endOfLine = prevRoot.range[1];
  if (tokensToEndOfLine.length > 0) {
    endOfLine = tokensToEndOfLine[tokensToEndOfLine.length - 1].range[1];
  }
  return fixer => fixer.insertTextAfterRange([prevRoot.range[0], endOfLine], '\n');
}

function removeNewLineAfterImport(context, currentImport, previousImport) {
  const sourceCode = context.getSourceCode();
  const prevRoot = findRootNode(previousImport.node);
  const currRoot = findRootNode(currentImport.node);
  const rangeToRemove = [findEndOfLineWithComments(sourceCode, prevRoot), findStartOfLineWithComments(sourceCode, currRoot)];
  if (/^\s*$/.test(sourceCode.text.substring(rangeToRemove[0], rangeToRemove[1]))) {
    return fixer => fixer.removeRange(rangeToRemove);
  }
  return undefined;
}

function makeNewlinesBetweenReport(context, imported, newlinesBetweenImports) {
  const getNumberOfEmptyLinesBetween = (currentImport, previousImport) => {
    const linesBetweenImports = context.getSourceCode().lines.slice(previousImport.node.loc.end.line, currentImport.node.loc.start.line - 1);

    return linesBetweenImports.filter(line => !line.trim().length).length;
  };
  let previousImport = imported[0];

  imported.slice(1).forEach(function (currentImport) {
    const emptyLinesBetween = getNumberOfEmptyLinesBetween(currentImport, previousImport);

    if (newlinesBetweenImports === 'always' || newlinesBetweenImports === 'always-and-inside-groups') {
      if (currentImport.rank !== previousImport.rank && emptyLinesBetween === 0) {
        context.report({
          node: previousImport.node,
          message: 'There should be at least one empty line between import groups',
          fix: fixNewLineAfterImport(context, previousImport, currentImport)
        });
      } else if (currentImport.rank === previousImport.rank && emptyLinesBetween > 0 && newlinesBetweenImports !== 'always-and-inside-groups') {
        context.report({
          node: previousImport.node,
          message: 'There should be no empty line within import group',
          fix: removeNewLineAfterImport(context, currentImport, previousImport)
        });
      }
    } else if (emptyLinesBetween > 0) {
      context.report({
        node: previousImport.node,
        message: 'There should be no empty line between import groups',
        fix: removeNewLineAfterImport(context, currentImport, previousImport)
      });
    }

    previousImport = currentImport;
  });
}

module.exports = {
  meta: {
    docs: {
      url: (0, _docsUrl2.default)('order')
    },

    fixable: 'code',
    schema: [{
      type: 'object',
      properties: {
        groups: {
          type: 'array'
        },
        'newlines-between': {
          enum: ['ignore', 'always', 'always-and-inside-groups', 'never']
        }
      },
      additionalProperties: false
    }]
  },

  create: function importOrderRule(context) {
    const options = context.options[0] || {};
    const groups = options.groups || defaultGroups;
    const newlinesBetweenImports = options['newlines-between'] || 'ignore';
    let ranks;

    try {
      ranks = convertGroupsToRanks(groups);
    } catch (error) {
      // Malformed configuration
      return {
        Program: function (node) {
          context.report(node, error.message);
        }
      };
    }

    let imported = [];
    let level = 0;

    function incrementLevel() {
      level++;
    }
    function decrementLevel() {
      level--;
    }

    return {
      ImportDeclaration: function handleImports(node) {
        if (node.specifiers.length) {
          // Ignoring unassigned imports
          const name = node.source.value;
          registerNode(context, node, name, 'import', ranks, imported, groups);
        }
      },
      CallExpression: function handleRequires(node) {
        if (level !== 0 || !(0, _staticRequire2.default)(node) || !isInVariableDeclarator(node.parent)) {
          return;
        }
        const name = node.arguments[0].value;
        registerNode(context, node, name, 'require', ranks, imported, groups);
      },
      'Program:exit': function reportAndReset() {
        makeOutOfOrderReport(context, imported);

        if (newlinesBetweenImports !== 'ignore') {
          makeNewlinesBetweenReport(context, imported, newlinesBetweenImports);
        }

        imported = [];
      },
      FunctionDeclaration: incrementLevel,
      FunctionExpression: incrementLevel,
      ArrowFunctionExpression: incrementLevel,
      BlockStatement: incrementLevel,
      ObjectExpression: incrementLevel,
      'FunctionDeclaration:exit': decrementLevel,
      'FunctionExpression:exit': decrementLevel,
      'ArrowFunctionExpression:exit': decrementLevel,
      'BlockStatement:exit': decrementLevel,
      'ObjectExpression:exit': decrementLevel
    };
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJ1bGVzL29yZGVyLmpzIl0sIm5hbWVzIjpbImRlZmF1bHRHcm91cHMiLCJyZXZlcnNlIiwiYXJyYXkiLCJtYXAiLCJ2IiwibmFtZSIsInJhbmsiLCJub2RlIiwiZ2V0VG9rZW5zT3JDb21tZW50c0FmdGVyIiwic291cmNlQ29kZSIsImNvdW50IiwiY3VycmVudE5vZGVPclRva2VuIiwicmVzdWx0IiwiaSIsImdldFRva2VuT3JDb21tZW50QWZ0ZXIiLCJwdXNoIiwiZ2V0VG9rZW5zT3JDb21tZW50c0JlZm9yZSIsImdldFRva2VuT3JDb21tZW50QmVmb3JlIiwidGFrZVRva2Vuc0FmdGVyV2hpbGUiLCJjb25kaXRpb24iLCJ0b2tlbnMiLCJsZW5ndGgiLCJ0YWtlVG9rZW5zQmVmb3JlV2hpbGUiLCJmaW5kT3V0T2ZPcmRlciIsImltcG9ydGVkIiwibWF4U2VlblJhbmtOb2RlIiwiZmlsdGVyIiwiaW1wb3J0ZWRNb2R1bGUiLCJyZXMiLCJmaW5kUm9vdE5vZGUiLCJwYXJlbnQiLCJib2R5IiwiZmluZEVuZE9mTGluZVdpdGhDb21tZW50cyIsInRva2Vuc1RvRW5kT2ZMaW5lIiwiY29tbWVudE9uU2FtZUxpbmVBcyIsImVuZE9mVG9rZW5zIiwicmFuZ2UiLCJ0ZXh0IiwidG9rZW4iLCJ0eXBlIiwibG9jIiwic3RhcnQiLCJsaW5lIiwiZW5kIiwiZmluZFN0YXJ0T2ZMaW5lV2l0aENvbW1lbnRzIiwic3RhcnRPZlRva2VucyIsImlzUGxhaW5SZXF1aXJlTW9kdWxlIiwiZGVjbGFyYXRpb25zIiwiZGVjbCIsImlkIiwiaW5pdCIsImNhbGxlZSIsImFyZ3VtZW50cyIsImlzUGxhaW5JbXBvcnRNb2R1bGUiLCJzcGVjaWZpZXJzIiwiY2FuQ3Jvc3NOb2RlV2hpbGVSZW9yZGVyIiwiY2FuUmVvcmRlckl0ZW1zIiwiZmlyc3ROb2RlIiwic2Vjb25kTm9kZSIsImZpcnN0SW5kZXgiLCJpbmRleE9mIiwic2Vjb25kSW5kZXgiLCJub2Rlc0JldHdlZW4iLCJzbGljZSIsIm5vZGVCZXR3ZWVuIiwiZml4T3V0T2ZPcmRlciIsImNvbnRleHQiLCJvcmRlciIsImdldFNvdXJjZUNvZGUiLCJmaXJzdFJvb3QiLCJmaXJzdFJvb3RTdGFydCIsImZpcnN0Um9vdEVuZCIsInNlY29uZFJvb3QiLCJzZWNvbmRSb290U3RhcnQiLCJzZWNvbmRSb290RW5kIiwiY2FuRml4IiwibmV3Q29kZSIsInN1YnN0cmluZyIsIm1lc3NhZ2UiLCJyZXBvcnQiLCJmaXgiLCJmaXhlciIsInJlcGxhY2VUZXh0UmFuZ2UiLCJyZXBvcnRPdXRPZk9yZGVyIiwib3V0T2ZPcmRlciIsImZvckVhY2giLCJpbXAiLCJmb3VuZCIsImZpbmQiLCJoYXNIaWdoZXJSYW5rIiwiaW1wb3J0ZWRJdGVtIiwibWFrZU91dE9mT3JkZXJSZXBvcnQiLCJyZXZlcnNlZEltcG9ydGVkIiwicmV2ZXJzZWRPcmRlciIsImNvbXB1dGVSYW5rIiwicmFua3MiLCJncm91cHMiLCJyYW5rVHlwZSIsImltcG9ydEtpbmQiLCJyZWdpc3Rlck5vZGUiLCJpc0luVmFyaWFibGVEZWNsYXJhdG9yIiwidHlwZXMiLCJjb252ZXJ0R3JvdXBzVG9SYW5rcyIsInJhbmtPYmplY3QiLCJyZWR1Y2UiLCJncm91cCIsImluZGV4IiwiY29uc3RydWN0b3IiLCJPYmplY3QiLCJncm91cEl0ZW0iLCJpc0NvcnJlY3RHcm91cCIsInR5cGVJdGVtIiwiRXJyb3IiLCJKU09OIiwic3RyaW5naWZ5IiwidW5kZWZpbmVkIiwib21pdHRlZFR5cGVzIiwiZml4TmV3TGluZUFmdGVySW1wb3J0IiwicHJldmlvdXNJbXBvcnQiLCJwcmV2Um9vdCIsImVuZE9mTGluZSIsImluc2VydFRleHRBZnRlclJhbmdlIiwicmVtb3ZlTmV3TGluZUFmdGVySW1wb3J0IiwiY3VycmVudEltcG9ydCIsImN1cnJSb290IiwicmFuZ2VUb1JlbW92ZSIsInRlc3QiLCJyZW1vdmVSYW5nZSIsIm1ha2VOZXdsaW5lc0JldHdlZW5SZXBvcnQiLCJuZXdsaW5lc0JldHdlZW5JbXBvcnRzIiwiZ2V0TnVtYmVyT2ZFbXB0eUxpbmVzQmV0d2VlbiIsImxpbmVzQmV0d2VlbkltcG9ydHMiLCJsaW5lcyIsInRyaW0iLCJlbXB0eUxpbmVzQmV0d2VlbiIsIm1vZHVsZSIsImV4cG9ydHMiLCJtZXRhIiwiZG9jcyIsInVybCIsImZpeGFibGUiLCJzY2hlbWEiLCJwcm9wZXJ0aWVzIiwiZW51bSIsImFkZGl0aW9uYWxQcm9wZXJ0aWVzIiwiY3JlYXRlIiwiaW1wb3J0T3JkZXJSdWxlIiwib3B0aW9ucyIsImVycm9yIiwiUHJvZ3JhbSIsImxldmVsIiwiaW5jcmVtZW50TGV2ZWwiLCJkZWNyZW1lbnRMZXZlbCIsIkltcG9ydERlY2xhcmF0aW9uIiwiaGFuZGxlSW1wb3J0cyIsInNvdXJjZSIsInZhbHVlIiwiQ2FsbEV4cHJlc3Npb24iLCJoYW5kbGVSZXF1aXJlcyIsInJlcG9ydEFuZFJlc2V0IiwiRnVuY3Rpb25EZWNsYXJhdGlvbiIsIkZ1bmN0aW9uRXhwcmVzc2lvbiIsIkFycm93RnVuY3Rpb25FeHByZXNzaW9uIiwiQmxvY2tTdGF0ZW1lbnQiLCJPYmplY3RFeHByZXNzaW9uIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7OztBQUVBLE1BQU1BLGdCQUFnQixDQUFDLFNBQUQsRUFBWSxVQUFaLEVBQXdCLFNBQXhCLEVBQW1DLFVBQW5DLEVBQStDLFFBQS9DLEVBQXlELFNBQXpELEVBQW9FLE9BQXBFLEVBQTZFLE1BQTdFLENBQXRCOztBQUVBOztBQUVBLFNBQVNDLE9BQVQsQ0FBaUJDLEtBQWpCLEVBQXdCO0FBQ3RCLFNBQU9BLE1BQU1DLEdBQU4sQ0FBVSxVQUFVQyxDQUFWLEVBQWE7QUFDNUIsV0FBTztBQUNMQyxZQUFNRCxFQUFFQyxJQURIO0FBRUxDLFlBQU0sQ0FBQ0YsRUFBRUUsSUFGSjtBQUdMQyxZQUFNSCxFQUFFRztBQUhILEtBQVA7QUFLRCxHQU5NLEVBTUpOLE9BTkksRUFBUDtBQU9EOztBQUVELFNBQVNPLHdCQUFULENBQWtDQyxVQUFsQyxFQUE4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QXFCVCxjQXZCaEI7QUF3QkxVLDBCQUFvQlYsY0F4QmY7QUF5QkxXLCtCQUF5QlgsY0F6QnBCO0FBMEJMWSxzQkFBZ0JaLGNBMUJYO0FBMkJMYSx3QkFBa0JiLGNBM0JiO0FBNEJMLGtDQUE0QkMsY0E1QnZCO0FBNkJMLGlDQUEyQkEsY0E3QnRCO0FBOEJMLHNDQUFnQ0EsY0E5QjNCO0FBK0JMLDZCQUF1QkEsY0EvQmxCO0FBZ0NMLCtCQUF5QkE7QUFoQ3BCLEtBQVA7QUFrQ0Q7QUExRmMsQ0FBakIiLCJmaWxlIjoicnVsZXMvb3JkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxuaW1wb3J0IGltcG9ydFR5cGUgZnJvbSAnLi4vY29yZS9pbXBvcnRUeXBlJ1xuaW1wb3J0IGlzU3RhdGljUmVxdWlyZSBmcm9tICcuLi9jb3JlL3N0YXRpY1JlcXVpcmUnXG5pbXBvcnQgZG9jc1VybCBmcm9tICcuLi9kb2NzVXJsJ1xuXG5jb25zdCBkZWZhdWx0R3JvdXBzID0gWydidWlsdGluJywgJ2V4dGVybmFsJywgJ3ByaXZhdGUnLCAnYWJzb2x1dGUnLCAncGFyZW50JywgJ3NpYmxpbmcnLCAnaW5kZXgnLCAnZmxvdyddXG5cbi8vIFJFUE9SVElORyBBTkQgRklYSU5HXG5cbmZ1bmN0aW9uIHJldmVyc2UoYXJyYXkpIHtcbiAgcmV0dXJuIGFycmF5Lm1hcChmdW5jdGlvbiAodikge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiB2Lm5hbWUsXG4gICAgICByYW5rOiAtdi5yYW5rLFxuICAgICAgbm9kZTogdi5ub2RlLFxuICAgIH1cbiAgfSkucmV2ZXJzZSgpXG59XG5cbmZ1bmN0aW9uIGdldFRva2Vuc09yQ29tbWVudHNBZnRlcihzb3VyY2VDb2RlLCBub2RlLCBjb3VudCkge1xuICBsZXQgY3VycmVudE5vZGVPclRva2VuID0gbm9kZVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICBjdXJyZW50Tm9kZU9yVG9rZW4gPSBzb3VyY2VDb2RlLmdldFRva2VuT3JDb21tZW50QWZ0ZXIoY3VycmVudE5vZGVPclRva2VuKVxuICAgIGlmIChjdXJyZW50Tm9kZU9yVG9rZW4gPT0gbnVsbCkge1xuICAgICAgYnJlYWtcbiAgICB9XG4gICAgcmVzdWx0LnB1c2goY3VycmVudE5vZGVPclRva2VuKVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuZnVuY3Rpb24gZ2V0VG9rZW5zT3JDb21tZW50c0JlZm9yZShzb3VyY2VDb2RlLCBub2RlLCBjb3VudCkge1xuICBsZXQgY3VycmVudE5vZGVPclRva2VuID0gbm9kZVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICBjdXJyZW50Tm9kZU9yVG9rZW4gPSBzb3VyY2VDb2RlLmdldFRva2VuT3JDb21tZW50QmVmb3JlKGN1cnJlbnROb2RlT3JUb2tlbilcbiAgICBpZiAoY3VycmVudE5vZGVPclRva2VuID09IG51bGwpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIHJlc3VsdC5wdXNoKGN1cnJlbnROb2RlT3JUb2tlbilcbiAgfVxuICByZXR1cm4gcmVzdWx0LnJldmVyc2UoKVxufVxuXG5mdW5jdGlvbiB0YWtlVG9rZW5zQWZ0ZXJXaGlsZShzb3VyY2VDb2RlLCBub2RlLCBjb25kaXRpb24pIHtcbiAgY29uc3QgdG9rZW5zID0gZ2V0VG9rZW5zT3JDb21tZW50c0FmdGVyKHNvdXJjZUNvZGUsIG5vZGUsIDEwMClcbiAgY29uc3QgcmVzdWx0ID0gW11cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoY29uZGl0aW9uKHRva2Vuc1tpXSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHRva2Vuc1tpXSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbmZ1bmN0aW9uIHRha2VUb2tlbnNCZWZvcmVXaGlsZShzb3VyY2VDb2RlLCBub2RlLCBjb25kaXRpb24pIHtcbiAgY29uc3QgdG9rZW5zID0gZ2V0VG9rZW5zT3JDb21tZW50c0JlZm9yZShzb3VyY2VDb2RlLCBub2RlLCAxMDApXG4gIGNvbnN0IHJlc3VsdCA9IFtdXG4gIGZvciAobGV0IGkgPSB0b2tlbnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAoY29uZGl0aW9uKHRva2Vuc1tpXSkpIHtcbiAgICAgIHJlc3VsdC5wdXNoKHRva2Vuc1tpXSlcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0LnJldmVyc2UoKVxufVxuXG5mdW5jdGlvbiBmaW5kT3V0T2ZPcmRlcihpbXBvcnRlZCkge1xuICBpZiAoaW1wb3J0ZWQubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIFtdXG4gIH1cbiAgbGV0IG1heFNlZW5SYW5rTm9kZSA9IGltcG9ydGVkWzBdXG4gIHJldHVybiBpbXBvcnRlZC5maWx0ZXIoZnVuY3Rpb24gKGltcG9ydGVkTW9kdWxlKSB7XG4gICAgY29uc3QgcmVzID0gaW1wb3J0ZWRNb2R1bGUucmFuayA8IG1heFNlZW5SYW5rTm9kZS5yYW5rXG4gICAgaWYgKG1heFNlZW5SYW5rTm9kZS5yYW5rIDwgaW1wb3J0ZWRNb2R1bGUucmFuaykge1xuICAgICAgbWF4U2VlblJhbmtOb2RlID0gaW1wb3J0ZWRNb2R1bGVcbiAgICB9XG4gICAgcmV0dXJuIHJlc1xuICB9KVxufVxuXG5mdW5jdGlvbiBmaW5kUm9vdE5vZGUobm9kZSkge1xuICBsZXQgcGFyZW50ID0gbm9kZVxuICB3aGlsZSAocGFyZW50LnBhcmVudCAhPSBudWxsICYmIHBhcmVudC5wYXJlbnQuYm9keSA9PSBudWxsKSB7XG4gICAgcGFyZW50ID0gcGFyZW50LnBhcmVudFxuICB9XG4gIHJldHVybiBwYXJlbnRcbn1cblxuZnVuY3Rpb24gZmluZEVuZE9mTGluZVdpdGhDb21tZW50cyhzb3VyY2VDb2RlLCBub2RlKSB7XG4gIGNvbnN0IHRva2Vuc1RvRW5kT2ZMaW5lID0gdGFrZVRva2Vuc0FmdGVyV2hpbGUoc291cmNlQ29kZSwgbm9kZSwgY29tbWVudE9uU2FtZUxpbmVBcyhub2RlKSlcbiAgbGV0IGVuZE9mVG9rZW5zID0gdG9rZW5zVG9FbmRPZkxpbmUubGVuZ3RoID4gMFxuICAgID8gdG9rZW5zVG9FbmRPZkxpbmVbdG9rZW5zVG9FbmRPZkxpbmUubGVuZ3RoIC0gMV0ucmFuZ2VbMV1cbiAgICA6IG5vZGUucmFuZ2VbMV1cbiAgbGV0IHJlc3VsdCA9IGVuZE9mVG9rZW5zXG4gIGZvciAobGV0IGkgPSBlbmRPZlRva2VuczsgaSA8IHNvdXJjZUNvZGUudGV4dC5sZW5ndGg7IGkrKykge1xuICAgIGlmIChzb3VyY2VDb2RlLnRleHRbaV0gPT09ICdcXG4nKSB7XG4gICAgICByZXN1bHQgPSBpICsgMVxuICAgICAgYnJlYWtcbiAgICB9XG4gICAgaWYgKHNvdXJjZUNvZGUudGV4dFtpXSAhPT0gJyAnICYmIHNvdXJjZUNvZGUudGV4dFtpXSAhPT0gJ1xcdCcgJiYgc291cmNlQ29kZS50ZXh0W2ldICE9PSAnXFxyJykge1xuICAgICAgYnJlYWtcbiAgICB9XG4gICAgcmVzdWx0ID0gaSArIDFcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbmZ1bmN0aW9uIGNvbW1lbnRPblNhbWVMaW5lQXMobm9kZSkge1xuICByZXR1cm4gdG9rZW4gPT4gKHRva2VuLnR5cGUgPT09ICdCbG9jaycgfHwgIHRva2VuLnR5cGUgPT09ICdMaW5lJykgJiZcbiAgICAgIHRva2VuLmxvYy5zdGFydC5saW5lID09PSB0b2tlbi5sb2MuZW5kLmxpbmUgJiZcbiAgICAgIHRva2VuLmxvYy5lbmQubGluZSA9PT0gbm9kZS5sb2MuZW5kLmxpbmVcbn1cblxuZnVuY3Rpb24gZmluZFN0YXJ0T2ZMaW5lV2l0aENvbW1lbnRzKHNvdXJjZUNvZGUsIG5vZGUpIHtcbiAgY29uc3QgdG9rZW5zVG9FbmRPZkxpbmUgPSB0YWtlVG9rZW5zQmVmb3JlV2hpbGUoc291cmNlQ29kZSwgbm9kZSwgY29tbWVudE9uU2FtZUxpbmVBcyhub2RlKSlcbiAgbGV0IHN0YXJ0T2ZUb2tlbnMgPSB0b2tlbnNUb0VuZE9mTGluZS5sZW5ndGggPiAwID8gdG9rZW5zVG9FbmRPZkxpbmVbMF0ucmFuZ2VbMF0gOiBub2RlLnJhbmdlWzBdXG4gIGxldCByZXN1bHQgPSBzdGFydE9mVG9rZW5zXG4gIGZvciAobGV0IGkgPSBzdGFydE9mVG9rZW5zIC0gMTsgaSA+IDA7IGktLSkge1xuICAgIGlmIChzb3VyY2VDb2RlLnRleHRbaV0gIT09ICcgJyAmJiBzb3VyY2VDb2RlLnRleHRbaV0gIT09ICdcXHQnKSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgICByZXN1bHQgPSBpXG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG5mdW5jdGlvbiBpc1BsYWluUmVxdWlyZU1vZHVsZShub2RlKSB7XG4gIGlmIChub2RlLnR5cGUgIT09ICdWYXJpYWJsZURlY2xhcmF0aW9uJykge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG4gIGlmIChub2RlLmRlY2xhcmF0aW9ucy5sZW5ndGggIT09IDEpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICBjb25zdCBkZWNsID0gbm9kZS5kZWNsYXJhdGlvbnNbMF1cbiAgY29uc3QgcmVzdWx0ID0gKGRlY2wuaWQgIT0gbnVsbCAmJiAgZGVjbC5pZC50eXBlID09PSAnSWRlbnRpZmllcicpICYmXG4gICAgZGVjbC5pbml0ICE9IG51bGwgJiZcbiAgICBkZWNsLmluaXQudHlwZSA9PT0gJ0NhbGxFeHByZXNzaW9uJyAmJlxuICAgIGRlY2wuaW5pdC5jYWxsZWUgIT0gbnVsbCAmJlxuICAgIGRlY2wuaW5pdC5jYWxsZWUubmFtZSA9PT0gJ3JlcXVpcmUnICYmXG4gICAgZGVjbC5pbml0LmFyZ3VtZW50cyAhPSBudWxsICYmXG4gICAgZGVjbC5pbml0LmFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiZcbiAgICBkZWNsLmluaXQuYXJndW1lbnRzWzBdLnR5cGUgPT09ICdMaXRlcmFsJ1xuICByZXR1cm4gcmVzdWx0XG59XG5cbmZ1bmN0aW9uIGlzUGxhaW5JbXBvcnRNb2R1bGUobm9kZSkge1xuICByZXR1cm4gbm9kZS50eXBlID09PSAnSW1wb3J0RGVjbGFyYXRpb24nICYmIG5vZGUuc3BlY2lmaWVycyAhPSBudWxsICYmIG5vZGUuc3BlY2lmaWVycy5sZW5ndGggPiAwXG59XG5cbmZ1bmN0aW9uIGNhbkNyb3NzTm9kZVdoaWxlUmVvcmRlcihub2RlKSB7XG4gIHJldHVybiBpc1BsYWluUmVxdWlyZU1vZHVsZShub2RlKSB8fCBpc1BsYWluSW1wb3J0TW9kdWxlKG5vZGUpXG59XG5cbmZ1bmN0aW9uIGNhblJlb3JkZXJJdGVtcyhmaXJzdE5vZGUsIHNlY29uZE5vZGUpIHtcbiAgY29uc3QgcGFyZW50ID0gZmlyc3ROb2RlLnBhcmVudFxuICBjb25zdCBmaXJzdEluZGV4ID0gcGFyZW50LmJvZHkuaW5kZXhPZihmaXJzdE5vZGUpXG4gIGNvbnN0IHNlY29uZEluZGV4ID0gcGFyZW50LmJvZHkuaW5kZXhPZihzZWNvbmROb2RlKVxuICBjb25zdCBub2Rlc0JldHdlZW4gPSBwYXJlbnQuYm9keS5zbGljZShmaXJzdEluZGV4LCBzZWNvbmRJbmRleCArIDEpXG4gIGZvciAodmFyIG5vZGVCZXR3ZWVuIG9mIG5vZGVzQmV0d2Vlbikge1xuICAgIGlmICghY2FuQ3Jvc3NOb2RlV2hpbGVSZW9yZGVyKG5vZGVCZXR3ZWVuKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlXG59XG5cbmZ1bmN0aW9uIGZpeE91dE9mT3JkZXIoY29udGV4dCwgZmlyc3ROb2RlLCBzZWNvbmROb2RlLCBvcmRlcikge1xuICBjb25zdCBzb3VyY2VDb2RlID0gY29udGV4dC5nZXRTb3VyY2VDb2RlKClcblxuICBjb25zdCBmaXJzdFJvb3QgPSBmaW5kUm9vdE5vZGUoZmlyc3ROb2RlLm5vZGUpXG4gIGxldCBmaXJzdFJvb3RTdGFydCA9IGZpbmRTdGFydE9mTGluZVdpdGhDb21tZW50cyhzb3VyY2VDb2RlLCBmaXJzdFJvb3QpXG4gIGNvbnN0IGZpcnN0Um9vdEVuZCA9IGZpbmRFbmRPZkxpbmVXaXRoQ29tbWVudHMoc291cmNlQ29kZSwgZmlyc3RSb290KVxuXG4gIGNvbnN0IHNlY29uZFJvb3QgPSBmaW5kUm9vdE5vZGUoc2Vjb25kTm9kZS5ub2RlKVxuICBsZXQgc2Vjb25kUm9vdFN0YXJ0ID0gZmluZFN0YXJ0T2ZMaW5lV2l0aENvbW1lbnRzKHNvdXJjZUNvZGUsIHNlY29uZFJvb3QpXG4gIGxldCBzZWNvbmRSb290RW5kID0gZmluZEVuZE9mTGluZVdpdGhDb21tZW50cyhzb3VyY2VDb2RlLCBzZWNvbmRSb290KVxuICBjb25zdCBjYW5GaXggPSBjYW5SZW9yZGVySXRlbXMoZmlyc3RSb290LCBzZWNvbmRSb290KVxuXG4gIGxldCBuZXdDb2RlID0gc291cmNlQ29kZS50ZXh0LnN1YnN0cmluZyhzZWNvbmRSb290U3RhcnQsIHNlY29uZFJvb3RFbmQpXG4gIGlmIChuZXdDb2RlW25ld0NvZGUubGVuZ3RoIC0gMV0gIT09ICdcXG4nKSB7XG4gICAgbmV3Q29kZSA9IG5ld0NvZGUgKyAnXFxuJ1xuICB9XG5cbiAgY29uc3QgbWVzc2FnZSA9ICdgJyArIHNlY29uZE5vZGUubmFtZSArICdgIGltcG9ydCBzaG91bGQgb2NjdXIgJyArIG9yZGVyICtcbiAgICAgICcgaW1wb3J0IG9mIGAnICsgZmlyc3ROb2RlLm5hbWUgKyAnYCdcblxuICBpZiAob3JkZXIgPT09ICdiZWZvcmUnKSB7XG4gICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgbm9kZTogc2Vjb25kTm9kZS5ub2RlLFxuICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgIGZpeDogY2FuRml4ICYmIChmaXhlciA9PlxuICAgICAgICBmaXhlci5yZXBsYWNlVGV4dFJhbmdlKFxuICAgICAgICAgIFtmaXJzdFJvb3RTdGFydCwgc2Vjb25kUm9vdEVuZF0sXG4gICAgICAgICAgbmV3Q29kZSArIHNvdXJjZUNvZGUudGV4dC5zdWJzdHJpbmcoZmlyc3RSb290U3RhcnQsIHNlY29uZFJvb3RTdGFydClcbiAgICAgICAgKSksXG4gICAgfSlcbiAgfSBlbHNlIGlmIChvcmRlciA9PT0gJ2FmdGVyJykge1xuICAgIGNvbnRleHQucmVwb3J0KHtcbiAgICAgIG5vZGU6IHNlY29uZE5vZGUubm9kZSxcbiAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICBmaXg6IGNhbkZpeCAmJiAoZml4ZXIgPT5cbiAgICAgICAgZml4ZXIucmVwbGFjZVRleHRSYW5nZShcbiAgICAgICAgICBbc2Vjb25kUm9vdFN0YXJ0LCBmaXJzdFJvb3RFbmRdLFxuICAgICAgICAgIHNvdXJjZUNvZGUudGV4dC5zdWJzdHJpbmcoc2Vjb25kUm9vdEVuZCwgZmlyc3RSb290RW5kKSArIG5ld0NvZGVcbiAgICAgICAgKSksXG4gICAgfSlcbiAgfVxufVxuXG5mdW5jdGlvbiByZXBvcnRPdXRPZk9yZGVyKGNvbnRleHQsIGltcG9ydGVkLCBvdXRPZk9yZGVyLCBvcmRlcikge1xuICBvdXRPZk9yZGVyLmZvckVhY2goZnVuY3Rpb24gKGltcCkge1xuICAgIGNvbnN0IGZvdW5kID0gaW1wb3J0ZWQuZmluZChmdW5jdGlvbiBoYXNIaWdoZXJSYW5rKGltcG9ydGVkSXRlbSkge1xuICAgICAgcmV0dXJuIGltcG9ydGVkSXRlbS5yYW5rID4gaW1wLnJhbmtcbiAgICB9KVxuICAgIGZpeE91dE9mT3JkZXIoY29udGV4dCwgZm91bmQsIGltcCwgb3JkZXIpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIG1ha2VPdXRPZk9yZGVyUmVwb3J0KGNvbnRleHQsIGltcG9ydGVkKSB7XG4gIGNvbnN0IG91dE9mT3JkZXIgPSBmaW5kT3V0T2ZPcmRlcihpbXBvcnRlZClcbiAgaWYgKCFvdXRPZk9yZGVyLmxlbmd0aCkge1xuICAgIHJldHVyblxuICB9XG4gIC8vIFRoZXJlIGFyZSB0aGluZ3MgdG8gcmVwb3J0LiBUcnkgdG8gbWluaW1pemUgdGhlIG51bWJlciBvZiByZXBvcnRlZCBlcnJvcnMuXG4gIGNvbnN0IHJldmVyc2VkSW1wb3J0ZWQgPSByZXZlcnNlKGltcG9ydGVkKVxuICBjb25zdCByZXZlcnNlZE9yZGVyID0gZmluZE91dE9mT3JkZXIocmV2ZXJzZWRJbXBvcnRlZClcbiAgaWYgKHJldmVyc2VkT3JkZXIubGVuZ3RoIDwgb3V0T2ZPcmRlci5sZW5ndGgpIHtcbiAgICByZXBvcnRPdXRPZk9yZGVyKGNvbnRleHQsIHJldmVyc2VkSW1wb3J0ZWQsIHJldmVyc2VkT3JkZXIsICdhZnRlcicpXG4gICAgcmV0dXJuXG4gIH1cbiAgcmVwb3J0T3V0T2ZPcmRlcihjb250ZXh0LCBpbXBvcnRlZCwgb3V0T2ZPcmRlciwgJ2JlZm9yZScpXG59XG5cbi8vIERFVEVDVElOR1xuXG5mdW5jdGlvbiBjb21wdXRlUmFuayhjb250ZXh0LCByYW5rcywgbmFtZSwgdHlwZSwgZ3JvdXBzLCBub2RlKSB7XG4gIGxldCByYW5rVHlwZVxuICBpZiAodHlwZSA9PT0gJ2ltcG9ydCcgJiYgbm9kZS5pbXBvcnRLaW5kID09PSAndHlwZScpIHtcbiAgICByYW5rVHlwZSA9ICdmbG93J1xuICB9IGVsc2Uge1xuICAgIHJhbmtUeXBlID0gaW1wb3J0VHlwZShuYW1lLCBjb250ZXh0LCBncm91cHMpXG4gIH1cblxuICByZXR1cm4gcmFua3NbcmFua1R5cGVdICtcbiAgICAodHlwZSA9PT0gJ2ltcG9ydCcgPyAwIDogMTAwKVxufVxuXG5mdW5jdGlvbiByZWdpc3Rlck5vZGUoY29udGV4dCwgbm9kZSwgbmFtZSwgdHlwZSwgcmFua3MsIGltcG9ydGVkLCBncm91cHMpIHtcbiAgY29uc3QgcmFuayA9IGNvbXB1dGVSYW5rKGNvbnRleHQsIHJhbmtzLCBuYW1lLCB0eXBlLCBncm91cHMsIG5vZGUpXG5cbiAgaWYgKHJhbmsgIT09IC0xKSB7XG4gICAgaW1wb3J0ZWQucHVzaCh7bmFtZSwgcmFuaywgbm9kZX0pXG4gIH1cbn1cblxuZnVuY3Rpb24gaXNJblZhcmlhYmxlRGVjbGFyYXRvcihub2RlKSB7XG4gIHJldHVybiBub2RlICYmXG4gICAgKG5vZGUudHlwZSA9PT0gJ1ZhcmlhYmxlRGVjbGFyYXRvcicgfHwgaXNJblZhcmlhYmxlRGVjbGFyYXRvcihub2RlLnBhcmVudCkpXG59XG5cbmNvbnN0IHR5cGVzID0gW1xuICAnYnVpbHRpbicsXG4gICdleHRlcm5hbCcsXG4gICdwcml2YXRlJyxcbiAgJ2ludGVybmFsJyxcbiAgJ3BhcmVudCcsXG4gICdzaWJsaW5nJyxcbiAgJ2luZGV4JyxcbiAgJ2Fic29sdXRlJyxcbiAgJ2Zsb3cnLFxuXVxuXG4vLyBDcmVhdGVzIGFuIG9iamVjdCB3aXRoIHR5cGUtcmFuayBwYWlycy5cbi8vIEV4YW1wbGU6IHsgaW5kZXg6IDAsIHNpYmxpbmc6IDEsIHBhcmVudDogMSwgZXh0ZXJuYWw6IDEsIGJ1aWx0aW46IDIsIGludGVybmFsOiAyIH1cbi8vIFdpbGwgdGhyb3cgYW4gZXJyb3IgaWYgaXQgY29udGFpbnMgYSB0eXBlIHRoYXQgZG9lcyBub3QgZXhpc3QsIG9yIGhhcyBhIGR1cGxpY2F0ZVxuZnVuY3Rpb24gY29udmVydEdyb3Vwc1RvUmFua3MoZ3JvdXBzKSB7XG4gIGNvbnN0IHJhbmtPYmplY3QgPSBncm91cHMucmVkdWNlKGZ1bmN0aW9uKHJlcywgZ3JvdXAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBncm91cCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGdyb3VwID0gW2dyb3VwXVxuICAgIH1cblxuICAgIGlmIChcbiAgICAgIHR5cGVvZiBncm91cCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIGdyb3VwICE9PSBudWxsICYmXG4gICAgICBncm91cC5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0XG4gICAgKSB7XG4gICAgICBncm91cCA9IFtncm91cF1cbiAgICB9XG5cbiAgICBncm91cC5mb3JFYWNoKGZ1bmN0aW9uKGdyb3VwSXRlbSkge1xuICAgICAgaWYgKFxuICAgICAgICB0eXBlb2YgZ3JvdXBJdGVtID09PSAnb2JqZWN0JyAmJlxuICAgICAgICBncm91cEl0ZW0gIT09IG51bGwgJiZcbiAgICAgICAgZ3JvdXBJdGVtLmNvbnN0cnVjdG9yID09PSBPYmplY3QgJiZcbiAgICAgICAgZ3JvdXBJdGVtLm5hbWVcbiAgICAgICkge1xuICAgICAgICBncm91cEl0ZW0gPSBncm91cEl0ZW0ubmFtZVxuICAgICAgfVxuXG4gICAgICBjb25zdCBpc0NvcnJlY3RHcm91cCA9IHR5cGVzLmZpbmQoKHR5cGVJdGVtKSA9PiB0eXBlSXRlbSA9PT0gZ3JvdXBJdGVtKVxuXG4gICAgICBpZiAoIWlzQ29ycmVjdEdyb3VwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW5jb3JyZWN0IGNvbmZpZ3VyYXRpb24gb2YgdGhlIHJ1bGU6IFVua25vd24gdHlwZSBgJyArXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkoZ3JvdXBJdGVtKSArICdgJylcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc1tncm91cEl0ZW1dICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbmNvcnJlY3QgY29uZmlndXJhdGlvbiBvZiB0aGUgcnVsZTogYCcgKyBncm91cEl0ZW0gKyAnYCBpcyBkdXBsaWNhdGVkJylcbiAgICAgIH1cblxuICAgICAgcmVzW2dyb3VwSXRlbV0gPSBpbmRleFxuICAgIH0pXG5cbiAgICByZXR1cm4gcmVzXG4gIH0sIHt9KVxuXG4gIGNvbnN0IG9taXR0ZWRUeXBlcyA9IHR5cGVzLmZpbHRlcihmdW5jdGlvbih0eXBlKSB7XG4gICAgcmV0dXJuIHJhbmtPYmplY3RbdHlwZV0gPT09IHVuZGVmaW5lZFxuICB9KVxuXG4gIHJldHVybiBvbWl0dGVkVHlwZXMucmVkdWNlKGZ1bmN0aW9uKHJlcywgdHlwZSkge1xuICAgIHJlc1t0eXBlXSA9IGdyb3Vwcy5sZW5ndGhcblxuICAgIHJldHVybiByZXNcbiAgfSwgcmFua09iamVjdClcbn1cblxuZnVuY3Rpb24gZml4TmV3TGluZUFmdGVySW1wb3J0KGNvbnRleHQsIHByZXZpb3VzSW1wb3J0KSB7XG4gIGNvbnN0IHByZXZSb290ID0gZmluZFJvb3ROb2RlKHByZXZpb3VzSW1wb3J0Lm5vZGUpXG4gIGNvbnN0IHRva2Vuc1RvRW5kT2ZMaW5lID0gdGFrZVRva2Vuc0FmdGVyV2hpbGUoXG4gICAgY29udGV4dC5nZXRTb3VyY2VDb2RlKCksIHByZXZSb290LCBjb21tZW50T25TYW1lTGluZUFzKHByZXZSb290KSlcblxuICBsZXQgZW5kT2ZMaW5lID0gcHJldlJvb3QucmFuZ2VbMV1cbiAgaWYgKHRva2Vuc1RvRW5kT2ZMaW5lLmxlbmd0aCA+IDApIHtcbiAgICBlbmRPZkxpbmUgPSB0b2tlbnNUb0VuZE9mTGluZVt0b2tlbnNUb0VuZE9mTGluZS5sZW5ndGggLSAxXS5yYW5nZVsxXVxuICB9XG4gIHJldHVybiAoZml4ZXIpID0+IGZpeGVyLmluc2VydFRleHRBZnRlclJhbmdlKFtwcmV2Um9vdC5yYW5nZVswXSwgZW5kT2ZMaW5lXSwgJ1xcbicpXG59XG5cbmZ1bmN0aW9uIHJlbW92ZU5ld0xpbmVBZnRlckltcG9ydChjb250ZXh0LCBjdXJyZW50SW1wb3J0LCBwcmV2aW91c0ltcG9ydCkge1xuICBjb25zdCBzb3VyY2VDb2RlID0gY29udGV4dC5nZXRTb3VyY2VDb2RlKClcbiAgY29uc3QgcHJldlJvb3QgPSBmaW5kUm9vdE5vZGUocHJldmlvdXNJbXBvcnQubm9kZSlcbiAgY29uc3QgY3VyclJvb3QgPSBmaW5kUm9vdE5vZGUoY3VycmVudEltcG9ydC5ub2RlKVxuICBjb25zdCByYW5nZVRvUmVtb3ZlID0gW1xuICAgIGZpbmRFbmRPZkxpbmVXaXRoQ29tbWVudHMoc291cmNlQ29kZSwgcHJldlJvb3QpLFxuICAgIGZpbmRTdGFydE9mTGluZVdpdGhDb21tZW50cyhzb3VyY2VDb2RlLCBjdXJyUm9vdCksXG4gIF1cbiAgaWYgKC9eXFxzKiQvLnRlc3Qoc291cmNlQ29kZS50ZXh0LnN1YnN0cmluZyhyYW5nZVRvUmVtb3ZlWzBdLCByYW5nZVRvUmVtb3ZlWzFdKSkpIHtcbiAgICByZXR1cm4gKGZpeGVyKSA9PiBmaXhlci5yZW1vdmVSYW5nZShyYW5nZVRvUmVtb3ZlKVxuICB9XG4gIHJldHVybiB1bmRlZmluZWRcbn1cblxuZnVuY3Rpb24gbWFrZU5ld2xpbmVzQmV0d2VlblJlcG9ydCAoY29udGV4dCwgaW1wb3J0ZWQsIG5ld2xpbmVzQmV0d2VlbkltcG9ydHMpIHtcbiAgY29uc3QgZ2V0TnVtYmVyT2ZFbXB0eUxpbmVzQmV0d2VlbiA9IChjdXJyZW50SW1wb3J0LCBwcmV2aW91c0ltcG9ydCkgPT4ge1xuICAgIGNvbnN0IGxpbmVzQmV0d2VlbkltcG9ydHMgPSBjb250ZXh0LmdldFNvdXJjZUNvZGUoKS5saW5lcy5zbGljZShcbiAgICAgIHByZXZpb3VzSW1wb3J0Lm5vZGUubG9jLmVuZC5saW5lLFxuICAgICAgY3VycmVudEltcG9ydC5ub2RlLmxvYy5zdGFydC5saW5lIC0gMVxuICAgIClcblxuICAgIHJldHVybiBsaW5lc0JldHdlZW5JbXBvcnRzLmZpbHRlcigobGluZSkgPT4gIWxpbmUudHJpbSgpLmxlbmd0aCkubGVuZ3RoXG4gIH1cbiAgbGV0IHByZXZpb3VzSW1wb3J0ID0gaW1wb3J0ZWRbMF1cblxuICBpbXBvcnRlZC5zbGljZSgxKS5mb3JFYWNoKGZ1bmN0aW9uKGN1cnJlbnRJbXBvcnQpIHtcbiAgICBjb25zdCBlbXB0eUxpbmVzQmV0d2VlbiA9IGdldE51bWJlck9mRW1wdHlMaW5lc0JldHdlZW4oY3VycmVudEltcG9ydCwgcHJldmlvdXNJbXBvcnQpXG5cbiAgICBpZiAobmV3bGluZXNCZXR3ZWVuSW1wb3J0cyA9PT0gJ2Fsd2F5cydcbiAgICAgICAgfHwgbmV3bGluZXNCZXR3ZWVuSW1wb3J0cyA9PT0gJ2Fsd2F5cy1hbmQtaW5zaWRlLWdyb3VwcycpIHtcbiAgICAgIGlmIChjdXJyZW50SW1wb3J0LnJhbmsgIT09IHByZXZpb3VzSW1wb3J0LnJhbmsgJiYgZW1wdHlMaW5lc0JldHdlZW4gPT09IDApIHtcbiAgICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICAgIG5vZGU6IHByZXZpb3VzSW1wb3J0Lm5vZGUsXG4gICAgICAgICAgbWVzc2FnZTogJ1RoZXJlIHNob3VsZCBiZSBhdCBsZWFzdCBvbmUgZW1wdHkgbGluZSBiZXR3ZWVuIGltcG9ydCBncm91cHMnLFxuICAgICAgICAgIGZpeDogZml4TmV3TGluZUFmdGVySW1wb3J0KGNvbnRleHQsIHByZXZpb3VzSW1wb3J0LCBjdXJyZW50SW1wb3J0KSxcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSBpZiAoY3VycmVudEltcG9ydC5yYW5rID09PSBwcmV2aW91c0ltcG9ydC5yYW5rXG4gICAgICAgICYmIGVtcHR5TGluZXNCZXR3ZWVuID4gMFxuICAgICAgICAmJiBuZXdsaW5lc0JldHdlZW5JbXBvcnRzICE9PSAnYWx3YXlzLWFuZC1pbnNpZGUtZ3JvdXBzJykge1xuICAgICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgICAgbm9kZTogcHJldmlvdXNJbXBvcnQubm9kZSxcbiAgICAgICAgICBtZXNzYWdlOiAnVGhlcmUgc2hvdWxkIGJlIG5vIGVtcHR5IGxpbmUgd2l0aGluIGltcG9ydCBncm91cCcsXG4gICAgICAgICAgZml4OiByZW1vdmVOZXdMaW5lQWZ0ZXJJbXBvcnQoY29udGV4dCwgY3VycmVudEltcG9ydCwgcHJldmlvdXNJbXBvcnQpLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZW1wdHlMaW5lc0JldHdlZW4gPiAwKSB7XG4gICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgIG5vZGU6IHByZXZpb3VzSW1wb3J0Lm5vZGUsXG4gICAgICAgIG1lc3NhZ2U6ICdUaGVyZSBzaG91bGQgYmUgbm8gZW1wdHkgbGluZSBiZXR3ZWVuIGltcG9ydCBncm91cHMnLFxuICAgICAgICBmaXg6IHJlbW92ZU5ld0xpbmVBZnRlckltcG9ydChjb250ZXh0LCBjdXJyZW50SW1wb3J0LCBwcmV2aW91c0ltcG9ydCksXG4gICAgICB9KVxuICAgIH1cblxuICAgIHByZXZpb3VzSW1wb3J0ID0gY3VycmVudEltcG9ydFxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbWV0YToge1xuICAgIGRvY3M6IHtcbiAgICAgIHVybDogZG9jc1VybCgnb3JkZXInKSxcbiAgICB9LFxuXG4gICAgZml4YWJsZTogJ2NvZGUnLFxuICAgIHNjaGVtYTogW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgIGdyb3Vwczoge1xuICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICB9LFxuICAgICAgICAgICduZXdsaW5lcy1iZXR3ZWVuJzoge1xuICAgICAgICAgICAgZW51bTogW1xuICAgICAgICAgICAgICAnaWdub3JlJyxcbiAgICAgICAgICAgICAgJ2Fsd2F5cycsXG4gICAgICAgICAgICAgICdhbHdheXMtYW5kLWluc2lkZS1ncm91cHMnLFxuICAgICAgICAgICAgICAnbmV2ZXInLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBhZGRpdGlvbmFsUHJvcGVydGllczogZmFsc2UsXG4gICAgICB9LFxuICAgIF0sXG4gIH0sXG5cbiAgY3JlYXRlOiBmdW5jdGlvbiBpbXBvcnRPcmRlclJ1bGUgKGNvbnRleHQpIHtcbiAgICBjb25zdCBvcHRpb25zID0gY29udGV4dC5vcHRpb25zWzBdIHx8IHt9XG4gICAgY29uc3QgZ3JvdXBzID0gb3B0aW9ucy5ncm91cHMgfHwgZGVmYXVsdEdyb3Vwc1xuICAgIGNvbnN0IG5ld2xpbmVzQmV0d2VlbkltcG9ydHMgPSBvcHRpb25zWyduZXdsaW5lcy1iZXR3ZWVuJ10gfHwgJ2lnbm9yZSdcbiAgICBsZXQgcmFua3NcblxuICAgIHRyeSB7XG4gICAgICByYW5rcyA9IGNvbnZlcnRHcm91cHNUb1JhbmtzKGdyb3VwcylcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBNYWxmb3JtZWQgY29uZmlndXJhdGlvblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgUHJvZ3JhbTogZnVuY3Rpb24obm9kZSkge1xuICAgICAgICAgIGNvbnRleHQucmVwb3J0KG5vZGUsIGVycm9yLm1lc3NhZ2UpXG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IGltcG9ydGVkID0gW11cbiAgICBsZXQgbGV2ZWwgPSAwXG5cbiAgICBmdW5jdGlvbiBpbmNyZW1lbnRMZXZlbCgpIHtcbiAgICAgIGxldmVsKytcbiAgICB9XG4gICAgZnVuY3Rpb24gZGVjcmVtZW50TGV2ZWwoKSB7XG4gICAgICBsZXZlbC0tXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIEltcG9ydERlY2xhcmF0aW9uOiBmdW5jdGlvbiBoYW5kbGVJbXBvcnRzKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUuc3BlY2lmaWVycy5sZW5ndGgpIHsgLy8gSWdub3JpbmcgdW5hc3NpZ25lZCBpbXBvcnRzXG4gICAgICAgICAgY29uc3QgbmFtZSA9IG5vZGUuc291cmNlLnZhbHVlXG4gICAgICAgICAgcmVnaXN0ZXJOb2RlKGNvbnRleHQsIG5vZGUsIG5hbWUsICdpbXBvcnQnLCByYW5rcywgaW1wb3J0ZWQsIGdyb3VwcylcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIENhbGxFeHByZXNzaW9uOiBmdW5jdGlvbiBoYW5kbGVSZXF1aXJlcyhub2RlKSB7XG4gICAgICAgIGlmIChsZXZlbCAhPT0gMCB8fCAhaXNTdGF0aWNSZXF1aXJlKG5vZGUpIHx8ICFpc0luVmFyaWFibGVEZWNsYXJhdG9yKG5vZGUucGFyZW50KSkge1xuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5hbWUgPSBub2RlLmFyZ3VtZW50c1swXS52YWx1ZVxuICAgICAgICByZWdpc3Rlck5vZGUoY29udGV4dCwgbm9kZSwgbmFtZSwgJ3JlcXVpcmUnLCByYW5rcywgaW1wb3J0ZWQsIGdyb3VwcylcbiAgICAgIH0sXG4gICAgICAnUHJvZ3JhbTpleGl0JzogZnVuY3Rpb24gcmVwb3J0QW5kUmVzZXQoKSB7XG4gICAgICAgIG1ha2VPdXRPZk9yZGVyUmVwb3J0KGNvbnRleHQsIGltcG9ydGVkKVxuXG4gICAgICAgIGlmIChuZXdsaW5lc0JldHdlZW5JbXBvcnRzICE9PSAnaWdub3JlJykge1xuICAgICAgICAgIG1ha2VOZXdsaW5lc0JldHdlZW5SZXBvcnQoY29udGV4dCwgaW1wb3J0ZWQsIG5ld2xpbmVzQmV0d2VlbkltcG9ydHMpXG4gICAgICAgIH1cblxuICAgICAgICBpbXBvcnRlZCA9IFtdXG4gICAgICB9LFxuICAgICAgRnVuY3Rpb25EZWNsYXJhdGlvbjogaW5jcmVtZW50TGV2ZWwsXG4gICAgICBGdW5jdGlvbkV4cHJlc3Npb246IGluY3JlbWVudExldmVsLFxuICAgICAgQXJyb3dGdW5jdGlvbkV4cHJlc3Npb246IGluY3JlbWVudExldmVsLFxuICAgICAgQmxvY2tTdGF0ZW1lbnQ6IGluY3JlbWVudExldmVsLFxuICAgICAgT2JqZWN0RXhwcmVzc2lvbjogaW5jcmVtZW50TGV2ZWwsXG4gICAgICAnRnVuY3Rpb25EZWNsYXJhdGlvbjpleGl0JzogZGVjcmVtZW50TGV2ZWwsXG4gICAgICAnRnVuY3Rpb25FeHByZXNzaW9uOmV4aXQnOiBkZWNyZW1lbnRMZXZlbCxcbiAgICAgICdBcnJvd0Z1bmN0aW9uRXhwcmVzc2lvbjpleGl0JzogZGVjcmVtZW50TGV2ZWwsXG4gICAgICAnQmxvY2tTdGF0ZW1lbnQ6ZXhpdCc6IGRlY3JlbWVudExldmVsLFxuICAgICAgJ09iamVjdEV4cHJlc3Npb246ZXhpdCc6IGRlY3JlbWVudExldmVsLFxuICAgIH1cbiAgfSxcbn1cbiJdfQ==