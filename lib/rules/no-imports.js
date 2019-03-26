'use strict';

var _docsUrl = require('../docsUrl');

var _docsUrl2 = _interopRequireDefault(_docsUrl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const ERROR_MESSAGE = 'Expected "require()" instead of "import"';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    docs: {
      url: (0, _docsUrl2.default)('no-commonjs')
    }
  },

  create: function (context) {
    return {
      ImportDeclaration: function (node) {
        if (context.getScope().type !== 'module') return;

        context.report({
          node,
          message: ERROR_MESSAGE
        });
      }
    };
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJ1bGVzL25vLWltcG9ydHMuanMiXSwibmFtZXMiOlsiRVJST1JfTUVTU0FHRSIsIm1vZHVsZSIsImV4cG9ydHMiLCJtZXRhIiwiZG9jcyIsInVybCIsImNyZWF0ZSIsImNvbnRleHQiLCJJbXBvcnREZWNsYXJhdGlvbiIsIm5vZGUiLCJnZXRTY29wZSIsInR5cGUiLCJyZXBvcnQiLCJtZXNzYWdlIl0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7QUFFQSxNQUFNQSxnQkFBZ0IsMENBQXRCOztBQUVBO0FBQ0E7QUFDQTs7QUFFQUMsT0FBT0MsT0FBUCxHQUFpQjtBQUNmQyxRQUFNO0FBQ0pDLFVBQU07QUFDSkMsV0FBSyx1QkFBUSxhQUFSO0FBREQ7QUFERixHQURTOztBQU9mQyxVQUFRLFVBQVVDLE9BQVYsRUFBbUI7QUFDekIsV0FBTztBQUNMQyx5QkFBbUIsVUFBU0MsSUFBVCxFQUFlO0FBQ2hDLFlBQUlGLFFBQVFHLFFBQVIsR0FBbUJDLElBQW5CLEtBQTRCLFFBQWhDLEVBQTBDOztBQUUxQ0osZ0JBQVFLLE1BQVIsQ0FBZTtBQUNiSCxjQURhO0FBRWJJLG1CQUFTYjtBQUZJLFNBQWY7QUFJRDtBQVJJLEtBQVA7QUFXRDtBQW5CYyxDQUFqQiIsImZpbGUiOiJydWxlcy9uby1pbXBvcnRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGRvY3NVcmwgZnJvbSAnLi4vZG9jc1VybCdcblxuY29uc3QgRVJST1JfTUVTU0FHRSA9ICdFeHBlY3RlZCBcInJlcXVpcmUoKVwiIGluc3RlYWQgb2YgXCJpbXBvcnRcIidcblxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFJ1bGUgRGVmaW5pdGlvblxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1ldGE6IHtcbiAgICBkb2NzOiB7XG4gICAgICB1cmw6IGRvY3NVcmwoJ25vLWNvbW1vbmpzJyksXG4gICAgfSxcbiAgfSxcblxuICBjcmVhdGU6IGZ1bmN0aW9uIChjb250ZXh0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIEltcG9ydERlY2xhcmF0aW9uOiBmdW5jdGlvbihub2RlKSB7XG4gICAgICAgIGlmIChjb250ZXh0LmdldFNjb3BlKCkudHlwZSAhPT0gJ21vZHVsZScpIHJldHVyblxuXG4gICAgICAgIGNvbnRleHQucmVwb3J0KHtcbiAgICAgICAgICBub2RlLFxuICAgICAgICAgIG1lc3NhZ2U6IEVSUk9SX01FU1NBR0UsXG4gICAgICAgIH0pXG4gICAgICB9LFxuICAgIH1cblxuICB9LFxufVxuIl19