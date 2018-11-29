'use strict';

var _vm = require('vm');

var _vm2 = _interopRequireDefault(_vm);

var _docsUrl = require('../docsUrl');

var _docsUrl2 = _interopRequireDefault(_docsUrl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = {
  meta: {
    docs: {
      url: (0, _docsUrl2.default)('dynamic-import-chunkname')
    },
    schema: [{
      type: 'object',
      properties: {
        importFunctions: {
          type: 'array',
          uniqueItems: true,
          items: {
            type: 'string'
          }
        },
        webpackChunknameFormat: {
          type: 'string'
        }
      }
    }]
  },

  create: function (context) {
    const config = context.options[0];

    var _ref = config || {},
        _ref$importFunctions = _ref.importFunctions;

    const importFunctions = _ref$importFunctions === undefined ? [] : _ref$importFunctions;

    var _ref2 = config || {},
        _ref2$webpackChunknam = _ref2.webpackChunknameFormat;

    const webpackChunknameFormat = _ref2$webpackChunknam === undefined ? '[0-9a-zA-Z-_/.]+' : _ref2$webpackChunknam;


    const paddedCommentRegex = /^ (\S[\s\S]+\S) $/;
    const commentStyleRegex = /^( \w+: ("[^"]*"|\d+|false|true),?)+ $/;
    const chunkSubstrFormat = ` webpackChunkName: "${webpackChunknameFormat}",? `;
    const chunkSubstrRegex = new RegExp(chunkSubstrFormat);

    return {
      CallExpression(node) {
        if (node.callee.type !== 'Import' && importFunctions.indexOf(node.callee.name) < 0) {
          return;
        }

        const sourceCode = context.getSourceCode();
        const arg = node.arguments[0];
        const leadingComments = sourceCode.getComments(arg).leading;

        if (!leadingComments || leadingComments.length === 0) {
          context.report({
            node,
            message: 'dynamic imports require a leading comment with the webpack chunkname'
          });
          return;
        }

        let isChunknamePresent = false;

        for (const comment of leadingComments) {
          if (comment.type !== 'Block') {
            context.report({
              node,
              message: 'dynamic imports require a /* foo */ style comment, not a // foo comment'
            });
            return;
          }

          if (!paddedCommentRegex.test(comment.value)) {
            context.report({
              node,
              message: `dynamic imports require a block comment padded with spaces - /* foo */`
            });
            return;
          }

          try {
            // just like webpack itself does
            _vm2.default.runInNewContext(`(function(){return {${comment.value}}})()`);
          } catch (error) {
            context.report({
              node,
              message: `dynamic imports require a "webpack" comment with valid syntax`
            });
            return;
          }

          if (!commentStyleRegex.test(comment.value)) {
            context.report({
              node,
              message: `dynamic imports require a leading comment in the form /*${chunkSubstrFormat}*/`
            });
            return;
          }

          if (chunkSubstrRegex.test(comment.value)) {
            isChunknamePresent = true;
          }
        }

        if (!isChunknamePresent) {
          context.report({
            node,
            message: `dynamic imports require a leading comment in the form /*${chunkSubstrFormat}*/`
          });
        }
      }
    };
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJ1bGVzL2R5bmFtaWMtaW1wb3J0LWNodW5rbmFtZS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnRzIiwibWV0YSIsImRvY3MiLCJ1cmwiLCJzY2hlbWEiLCJ0eXBlIiwicHJvcGVydGllcyIsImltcG9ydEZ1bmN0aW9ucyIsInVuaXF1ZUl0ZW1zIiwiaXRlbXMiLCJ3ZWJwYWNrQ2h1bmtuYW1lRm9ybWF0IiwiY3JlYXRlIiwiY29udGV4dCIsImNvbmZpZyIsIm9wdGlvbnMiLCJwYWRkZWRDb21tZW50UmVnZXgiLCJjb21tZW50U3R5bGVSZWdleCIsImNodW5rU3Vic3RyRm9ybWF0IiwiY2h1bmtTdWJzdHJSZWdleCIsIlJlZ0V4cCIsIkNhbGxFeHByZXNzaW9uIiwibm9kZSIsImNhbGxlZSIsImluZGV4T2YiLCJuYW1lIiwic291cmNlQ29kZSIsImdldFNvdXJjZUNvZGUiLCJhcmciLCJhcmd1bWVudHMiLCJsZWFkaW5nQ29tbWVudHMiLCJnZXRDb21tZW50cyIsImxlYWRpbmciLCJsZW5ndGgiLCJyZXBvcnQiLCJtZXNzYWdlIiwiaXNDaHVua25hbWVQcmVzZW50IiwiY29tbWVudCIsInRlc3QiLCJ2YWx1ZSIsInZtIiwicnVuSW5OZXdDb250ZXh0IiwiZXJyb3IiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7QUFDQTs7Ozs7O0FBRUFBLE9BQU9DLE9BQVAsR0FBaUI7QUFDZkMsUUFBTTtBQUNKQyxVQUFNO0FBQ0pDLFdBQUssdUJBQVEsMEJBQVI7QUFERCxLQURGO0FBSUpDLFlBQVEsQ0FBQztBQUNQQyxZQUFNLFFBREM7QUFFUEMsa0JBQVk7QUFDVkMseUJBQWlCO0FBQ2ZGLGdCQUFNLE9BRFM7QUFFZkcsdUJBQWEsSUFGRTtBQUdmQyxpQkFBTztBQUNMSixrQkFBTTtBQUREO0FBSFEsU0FEUDtBQVFWSyxnQ0FBd0I7QUFDdEJMLGdCQUFNO0FBRGdCO0FBUmQ7QUFGTCxLQUFEO0FBSkosR0FEUzs7QUFzQmZNLFVBQVEsVUFBVUMsT0FBVixFQUFtQjtBQUN6QixVQUFNQyxTQUFTRCxRQUFRRSxPQUFSLENBQWdCLENBQWhCLENBQWY7O0FBRHlCLGVBRVFELFVBQVUsRUFGbEI7QUFBQSxvQ0FFakJOLGVBRmlCOztBQUFBLFVBRWpCQSxlQUZpQix3Q0FFQyxFQUZEOztBQUFBLGdCQUcrQk0sVUFBVSxFQUh6QztBQUFBLHNDQUdqQkgsc0JBSGlCOztBQUFBLFVBR2pCQSxzQkFIaUIseUNBR1Esa0JBSFI7OztBQUt6QixVQUFNSyxxQkFBcUIsbUJBQTNCO0FBQ0EsVUFBTUMsb0JBQW9CLHdDQUExQjtBQUNBLFVBQU1DLG9CQUFxQix1QkFBc0JQLHNCQUF1QixNQUF4RTtBQUNBLFVBQU1RLG1CQUFtQixJQUFJQyxNQUFKLENBQVdGLGlCQUFYLENBQXpCOztBQUVBLFdBQU87QUFDTEcscUJBQWVDLElBQWYsRUFBcUI7QUFDbkIsWUFBSUEsS0FBS0MsTUFBTCxDQUFZakIsSUFBWixLQUFxQixRQUFyQixJQUFpQ0UsZ0JBQWdCZ0IsT0FBaEIsQ0FBd0JGLEtBQUtDLE1BQUwsQ0FBWUUsSUFBcEMsSUFBNEMsQ0FBakYsRUFBb0Y7QUFDbEY7QUFDRDs7QUFFRCxjQUFNQyxhQUFhYixRQUFRYyxhQUFSLEVBQW5CO0FBQ0EsY0FBTUMsTUFBTU4sS0FBS08sU0FBTCxDQUFlLENBQWYsQ0FBWjtBQUNBLGNBQU1DLGtCQUFrQkosV0FBV0ssV0FBWCxDQUF1QkgsR0FBdkIsRUFBNEJJLE9BQXBEOztBQUVBLFlBQUksQ0FBQ0YsZUFBRCxJQUFvQkEsZ0JBQWdCRyxNQUFoQixLQUEyQixDQUFuRCxFQUFzRDtBQUNwRHBCLGtCQUFRcUIsTUFBUixDQUFlO0FBQ2JaLGdCQURhO0FBRWJhLHFCQUFTO0FBRkksV0FBZjtBQUlBO0FBQ0Q7O0FBRUQsWUFBSUMscUJBQXFCLEtBQXpCOztBQUVBLGFBQUssTUFBTUMsT0FBWCxJQUFzQlAsZUFBdEIsRUFBdUM7QUFDckMsY0FBSU8sUUFBUS9CLElBQVIsS0FBaUIsT0FBckIsRUFBOEI7QUFDNUJPLG9CQUFRcUIsTUFBUixDQUFlO0FBQ2JaLGtCQURhO0FBRWJhLHVCQUFTO0FBRkksYUFBZjtBQUlBO0FBQ0Q7O0FBRUQsY0FBSSxDQUFDbkIsbUJBQW1Cc0IsSUFBbkIsQ0FBd0JELFFBQVFFLEtBQWhDLENBQUwsRUFBNkM7QUFDM0MxQixvQkFBUXFCLE1BQVIsQ0FBZTtBQUNiWixrQkFEYTtBQUViYSx1QkFBVTtBQUZHLGFBQWY7QUFJQTtBQUNEOztBQUVELGNBQUk7QUFDRjtBQUNBSyx5QkFBR0MsZUFBSCxDQUFvQix1QkFBc0JKLFFBQVFFLEtBQU0sT0FBeEQ7QUFDRCxXQUhELENBSUEsT0FBT0csS0FBUCxFQUFjO0FBQ1o3QixvQkFBUXFCLE1BQVIsQ0FBZTtBQUNiWixrQkFEYTtBQUViYSx1QkFBVTtBQUZHLGFBQWY7QUFJQTtBQUNEOztBQUVELGNBQUksQ0FBQ2xCLGtCQUFrQnFCLElBQWxCLENBQXVCRCxRQUFRRSxLQUEvQixDQUFMLEVBQTRDO0FBQzFDMUIsb0JBQVFxQixNQUFSLENBQWU7QUFDYlosa0JBRGE7QUFFYmEsdUJBQ0csMkRBQTBEakIsaUJBQWtCO0FBSGxFLGFBQWY7QUFLQTtBQUNEOztBQUVELGNBQUlDLGlCQUFpQm1CLElBQWpCLENBQXNCRCxRQUFRRSxLQUE5QixDQUFKLEVBQTBDO0FBQ3hDSCxpQ0FBcUIsSUFBckI7QUFDRDtBQUNGOztBQUVELFlBQUksQ0FBQ0Esa0JBQUwsRUFBeUI7QUFDdkJ2QixrQkFBUXFCLE1BQVIsQ0FBZTtBQUNiWixnQkFEYTtBQUViYSxxQkFDRywyREFBMERqQixpQkFBa0I7QUFIbEUsV0FBZjtBQUtEO0FBQ0Y7QUF0RUksS0FBUDtBQXdFRDtBQXhHYyxDQUFqQiIsImZpbGUiOiJydWxlcy9keW5hbWljLWltcG9ydC1jaHVua25hbWUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdm0gZnJvbSAndm0nXG5pbXBvcnQgZG9jc1VybCBmcm9tICcuLi9kb2NzVXJsJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbWV0YToge1xuICAgIGRvY3M6IHtcbiAgICAgIHVybDogZG9jc1VybCgnZHluYW1pYy1pbXBvcnQtY2h1bmtuYW1lJyksXG4gICAgfSxcbiAgICBzY2hlbWE6IFt7XG4gICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgaW1wb3J0RnVuY3Rpb25zOiB7XG4gICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICB1bmlxdWVJdGVtczogdHJ1ZSxcbiAgICAgICAgICBpdGVtczoge1xuICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgd2VicGFja0NodW5rbmFtZUZvcm1hdDoge1xuICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9XSxcbiAgfSxcblxuICBjcmVhdGU6IGZ1bmN0aW9uIChjb250ZXh0KSB7XG4gICAgY29uc3QgY29uZmlnID0gY29udGV4dC5vcHRpb25zWzBdXG4gICAgY29uc3QgeyBpbXBvcnRGdW5jdGlvbnMgPSBbXSB9ID0gY29uZmlnIHx8IHt9XG4gICAgY29uc3QgeyB3ZWJwYWNrQ2h1bmtuYW1lRm9ybWF0ID0gJ1swLTlhLXpBLVotXy8uXSsnIH0gPSBjb25maWcgfHwge31cblxuICAgIGNvbnN0IHBhZGRlZENvbW1lbnRSZWdleCA9IC9eIChcXFNbXFxzXFxTXStcXFMpICQvXG4gICAgY29uc3QgY29tbWVudFN0eWxlUmVnZXggPSAvXiggXFx3KzogKFwiW15cIl0qXCJ8XFxkK3xmYWxzZXx0cnVlKSw/KSsgJC9cbiAgICBjb25zdCBjaHVua1N1YnN0ckZvcm1hdCA9IGAgd2VicGFja0NodW5rTmFtZTogXCIke3dlYnBhY2tDaHVua25hbWVGb3JtYXR9XCIsPyBgXG4gICAgY29uc3QgY2h1bmtTdWJzdHJSZWdleCA9IG5ldyBSZWdFeHAoY2h1bmtTdWJzdHJGb3JtYXQpXG5cbiAgICByZXR1cm4ge1xuICAgICAgQ2FsbEV4cHJlc3Npb24obm9kZSkge1xuICAgICAgICBpZiAobm9kZS5jYWxsZWUudHlwZSAhPT0gJ0ltcG9ydCcgJiYgaW1wb3J0RnVuY3Rpb25zLmluZGV4T2Yobm9kZS5jYWxsZWUubmFtZSkgPCAwKSB7XG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzb3VyY2VDb2RlID0gY29udGV4dC5nZXRTb3VyY2VDb2RlKClcbiAgICAgICAgY29uc3QgYXJnID0gbm9kZS5hcmd1bWVudHNbMF1cbiAgICAgICAgY29uc3QgbGVhZGluZ0NvbW1lbnRzID0gc291cmNlQ29kZS5nZXRDb21tZW50cyhhcmcpLmxlYWRpbmdcblxuICAgICAgICBpZiAoIWxlYWRpbmdDb21tZW50cyB8fCBsZWFkaW5nQ29tbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICAgICAgbm9kZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdkeW5hbWljIGltcG9ydHMgcmVxdWlyZSBhIGxlYWRpbmcgY29tbWVudCB3aXRoIHRoZSB3ZWJwYWNrIGNodW5rbmFtZScsXG4gICAgICAgICAgfSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBpc0NodW5rbmFtZVByZXNlbnQgPSBmYWxzZVxuXG4gICAgICAgIGZvciAoY29uc3QgY29tbWVudCBvZiBsZWFkaW5nQ29tbWVudHMpIHtcbiAgICAgICAgICBpZiAoY29tbWVudC50eXBlICE9PSAnQmxvY2snKSB7XG4gICAgICAgICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdkeW5hbWljIGltcG9ydHMgcmVxdWlyZSBhIC8qIGZvbyAqLyBzdHlsZSBjb21tZW50LCBub3QgYSAvLyBmb28gY29tbWVudCcsXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFwYWRkZWRDb21tZW50UmVnZXgudGVzdChjb21tZW50LnZhbHVlKSkge1xuICAgICAgICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICAgICAgICBub2RlLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBgZHluYW1pYyBpbXBvcnRzIHJlcXVpcmUgYSBibG9jayBjb21tZW50IHBhZGRlZCB3aXRoIHNwYWNlcyAtIC8qIGZvbyAqL2AsXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGp1c3QgbGlrZSB3ZWJwYWNrIGl0c2VsZiBkb2VzXG4gICAgICAgICAgICB2bS5ydW5Jbk5ld0NvbnRleHQoYChmdW5jdGlvbigpe3JldHVybiB7JHtjb21tZW50LnZhbHVlfX19KSgpYClcbiAgICAgICAgICB9XG4gICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGBkeW5hbWljIGltcG9ydHMgcmVxdWlyZSBhIFwid2VicGFja1wiIGNvbW1lbnQgd2l0aCB2YWxpZCBzeW50YXhgLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghY29tbWVudFN0eWxlUmVnZXgudGVzdChjb21tZW50LnZhbHVlKSkge1xuICAgICAgICAgICAgY29udGV4dC5yZXBvcnQoe1xuICAgICAgICAgICAgICBub2RlLFxuICAgICAgICAgICAgICBtZXNzYWdlOlxuICAgICAgICAgICAgICAgIGBkeW5hbWljIGltcG9ydHMgcmVxdWlyZSBhIGxlYWRpbmcgY29tbWVudCBpbiB0aGUgZm9ybSAvKiR7Y2h1bmtTdWJzdHJGb3JtYXR9Ki9gLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChjaHVua1N1YnN0clJlZ2V4LnRlc3QoY29tbWVudC52YWx1ZSkpIHtcbiAgICAgICAgICAgIGlzQ2h1bmtuYW1lUHJlc2VudCA9IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzQ2h1bmtuYW1lUHJlc2VudCkge1xuICAgICAgICAgIGNvbnRleHQucmVwb3J0KHtcbiAgICAgICAgICAgIG5vZGUsXG4gICAgICAgICAgICBtZXNzYWdlOlxuICAgICAgICAgICAgICBgZHluYW1pYyBpbXBvcnRzIHJlcXVpcmUgYSBsZWFkaW5nIGNvbW1lbnQgaW4gdGhlIGZvcm0gLyoke2NodW5rU3Vic3RyRm9ybWF0fSovYCxcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9LFxuICAgIH1cbiAgfSxcbn1cbiJdfQ==