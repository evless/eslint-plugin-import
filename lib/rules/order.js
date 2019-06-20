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
  const result = decl.id && (decl.id.type === 'Identifier' || decl.id.type === 'ObjectPattern') && decl.init != null && decl.init.type === 'CallExpression' && decl.init.callee != null && decl.init.callee.name === 'require' && decl.init.arguments != null && decl.init.arguments.length === 1 && decl.init.arguments[0].type === 'Literal';
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
    type: 'suggestion',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydWxlcy9vcmRlci5qcyJdLCJuYW1lcyI6WyJkZWZhdWx0R3JvdXBzIiwicmV2ZXJzZSIsImFycmF5IiwibWFwIiwidiIsIm5hbWUiLCJyYW5rIiwibm9kZSIsImdldFRva2Vuc09yQ29tbWVudHNBZnRlciIsInNvdXJjZUNvZGUiLCJjb3VudCIsImN1cnJlbnROb2RlT3JUb2tlbiIsInJlc3VsdCIsImkiLCJnZXRUb2tlbk9yQ29tbWVudEFmdGVyIiwicHVzaCIsImdldFRva2Vuc09yQ29tbWVudHNCZWZvcmUiLCJnZXRUb2tlbk9yQ29tbWVudEJlZm9yZSIsInRha2VUb2tlbnNBZnRlcldoaWxlIiwiY29uZGl0aW9uIiwidG9rZW5zIiwibGVuZ3RoIiwidGFrZVRva2Vuc0JlZm9yZVdoaWxlIiwiZmluZE91dE9mT3JkZXIiLCJpbXBvcnRlZCIsIm1heFNlZW5SYW5rTm9kZSIsImZpbHRlciIsImltcG9ydGVkTW9kdWxlIiwicmVzIiwiZmluZFJvb3ROb2RlIiwicGFyZW50IiwiYm9keSIsImZpbmRFbmRPZkxpbmVXaXRoQ29tbWVudHMiLCJ0b2tlbnNUb0VuZE9mTGluZSIsImNvbW1lbnRPblNhbWVMaW5lQXMiLCJlbmRPZlRva2VucyIsInJhbmdlIiwidGV4dCIsInRva2VuIiwidHlwZSIsImxvYyIsInN0YXJ0IiwibGluZSIsImVuZCIsImZpbmRTdGFydE9mTGluZVdpdGhDb21tZW50cyIsInN0YXJ0T2ZUb2tlbnMiLCJpc1BsYWluUmVxdWlyZU1vZHVsZSIsImRlY2xhcmF0aW9ucyIsImRlY2wiLCJpZCIsImluaXQiLCJjYWxsZWUiLCJhcmd1bWVudHMiLCJpc1BsYWluSW1wb3J0TW9kdWxlIiwic3BlY2lmaWVycyIsImNhbkNyb3NzTm9kZVdoaWxlUmVvcmRlciIsImNhblJlb3JkZXJJdGVtcyIsImZpcnN0Tm9kZSIsInNlY29uZE5vZGUiLCJmaXJzdEluZGV4IiwiaW5kZXhPZiIsInNlY29uZEluZGV4Iiwibm9kZXNCZXR3ZWVuIiwic2xpY2UiLCJub2RlQmV0d2VlbiIsImZpeE91dE9mT3JkZXIiLCJjb250ZXh0Iiwib3JkZXIiLCJnZXRTb3VyY2VDb2RlIiwiZmlyc3RSb290IiwiZmlyc3RSb290U3RhcnQiLCJmaXJzdFJvb3RFbmQiLCJzZWNvbmRSb290Iiwic2Vjb25kUm9vdFN0YXJ0Iiwic2Vjb25kUm9vdEVuZCIsImNhbkZpeCIsIm5ld0NvZGUiLCJzdWJzdHJpbmciLCJtZXNzYWdlIiwicmVwb3J0IiwiZml4IiwiZml4ZXIiLCJyZXBsYWNlVGV4dFJhbmdlIiwicmVwb3J0T3V0T2ZPcmRlciIsIm91dE9mT3JkZXIiLCJmb3JFYWNoIiwiaW1wIiwiZm91bmQiLCJmaW5kIiwiaGFzSGlnaGVyUmFuayIsImltcG9ydGVkSXRlbSIsIm1ha2VPdXRPZk9yZGVyUmVwb3J0IiwicmV2ZXJzZWRJbXBvcnRlZCIsInJldmVyc2VkT3JkZXIiLCJjb21wdXRlUmFuayIsInJhbmtzIiwiZ3JvdXBzIiwicmFua1R5cGUiLCJpbXBvcnRLaW5kIiwicmVnaXN0ZXJOb2RlIiwiaXNJblZhcmlhYmxlRGVjbGFyYXRvciIsInR5cGVzIiwiY29udmVydEdyb3Vwc1RvUmFua3MiLCJyYW5rT2JqZWN0IiwicmVkdWNlIiwiZ3JvdXAiLCJpbmRleCIsImNvbnN0cnVjdG9yIiwiT2JqZWN0IiwiZ3JvdXBJdGVtIiwiaXNDb3JyZWN0R3JvdXAiLCJ0eXBlSXRlbSIsIkVycm9yIiwiSlNPTiIsInN0cmluZ2lmeSIsInVuZGVmaW5lZCIsIm9taXR0ZWRUeXBlcyIsImZpeE5ld0xpbmVBZnRlckltcG9ydCIsInByZXZpb3VzSW1wb3J0IiwicHJldlJvb3QiLCJlbmRPZkxpbmUiLCJpbnNlcnRUZXh0QWZ0ZXJSYW5nZSIsInJlbW92ZU5ld0xpbmVBZnRlckltcG9ydCIsImN1cnJlbnRJbXBvcnQiLCJjdXJyUm9vdCIsInJhbmdlVG9SZW1vdmUiLCJ0ZXN0IiwicmVtb3ZlUmFuZ2UiLCJtYWtlTmV3bGluZXNCZXR3ZWVuUmVwb3J0IiwibmV3bGluZXNCZXR3ZWVuSW1wb3J0cyIsImdldE51bWJlck9mRW1wdHlMaW5lc0JldHdlZW4iLCJsaW5lc0JldHdlZW5JbXBvcnRzIiwibGluZXMiLCJ0cmltIiwiZW1wdHlMaW5lc0JldHdlZW4iLCJtb2R1bGUiLCJleHBvcnRzIiwibWV0YSIsImRvY3MiLCJ1cmwiLCJmaXhhYmxlIiwic2NoZW1hIiwicHJvcGVydGllcyIsImVudW0iLCJhZGRpdGlvbmFsUHJvcGVydGllcyIsImNyZWF0ZSIsImltcG9ydE9yZGVyUnVsZSIsIm9wdGlvbnMiLCJlcnJvciIsIlByb2dyYW0iLCJsZXZlbCIsImluY3JlbWVudExldmVsIiwiZGVjcmVtZW50TGV2ZWwiLCJJbXBvcnREZWNsYXJhdGlvbiIsImhhbmRsZUltcG9ydHMiLCJzb3VyY2UiLCJ2YWx1ZSIsIkNhbGxFeHByZXNzaW9uIiwiaGFuZGxlUmVxdWlyZXMiLCJyZXBvcnRBbmRSZXNldCIsIkZ1bmN0aW9uRGVjbGFyYXRpb24iLCJGdW5jdGlvbkV4cHJlc3Npb24iLCJBcnJvd0Z1bmN0aW9uRXhwcmVzc2lvbiIsIkJsb2NrU3RhdGVtZW50IiwiT2JqZWN0RXhwcmVzc2lvbiJdLCJtYXBwaW5ncyI6IkFBQUE7O0FBRUE7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFQSxNQUFNQSxnQkFBZ0IsQ0FBQyxTQUFELEVBQVksVUFBWixFQUF3QixTQUF4QixFQUFtQyxVQUFuQyxFQUErQyxRQUEvQyxFQUF5RCxTQUF6RCxFQUFvRSxPQUFwRSxFQUE2RSxNQUE3RSxDQUF0Qjs7QUFFQTs7QUFFQSxTQUFTQyxPQUFULENBQWlCQyxLQUFqQixFQUF3QjtBQUN0QixTQUFPQSxNQUFNQyxHQUFOLENBQVUsVUFBVUMsQ0FBVixFQUFhO0FBQzVCLFdBQU87QUFDTEMsWUFBTUQsRUFBRUMsSUFESDtBQUVMQyxZQUFNLENBQUNGLEVBQUVFLElBRko7QUFHTEMsWUFBTUgsRUFBRUc7QUFISCxLQUFQO0FBS0QsR0FOTSxFQU1KTixPQU5JLEVBQVA7QUFPRDs7QUFFRCxTQUFTTyx3QkFBVCxDQUFrQ0Ms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NkN5RyxzQkFBN0M7QUFDRDs7QUFFRHpHLG1CQUFXLEVBQVg7QUFDRCxPQXRCSTtBQXVCTHdJLDJCQUFxQlQsY0F2QmhCO0FBd0JMVSwwQkFBb0JWLGNBeEJmO0FBeUJMVywrQkFBeUJYLGNBekJwQjtBQTBCTFksc0JBQWdCWixjQTFCWDtBQTJCTGEsd0JBQWtCYixjQTNCYjtBQTRCTCxrQ0FBNEJDLGNBNUJ2QjtBQTZCTCxpQ0FBMkJBLGNBN0J0QjtBQThCTCxzQ0FBZ0NBLGNBOUIzQjtBQStCTCw2QkFBdUJBLGNBL0JsQjtBQWdDTCwrQkFBeUJBO0FBaENwQixLQUFQO0FBa0NEO0FBM0ZjLENBQWpCIiwiZmlsZSI6Im9yZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5cbmltcG9ydCBpbXBvcnRUeXBlIGZyb20gJy4uL2NvcmUvaW1wb3J0VHlwZSdcbmltcG9ydCBpc1N0YXRpY1JlcXVpcmUgZnJvbSAnLi4vY29yZS9zdGF0aWNSZXF1aXJlJ1xuaW1wb3J0IGRvY3NVcmwgZnJvbSAnLi4vZG9jc1VybCdcblxuY29uc3QgZGVmYXVsdEdyb3VwcyA9IFsnYnVpbHRpbicsICdleHRlcm5hbCcsICdwcml2YXRlJywgJ2Fic29sdXRlJywgJ3BhcmVudCcsICdzaWJsaW5nJywgJ2luZGV4JywgJ2Zsb3cnXVxuXG4vLyBSRVBPUlRJTkcgQU5EIEZJWElOR1xuXG5mdW5jdGlvbiByZXZlcnNlKGFycmF5KSB7XG4gIHJldHVybiBhcnJheS5tYXAoZnVuY3Rpb24gKHYpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogdi5uYW1lLFxuICAgICAgcmFuazogLXYucmFuayxcbiAgICAgIG5vZGU6IHYubm9kZSxcbiAgICB9XG4gIH0pLnJldmVyc2UoKVxufVxuXG5mdW5jdGlvbiBnZXRUb2tlbnNPckNvbW1lbnRzQWZ0ZXIoc291cmNlQ29kZSwgbm9kZSwgY291bnQpIHtcbiAgbGV0IGN1cnJlbnROb2RlT3JUb2tlbiA9IG5vZGVcbiAgY29uc3QgcmVzdWx0ID0gW11cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgY3VycmVudE5vZGVPclRva2VuID0gc291cmNlQ29kZS5nZXRUb2tlbk9yQ29tbWVudEFmdGVyKGN1cnJlbnROb2RlT3JUb2tlbilcbiAgICBpZiAoY3VycmVudE5vZGVPclRva2VuID09IG51bGwpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIHJlc3VsdC5wdXNoKGN1cnJlbnROb2RlT3JUb2tlbilcbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbmZ1bmN0aW9uIGdldFRva2Vuc09yQ29tbWVudHNCZWZvcmUoc291cmNlQ29kZSwgbm9kZSwgY291bnQpIHtcbiAgbGV0IGN1cnJlbnROb2RlT3JUb2tlbiA9IG5vZGVcbiAgY29uc3QgcmVzdWx0ID0gW11cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgY3VycmVudE5vZGVPclRva2VuID0gc291cmNlQ29kZS5nZXRUb2tlbk9yQ29tbWVudEJlZm9yZShjdXJyZW50Tm9kZU9yVG9rZW4pXG4gICAgaWYgKGN1cnJlbnROb2RlT3JUb2tlbiA9PSBudWxsKSB7XG4gICAgICBicmVha1xuICAgIH1cbiAgICByZXN1bHQucHVzaChjdXJyZW50Tm9kZU9yVG9rZW4pXG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5yZXZlcnNlKClcbn1cblxuZnVuY3Rpb24gdGFrZVRva2Vuc0FmdGVyV2hpbGUoc291cmNlQ29kZSwgbm9kZSwgY29uZGl0aW9uKSB7XG4gIGNvbnN0IHRva2VucyA9IGdldFRva2Vuc09yQ29tbWVudHNBZnRlcihzb3VyY2VDb2RlLCBub2RlLCAxMDApXG4gIGNvbnN0IHJlc3VsdCA9IFtdXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGNvbmRpdGlvbih0b2tlbnNbaV0pKSB7XG4gICAgICByZXN1bHQucHVzaCh0b2tlbnNbaV0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG5mdW5jdGlvbiB0YWtlVG9rZW5zQmVmb3JlV2hpbGUoc291cmNlQ29kZSwgbm9kZSwgY29uZGl0aW9uKSB7XG4gIGNvbnN0IHRva2VucyA9IGdldFRva2Vuc09yQ29tbWVudHNCZWZvcmUoc291cmNlQ29kZSwgbm9kZSwgMTAwKVxuICBjb25zdCByZXN1bHQgPSBbXVxuICBmb3IgKGxldCBpID0gdG9rZW5zLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgaWYgKGNvbmRpdGlvbih0b2tlbnNbaV0pKSB7XG4gICAgICByZXN1bHQucHVzaCh0b2tlbnNbaV0pXG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5yZXZlcnNlKClcbn1cblxuZnVuY3Rpb24gZmluZE91dE9mT3JkZXIoaW1wb3J0ZWQpIHtcbiAgaWYgKGltcG9ydGVkLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBbXVxuICB9XG4gIGxldCBtYXhTZWVuUmFua05vZGUgPSBpbXBvcnRlZFswXVxuICByZXR1cm4gaW1wb3J0ZWQuZmlsdGVyKGZ1bmN0aW9uIChpbXBvcnRlZE1vZHVsZSkge1xuICAgIGNvbnN0IHJlcyA9IGltcG9ydGVkTW9kdWxlLnJhbmsgPCBtYXhTZWVuUmFua05vZGUucmFua1xuICAgIGlmIChtYXhTZWVuUmFua05vZGUucmFuayA8IGltcG9ydGVkTW9kdWxlLnJhbmspIHtcbiAgICAgIG1heFNlZW5SYW5rTm9kZSA9IGltcG9ydGVkTW9kdWxlXG4gICAgfVxuICAgIHJldHVybiByZXNcbiAgfSlcbn1cblxuZnVuY3Rpb24gZmluZFJvb3ROb2RlKG5vZGUpIHtcbiAgbGV0IHBhcmVudCA9IG5vZGVcbiAgd2hpbGUgKHBhcmVudC5wYXJlbnQgIT0gbnVsbCAmJiBwYXJlbnQucGFyZW50LmJvZHkgPT0gbnVsbCkge1xuICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnRcbiAgfVxuICByZXR1cm4gcGFyZW50XG59XG5cbmZ1bmN0aW9uIGZpbmRFbmRPZkxpbmVXaXRoQ29tbWVudHMoc291cmNlQ29kZSwgbm9kZSkge1xuICBjb25zdCB0b2tlbnNUb0VuZE9mTGluZSA9IHRha2VUb2tlbnNBZnRlcldoaWxlKHNvdXJjZUNvZGUsIG5vZGUsIGNvbW1lbnRPblNhbWVMaW5lQXMobm9kZSkpXG4gIGxldCBlbmRPZlRva2VucyA9IHRva2Vuc1RvRW5kT2ZMaW5lLmxlbmd0aCA+IDBcbiAgICA/IHRva2Vuc1RvRW5kT2ZMaW5lW3Rva2Vuc1RvRW5kT2ZMaW5lLmxlbmd0aCAtIDFdLnJhbmdlWzFdXG4gICAgOiBub2RlLnJhbmdlWzFdXG4gIGxldCByZXN1bHQgPSBlbmRPZlRva2Vuc1xuICBmb3IgKGxldCBpID0gZW5kT2ZUb2tlbnM7IGkgPCBzb3VyY2VDb2RlLnRleHQubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoc291cmNlQ29kZS50ZXh0W2ldID09PSAnXFxuJykge1xuICAgICAgcmVzdWx0ID0gaSArIDFcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIGlmIChzb3VyY2VDb2RlLnRleHRbaV0gIT09ICcgJyAmJiBzb3VyY2VDb2RlLnRleHRbaV0gIT09ICdcXHQnICYmIHNvdXJjZUNvZGUudGV4dFtpXSAhPT0gJ1xccicpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICAgIHJlc3VsdCA9IGkgKyAxXG4gIH1cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG5mdW5jdGlvbiBjb21tZW50T25TYW1lTGluZUFzKG5vZGUpIHtcbiAgcmV0dXJuIHRva2VuID0+ICh0b2tlbi50eXBlID09PSAnQmxvY2snIHx8ICB0b2tlbi50eXBlID09PSAnTGluZScpICYmXG4gICAgICB0b2tlbi5sb2Muc3RhcnQubGluZSA9PT0gdG9rZW4ubG9jLmVuZC5saW5lICYmXG4gICAgICB0b2tlbi5sb2MuZW5kLmxpbmUgPT09IG5vZGUubG9jLmVuZC5saW5lXG59XG5cbmZ1bmN0aW9uIGZpbmRTdGFydE9mTGluZVdpdGhDb21tZW50cyhzb3VyY2VDb2RlLCBub2RlKSB7XG4gIGNvbnN0IHRva2Vuc1RvRW5kT2ZMaW5lID0gdGFrZVRva2Vuc0JlZm9yZVdoaWxlKHNvdXJjZUNvZGUsIG5vZGUsIGNvbW1lbnRPblNhbWVMaW5lQXMobm9kZSkpXG4gIGxldCBzdGFydE9mVG9rZW5zID0gdG9rZW5zVG9FbmRPZkxpbmUubGVuZ3RoID4gMCA/IHRva2Vuc1RvRW5kT2ZMaW5lWzBdLnJhbmdlWzBdIDogbm9kZS5yYW5nZVswXVxuICBsZXQgcmVzdWx0ID0gc3RhcnRPZlRva2Vuc1xuICBmb3IgKGxldCBpID0gc3RhcnRPZlRva2VucyAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICBpZiAoc291cmNlQ29kZS50ZXh0W2ldICE9PSAnICcgJiYgc291cmNlQ29kZS50ZXh0W2ldICE9PSAnXFx0Jykge1xuICAgICAgYnJlYWtcbiAgICB9XG4gICAgcmVzdWx0ID0gaVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuZnVuY3Rpb24gaXNQbGFpblJlcXVpcmVNb2R1bGUobm9kZSkge1xuICBpZiAobm9kZS50eXBlICE9PSAnVmFyaWFibGVEZWNsYXJhdGlvbicpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuICBpZiAobm9kZS5kZWNsYXJhdGlvbnMubGVuZ3RoICE9PSAxKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbiAgY29uc3QgZGVjbCA9IG5vZGUuZGVjbGFyYXRpb25zWzBdXG4gIGNvbnN0IHJlc3VsdCA9IGRlY2wuaWQgJiZcbiAgICAoZGVjbC5pZC50eXBlID09PSAnSWRlbnRpZmllcicgfHwgZGVjbC5pZC50eXBlID09PSAnT2JqZWN0UGF0dGVybicpICYmXG4gICAgZGVjbC5pbml0ICE9IG51bGwgJiZcbiAgICBkZWNsLmluaXQudHlwZSA9PT0gJ0NhbGxFeHByZXNzaW9uJyAmJlxuICAgIGRlY2wuaW5pdC5jYWxsZWUgIT0gbnVsbCAmJlxuICAgIGRlY2wuaW5pdC5jYWxsZWUubmFtZSA9PT0gJ3JlcXVpcmUnICYmXG4gICAgZGVjbC5pbml0LmFyZ3VtZW50cyAhPSBudWxsICYmXG4gICAgZGVjbC5pbml0LmFyZ3VtZW50cy5sZW5ndGggPT09IDEgJiZcbiAgICBkZWNsLmluaXQuYXJndW1lbnRzWzBdLnR5cGUgPT09ICdMaXRlcmFsJ1xuICByZXR1cm4gcmVzdWx0XG59XG5cbmZ1bmN0aW9uIGlzUGxhaW5JbXBvcnRNb2R1bGUobm9kZSkge1xuICByZXR1cm4gbm9kZS50eXBlID09PSAnSW1wb3J0RGVjbGFyYXRpb24nICYmIG5vZGUuc3BlY2lmaWVycyAhPSBudWxsICYmIG5vZGUuc3BlY2lmaWVycy5sZW5ndGggPiAwXG59XG5cbmZ1bmN0aW9uIGNhbkNyb3NzTm9kZVdoaWxlUmVvcmRlcihub2RlKSB7XG4gIHJldHVybiBpc1BsYWluUmVxdWlyZU1vZHVsZShub2RlKSB8fCBpc1BsYWluSW1wb3J0TW9kdWxlKG5vZGUpXG59XG5cbmZ1bmN0aW9uIGNhblJlb3JkZXJJdGVtcyhmaXJzdE5vZGUsIHNlY29uZE5vZGUpIHtcbiAgY29uc3QgcGFyZW50ID0gZmlyc3ROb2RlLnBhcmVudFxuICBjb25zdCBmaXJzdEluZGV4ID0gcGFyZW50LmJvZHkuaW5kZXhPZihmaXJzdE5vZGUpXG4gIGNvbnN0IHNlY29uZEluZGV4ID0gcGFyZW50LmJvZHkuaW5kZXhPZihzZWNvbmROb2RlKVxuICBjb25zdCBub2Rlc0JldHdlZW4gPSBwYXJlbnQuYm9keS5zbGljZShmaXJzdEluZGV4LCBzZWNvbmRJbmRleCArIDEpXG4gIGZvciAodmFyIG5vZGVCZXR3ZWVuIG9mIG5vZGVzQmV0d2Vlbikge1xuICAgIGlmICghY2FuQ3Jvc3NOb2RlV2hpbGVSZW9yZGVyKG5vZGVCZXR3ZWVuKSkge1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlXG59XG5cbmZ1bmN0aW9uIGZpeE91dE9mT3JkZXIoY29udGV4dCwgZmlyc3ROb2RlLCBzZWNvbmROb2RlLCBvcmRlcikge1xuICBjb25zdCBzb3VyY2VDb2RlID0gY29udGV4dC5nZXRTb3VyY2VDb2RlKClcblxuICBjb25zdCBmaXJzdFJvb3QgPSBmaW5kUm9vdE5vZGUoZmlyc3ROb2RlLm5vZGUpXG4gIGxldCBmaXJzdFJvb3RTdGFydCA9IGZpbmRTdGFydE9mTGluZVdpdGhDb21tZW50cyhzb3VyY2VDb2RlLCBmaXJzdFJvb3QpXG4gIGNvbnN0IGZpcnN0Um9vdEVuZCA9IGZpbmRFbmRPZkxpbmVXaXRoQ29tbWVudHMoc291cmNlQ29kZSwgZmlyc3RSb290KVxuXG4gIGNvbnN0IHNlY29uZFJvb3QgPSBmaW5kUm9vdE5vZGUoc2Vjb25kTm9kZS5ub2RlKVxuICBsZXQgc2Vjb25kUm9vdFN0YXJ0ID0gZmluZFN0YXJ0T2ZMaW5lV2l0aENvbW1lbnRzKHNvdXJjZUNvZGUsIHNlY29uZFJvb3QpXG4gIGxldCBzZWNvbmRSb290RW5kID0gZmluZEVuZE9mTGluZVdpdGhDb21tZW50cyhzb3VyY2VDb2RlLCBzZWNvbmRSb290KVxuICBjb25zdCBjYW5GaXggPSBjYW5SZW9yZGVySXRlbXMoZmlyc3RSb290LCBzZWNvbmRSb290KVxuXG4gIGxldCBuZXdDb2RlID0gc291cmNlQ29kZS50ZXh0LnN1YnN0cmluZyhzZWNvbmRSb290U3RhcnQsIHNlY29uZFJvb3RFbmQpXG4gIGlmIChuZXdDb2RlW25ld0NvZGUubGVuZ3RoIC0gMV0gIT09ICdcXG4nKSB7XG4gICAgbmV3Q29kZSA9IG5ld0NvZGUgKyAnXFxuJ1xuICB9XG5cbiAgY29uc3QgbWVzc2FnZSA9ICdgJyArIHNlY29uZE5vZGUubmFtZSArICdgIGltcG9ydCBzaG91bGQgb2NjdXIgJyArIG9yZGVyICtcbiAgICAgICcgaW1wb3J0IG9mIGAnICsgZmlyc3ROb2RlLm5hbWUgKyAnYCdcblxuICBpZiAob3JkZXIgPT09ICdiZWZvcmUnKSB7XG4gICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgbm9kZTogc2Vjb25kTm9kZS5ub2RlLFxuICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgIGZpeDogY2FuRml4ICYmIChmaXhlciA9PlxuICAgICAgICBmaXhlci5yZXBsYWNlVGV4dFJhbmdlKFxuICAgICAgICAgIFtmaXJzdFJvb3RTdGFydCwgc2Vjb25kUm9vdEVuZF0sXG4gICAgICAgICAgbmV3Q29kZSArIHNvdXJjZUNvZGUudGV4dC5zdWJzdHJpbmcoZmlyc3RSb290U3RhcnQsIHNlY29uZFJvb3RTdGFydClcbiAgICAgICAgKSksXG4gICAgfSlcbiAgfSBlbHNlIGlmIChvcmRlciA9PT0gJ2FmdGVyJykge1xuICAgIGNvbnRleHQucmVwb3J0KHtcbiAgICAgIG5vZGU6IHNlY29uZE5vZGUubm9kZSxcbiAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICBmaXg6IGNhbkZpeCAmJiAoZml4ZXIgPT5cbiAgICAgICAgZml4ZXIucmVwbGFjZVRleHRSYW5nZShcbiAgICAgICAgICBbc2Vjb25kUm9vdFN0YXJ0LCBmaXJzdFJvb3RFbmRdLFxuICAgICAgICAgIHNvdXJjZUNvZGUudGV4dC5zdWJzdHJpbmcoc2Vjb25kUm9vdEVuZCwgZmlyc3RSb290RW5kKSArIG5ld0NvZGVcbiAgICAgICAgKSksXG4gICAgfSlcbiAgfVxufVxuXG5mdW5jdGlvbiByZXBvcnRPdXRPZk9yZGVyKGNvbnRleHQsIGltcG9ydGVkLCBvdXRPZk9yZGVyLCBvcmRlcikge1xuICBvdXRPZk9yZGVyLmZvckVhY2goZnVuY3Rpb24gKGltcCkge1xuICAgIGNvbnN0IGZvdW5kID0gaW1wb3J0ZWQuZmluZChmdW5jdGlvbiBoYXNIaWdoZXJSYW5rKGltcG9ydGVkSXRlbSkge1xuICAgICAgcmV0dXJuIGltcG9ydGVkSXRlbS5yYW5rID4gaW1wLnJhbmtcbiAgICB9KVxuICAgIGZpeE91dE9mT3JkZXIoY29udGV4dCwgZm91bmQsIGltcCwgb3JkZXIpXG4gIH0pXG59XG5cbmZ1bmN0aW9uIG1ha2VPdXRPZk9yZGVyUmVwb3J0KGNvbnRleHQsIGltcG9ydGVkKSB7XG4gIGNvbnN0IG91dE9mT3JkZXIgPSBmaW5kT3V0T2ZPcmRlcihpbXBvcnRlZClcbiAgaWYgKCFvdXRPZk9yZGVyLmxlbmd0aCkge1xuICAgIHJldHVyblxuICB9XG4gIC8vIFRoZXJlIGFyZSB0aGluZ3MgdG8gcmVwb3J0LiBUcnkgdG8gbWluaW1pemUgdGhlIG51bWJlciBvZiByZXBvcnRlZCBlcnJvcnMuXG4gIGNvbnN0IHJldmVyc2VkSW1wb3J0ZWQgPSByZXZlcnNlKGltcG9ydGVkKVxuICBjb25zdCByZXZlcnNlZE9yZGVyID0gZmluZE91dE9mT3JkZXIocmV2ZXJzZWRJbXBvcnRlZClcbiAgaWYgKHJldmVyc2VkT3JkZXIubGVuZ3RoIDwgb3V0T2ZPcmRlci5sZW5ndGgpIHtcbiAgICByZXBvcnRPdXRPZk9yZGVyKGNvbnRleHQsIHJldmVyc2VkSW1wb3J0ZWQsIHJldmVyc2VkT3JkZXIsICdhZnRlcicpXG4gICAgcmV0dXJuXG4gIH1cbiAgcmVwb3J0T3V0T2ZPcmRlcihjb250ZXh0LCBpbXBvcnRlZCwgb3V0T2ZPcmRlciwgJ2JlZm9yZScpXG59XG5cbi8vIERFVEVDVElOR1xuXG5mdW5jdGlvbiBjb21wdXRlUmFuayhjb250ZXh0LCByYW5rcywgbmFtZSwgdHlwZSwgZ3JvdXBzLCBub2RlKSB7XG4gIGxldCByYW5rVHlwZVxuICBpZiAodHlwZSA9PT0gJ2ltcG9ydCcgJiYgbm9kZS5pbXBvcnRLaW5kID09PSAndHlwZScpIHtcbiAgICByYW5rVHlwZSA9ICdmbG93J1xuICB9IGVsc2Uge1xuICAgIHJhbmtUeXBlID0gaW1wb3J0VHlwZShuYW1lLCBjb250ZXh0LCBncm91cHMpXG4gIH1cblxuICByZXR1cm4gcmFua3NbcmFua1R5cGVdICtcbiAgICAodHlwZSA9PT0gJ2ltcG9ydCcgPyAwIDogMTAwKVxufVxuXG5mdW5jdGlvbiByZWdpc3Rlck5vZGUoY29udGV4dCwgbm9kZSwgbmFtZSwgdHlwZSwgcmFua3MsIGltcG9ydGVkLCBncm91cHMpIHtcbiAgY29uc3QgcmFuayA9IGNvbXB1dGVSYW5rKGNvbnRleHQsIHJhbmtzLCBuYW1lLCB0eXBlLCBncm91cHMsIG5vZGUpXG5cbiAgaWYgKHJhbmsgIT09IC0xKSB7XG4gICAgaW1wb3J0ZWQucHVzaCh7bmFtZSwgcmFuaywgbm9kZX0pXG4gIH1cbn1cblxuZnVuY3Rpb24gaXNJblZhcmlhYmxlRGVjbGFyYXRvcihub2RlKSB7XG4gIHJldHVybiBub2RlICYmXG4gICAgKG5vZGUudHlwZSA9PT0gJ1ZhcmlhYmxlRGVjbGFyYXRvcicgfHwgaXNJblZhcmlhYmxlRGVjbGFyYXRvcihub2RlLnBhcmVudCkpXG59XG5cbmNvbnN0IHR5cGVzID0gW1xuICAnYnVpbHRpbicsXG4gICdleHRlcm5hbCcsXG4gICdwcml2YXRlJyxcbiAgJ2ludGVybmFsJyxcbiAgJ3BhcmVudCcsXG4gICdzaWJsaW5nJyxcbiAgJ2luZGV4JyxcbiAgJ2Fic29sdXRlJyxcbiAgJ2Zsb3cnLFxuXVxuXG4vLyBDcmVhdGVzIGFuIG9iamVjdCB3aXRoIHR5cGUtcmFuayBwYWlycy5cbi8vIEV4YW1wbGU6IHsgaW5kZXg6IDAsIHNpYmxpbmc6IDEsIHBhcmVudDogMSwgZXh0ZXJuYWw6IDEsIGJ1aWx0aW46IDIsIGludGVybmFsOiAyIH1cbi8vIFdpbGwgdGhyb3cgYW4gZXJyb3IgaWYgaXQgY29udGFpbnMgYSB0eXBlIHRoYXQgZG9lcyBub3QgZXhpc3QsIG9yIGhhcyBhIGR1cGxpY2F0ZVxuZnVuY3Rpb24gY29udmVydEdyb3Vwc1RvUmFua3MoZ3JvdXBzKSB7XG4gIGNvbnN0IHJhbmtPYmplY3QgPSBncm91cHMucmVkdWNlKGZ1bmN0aW9uKHJlcywgZ3JvdXAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBncm91cCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGdyb3VwID0gW2dyb3VwXVxuICAgIH1cblxuICAgIGlmIChcbiAgICAgIHR5cGVvZiBncm91cCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIGdyb3VwICE9PSBudWxsICYmXG4gICAgICBncm91cC5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0XG4gICAgKSB7XG4gICAgICBncm91cCA9IFtncm91cF1cbiAgICB9XG5cbiAgICBncm91cC5mb3JFYWNoKGZ1bmN0aW9uKGdyb3VwSXRlbSkge1xuICAgICAgaWYgKFxuICAgICAgICB0eXBlb2YgZ3JvdXBJdGVtID09PSAnb2JqZWN0JyAmJlxuICAgICAgICBncm91cEl0ZW0gIT09IG51bGwgJiZcbiAgICAgICAgZ3JvdXBJdGVtLmNvbnN0cnVjdG9yID09PSBPYmplY3QgJiZcbiAgICAgICAgZ3JvdXBJdGVtLm5hbWVcbiAgICAgICkge1xuICAgICAgICBncm91cEl0ZW0gPSBncm91cEl0ZW0ubmFtZVxuICAgICAgfVxuXG4gICAgICBjb25zdCBpc0NvcnJlY3RHcm91cCA9IHR5cGVzLmZpbmQoKHR5cGVJdGVtKSA9PiB0eXBlSXRlbSA9PT0gZ3JvdXBJdGVtKVxuXG4gICAgICBpZiAoIWlzQ29ycmVjdEdyb3VwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW5jb3JyZWN0IGNvbmZpZ3VyYXRpb24gb2YgdGhlIHJ1bGU6IFVua25vd24gdHlwZSBgJyArXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkoZ3JvdXBJdGVtKSArICdgJylcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc1tncm91cEl0ZW1dICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbmNvcnJlY3QgY29uZmlndXJhdGlvbiBvZiB0aGUgcnVsZTogYCcgKyBncm91cEl0ZW0gKyAnYCBpcyBkdXBsaWNhdGVkJylcbiAgICAgIH1cblxuICAgICAgcmVzW2dyb3VwSXRlbV0gPSBpbmRleFxuICAgIH0pXG5cbiAgICByZXR1cm4gcmVzXG4gIH0sIHt9KVxuXG4gIGNvbnN0IG9taXR0ZWRUeXBlcyA9IHR5cGVzLmZpbHRlcihmdW5jdGlvbih0eXBlKSB7XG4gICAgcmV0dXJuIHJhbmtPYmplY3RbdHlwZV0gPT09IHVuZGVmaW5lZFxuICB9KVxuXG4gIHJldHVybiBvbWl0dGVkVHlwZXMucmVkdWNlKGZ1bmN0aW9uKHJlcywgdHlwZSkge1xuICAgIHJlc1t0eXBlXSA9IGdyb3Vwcy5sZW5ndGhcblxuICAgIHJldHVybiByZXNcbiAgfSwgcmFua09iamVjdClcbn1cblxuZnVuY3Rpb24gZml4TmV3TGluZUFmdGVySW1wb3J0KGNvbnRleHQsIHByZXZpb3VzSW1wb3J0KSB7XG4gIGNvbnN0IHByZXZSb290ID0gZmluZFJvb3ROb2RlKHByZXZpb3VzSW1wb3J0Lm5vZGUpXG4gIGNvbnN0IHRva2Vuc1RvRW5kT2ZMaW5lID0gdGFrZVRva2Vuc0FmdGVyV2hpbGUoXG4gICAgY29udGV4dC5nZXRTb3VyY2VDb2RlKCksIHByZXZSb290LCBjb21tZW50T25TYW1lTGluZUFzKHByZXZSb290KSlcblxuICBsZXQgZW5kT2ZMaW5lID0gcHJldlJvb3QucmFuZ2VbMV1cbiAgaWYgKHRva2Vuc1RvRW5kT2ZMaW5lLmxlbmd0aCA+IDApIHtcbiAgICBlbmRPZkxpbmUgPSB0b2tlbnNUb0VuZE9mTGluZVt0b2tlbnNUb0VuZE9mTGluZS5sZW5ndGggLSAxXS5yYW5nZVsxXVxuICB9XG4gIHJldHVybiAoZml4ZXIpID0+IGZpeGVyLmluc2VydFRleHRBZnRlclJhbmdlKFtwcmV2Um9vdC5yYW5nZVswXSwgZW5kT2ZMaW5lXSwgJ1xcbicpXG59XG5cbmZ1bmN0aW9uIHJlbW92ZU5ld0xpbmVBZnRlckltcG9ydChjb250ZXh0LCBjdXJyZW50SW1wb3J0LCBwcmV2aW91c0ltcG9ydCkge1xuICBjb25zdCBzb3VyY2VDb2RlID0gY29udGV4dC5nZXRTb3VyY2VDb2RlKClcbiAgY29uc3QgcHJldlJvb3QgPSBmaW5kUm9vdE5vZGUocHJldmlvdXNJbXBvcnQubm9kZSlcbiAgY29uc3QgY3VyclJvb3QgPSBmaW5kUm9vdE5vZGUoY3VycmVudEltcG9ydC5ub2RlKVxuICBjb25zdCByYW5nZVRvUmVtb3ZlID0gW1xuICAgIGZpbmRFbmRPZkxpbmVXaXRoQ29tbWVudHMoc291cmNlQ29kZSwgcHJldlJvb3QpLFxuICAgIGZpbmRTdGFydE9mTGluZVdpdGhDb21tZW50cyhzb3VyY2VDb2RlLCBjdXJyUm9vdCksXG4gIF1cbiAgaWYgKC9eXFxzKiQvLnRlc3Qoc291cmNlQ29kZS50ZXh0LnN1YnN0cmluZyhyYW5nZVRvUmVtb3ZlWzBdLCByYW5nZVRvUmVtb3ZlWzFdKSkpIHtcbiAgICByZXR1cm4gKGZpeGVyKSA9PiBmaXhlci5yZW1vdmVSYW5nZShyYW5nZVRvUmVtb3ZlKVxuICB9XG4gIHJldHVybiB1bmRlZmluZWRcbn1cblxuZnVuY3Rpb24gbWFrZU5ld2xpbmVzQmV0d2VlblJlcG9ydCAoY29udGV4dCwgaW1wb3J0ZWQsIG5ld2xpbmVzQmV0d2VlbkltcG9ydHMpIHtcbiAgY29uc3QgZ2V0TnVtYmVyT2ZFbXB0eUxpbmVzQmV0d2VlbiA9IChjdXJyZW50SW1wb3J0LCBwcmV2aW91c0ltcG9ydCkgPT4ge1xuICAgIGNvbnN0IGxpbmVzQmV0d2VlbkltcG9ydHMgPSBjb250ZXh0LmdldFNvdXJjZUNvZGUoKS5saW5lcy5zbGljZShcbiAgICAgIHByZXZpb3VzSW1wb3J0Lm5vZGUubG9jLmVuZC5saW5lLFxuICAgICAgY3VycmVudEltcG9ydC5ub2RlLmxvYy5zdGFydC5saW5lIC0gMVxuICAgIClcblxuICAgIHJldHVybiBsaW5lc0JldHdlZW5JbXBvcnRzLmZpbHRlcigobGluZSkgPT4gIWxpbmUudHJpbSgpLmxlbmd0aCkubGVuZ3RoXG4gIH1cbiAgbGV0IHByZXZpb3VzSW1wb3J0ID0gaW1wb3J0ZWRbMF1cblxuICBpbXBvcnRlZC5zbGljZSgxKS5mb3JFYWNoKGZ1bmN0aW9uKGN1cnJlbnRJbXBvcnQpIHtcbiAgICBjb25zdCBlbXB0eUxpbmVzQmV0d2VlbiA9IGdldE51bWJlck9mRW1wdHlMaW5lc0JldHdlZW4oY3VycmVudEltcG9ydCwgcHJldmlvdXNJbXBvcnQpXG5cbiAgICBpZiAobmV3bGluZXNCZXR3ZWVuSW1wb3J0cyA9PT0gJ2Fsd2F5cydcbiAgICAgICAgfHwgbmV3bGluZXNCZXR3ZWVuSW1wb3J0cyA9PT0gJ2Fsd2F5cy1hbmQtaW5zaWRlLWdyb3VwcycpIHtcbiAgICAgIGlmIChjdXJyZW50SW1wb3J0LnJhbmsgIT09IHByZXZpb3VzSW1wb3J0LnJhbmsgJiYgZW1wdHlMaW5lc0JldHdlZW4gPT09IDApIHtcbiAgICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICAgIG5vZGU6IHByZXZpb3VzSW1wb3J0Lm5vZGUsXG4gICAgICAgICAgbWVzc2FnZTogJ1RoZXJlIHNob3VsZCBiZSBhdCBsZWFzdCBvbmUgZW1wdHkgbGluZSBiZXR3ZWVuIGltcG9ydCBncm91cHMnLFxuICAgICAgICAgIGZpeDogZml4TmV3TGluZUFmdGVySW1wb3J0KGNvbnRleHQsIHByZXZpb3VzSW1wb3J0LCBjdXJyZW50SW1wb3J0KSxcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSBpZiAoY3VycmVudEltcG9ydC5yYW5rID09PSBwcmV2aW91c0ltcG9ydC5yYW5rXG4gICAgICAgICYmIGVtcHR5TGluZXNCZXR3ZWVuID4gMFxuICAgICAgICAmJiBuZXdsaW5lc0JldHdlZW5JbXBvcnRzICE9PSAnYWx3YXlzLWFuZC1pbnNpZGUtZ3JvdXBzJykge1xuICAgICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgICAgbm9kZTogcHJldmlvdXNJbXBvcnQubm9kZSxcbiAgICAgICAgICBtZXNzYWdlOiAnVGhlcmUgc2hvdWxkIGJlIG5vIGVtcHR5IGxpbmUgd2l0aGluIGltcG9ydCBncm91cCcsXG4gICAgICAgICAgZml4OiByZW1vdmVOZXdMaW5lQWZ0ZXJJbXBvcnQoY29udGV4dCwgY3VycmVudEltcG9ydCwgcHJldmlvdXNJbXBvcnQpLFxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZW1wdHlMaW5lc0JldHdlZW4gPiAwKSB7XG4gICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgIG5vZGU6IHByZXZpb3VzSW1wb3J0Lm5vZGUsXG4gICAgICAgIG1lc3NhZ2U6ICdUaGVyZSBzaG91bGQgYmUgbm8gZW1wdHkgbGluZSBiZXR3ZWVuIGltcG9ydCBncm91cHMnLFxuICAgICAgICBmaXg6IHJlbW92ZU5ld0xpbmVBZnRlckltcG9ydChjb250ZXh0LCBjdXJyZW50SW1wb3J0LCBwcmV2aW91c0ltcG9ydCksXG4gICAgICB9KVxuICAgIH1cblxuICAgIHByZXZpb3VzSW1wb3J0ID0gY3VycmVudEltcG9ydFxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbWV0YToge1xuICAgIHR5cGU6ICdzdWdnZXN0aW9uJyxcbiAgICBkb2NzOiB7XG4gICAgICB1cmw6IGRvY3NVcmwoJ29yZGVyJyksXG4gICAgfSxcblxuICAgIGZpeGFibGU6ICdjb2RlJyxcbiAgICBzY2hlbWE6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICBncm91cHM6IHtcbiAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAnbmV3bGluZXMtYmV0d2Vlbic6IHtcbiAgICAgICAgICAgIGVudW06IFtcbiAgICAgICAgICAgICAgJ2lnbm9yZScsXG4gICAgICAgICAgICAgICdhbHdheXMnLFxuICAgICAgICAgICAgICAnYWx3YXlzLWFuZC1pbnNpZGUtZ3JvdXBzJyxcbiAgICAgICAgICAgICAgJ25ldmVyJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgYWRkaXRpb25hbFByb3BlcnRpZXM6IGZhbHNlLFxuICAgICAgfSxcbiAgICBdLFxuICB9LFxuXG4gIGNyZWF0ZTogZnVuY3Rpb24gaW1wb3J0T3JkZXJSdWxlIChjb250ZXh0KSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IGNvbnRleHQub3B0aW9uc1swXSB8fCB7fVxuICAgIGNvbnN0IGdyb3VwcyA9IG9wdGlvbnMuZ3JvdXBzIHx8IGRlZmF1bHRHcm91cHNcbiAgICBjb25zdCBuZXdsaW5lc0JldHdlZW5JbXBvcnRzID0gb3B0aW9uc1snbmV3bGluZXMtYmV0d2VlbiddIHx8ICdpZ25vcmUnXG4gICAgbGV0IHJhbmtzXG5cbiAgICB0cnkge1xuICAgICAgcmFua3MgPSBjb252ZXJ0R3JvdXBzVG9SYW5rcyhncm91cHMpXG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gTWFsZm9ybWVkIGNvbmZpZ3VyYXRpb25cbiAgICAgIHJldHVybiB7XG4gICAgICAgIFByb2dyYW06IGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgICAgICBjb250ZXh0LnJlcG9ydChub2RlLCBlcnJvci5tZXNzYWdlKVxuICAgICAgICB9LFxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBpbXBvcnRlZCA9IFtdXG4gICAgbGV0IGxldmVsID0gMFxuXG4gICAgZnVuY3Rpb24gaW5jcmVtZW50TGV2ZWwoKSB7XG4gICAgICBsZXZlbCsrXG4gICAgfVxuICAgIGZ1bmN0aW9uIGRlY3JlbWVudExldmVsKCkge1xuICAgICAgbGV2ZWwtLVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBJbXBvcnREZWNsYXJhdGlvbjogZnVuY3Rpb24gaGFuZGxlSW1wb3J0cyhub2RlKSB7XG4gICAgICAgIGlmIChub2RlLnNwZWNpZmllcnMubGVuZ3RoKSB7IC8vIElnbm9yaW5nIHVuYXNzaWduZWQgaW1wb3J0c1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSBub2RlLnNvdXJjZS52YWx1ZVxuICAgICAgICAgIHJlZ2lzdGVyTm9kZShjb250ZXh0LCBub2RlLCBuYW1lLCAnaW1wb3J0JywgcmFua3MsIGltcG9ydGVkLCBncm91cHMpXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBDYWxsRXhwcmVzc2lvbjogZnVuY3Rpb24gaGFuZGxlUmVxdWlyZXMobm9kZSkge1xuICAgICAgICBpZiAobGV2ZWwgIT09IDAgfHwgIWlzU3RhdGljUmVxdWlyZShub2RlKSB8fCAhaXNJblZhcmlhYmxlRGVjbGFyYXRvcihub2RlLnBhcmVudCkpIHtcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuYW1lID0gbm9kZS5hcmd1bWVudHNbMF0udmFsdWVcbiAgICAgICAgcmVnaXN0ZXJOb2RlKGNvbnRleHQsIG5vZGUsIG5hbWUsICdyZXF1aXJlJywgcmFua3MsIGltcG9ydGVkLCBncm91cHMpXG4gICAgICB9LFxuICAgICAgJ1Byb2dyYW06ZXhpdCc6IGZ1bmN0aW9uIHJlcG9ydEFuZFJlc2V0KCkge1xuICAgICAgICBtYWtlT3V0T2ZPcmRlclJlcG9ydChjb250ZXh0LCBpbXBvcnRlZClcblxuICAgICAgICBpZiAobmV3bGluZXNCZXR3ZWVuSW1wb3J0cyAhPT0gJ2lnbm9yZScpIHtcbiAgICAgICAgICBtYWtlTmV3bGluZXNCZXR3ZWVuUmVwb3J0KGNvbnRleHQsIGltcG9ydGVkLCBuZXdsaW5lc0JldHdlZW5JbXBvcnRzKVxuICAgICAgICB9XG5cbiAgICAgICAgaW1wb3J0ZWQgPSBbXVxuICAgICAgfSxcbiAgICAgIEZ1bmN0aW9uRGVjbGFyYXRpb246IGluY3JlbWVudExldmVsLFxuICAgICAgRnVuY3Rpb25FeHByZXNzaW9uOiBpbmNyZW1lbnRMZXZlbCxcbiAgICAgIEFycm93RnVuY3Rpb25FeHByZXNzaW9uOiBpbmNyZW1lbnRMZXZlbCxcbiAgICAgIEJsb2NrU3RhdGVtZW50OiBpbmNyZW1lbnRMZXZlbCxcbiAgICAgIE9iamVjdEV4cHJlc3Npb246IGluY3JlbWVudExldmVsLFxuICAgICAgJ0Z1bmN0aW9uRGVjbGFyYXRpb246ZXhpdCc6IGRlY3JlbWVudExldmVsLFxuICAgICAgJ0Z1bmN0aW9uRXhwcmVzc2lvbjpleGl0JzogZGVjcmVtZW50TGV2ZWwsXG4gICAgICAnQXJyb3dGdW5jdGlvbkV4cHJlc3Npb246ZXhpdCc6IGRlY3JlbWVudExldmVsLFxuICAgICAgJ0Jsb2NrU3RhdGVtZW50OmV4aXQnOiBkZWNyZW1lbnRMZXZlbCxcbiAgICAgICdPYmplY3RFeHByZXNzaW9uOmV4aXQnOiBkZWNyZW1lbnRMZXZlbCxcbiAgICB9XG4gIH0sXG59XG4iXX0=