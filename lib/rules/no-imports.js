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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydWxlcy9uby1pbXBvcnRzLmpzIl0sIm5hbWVzIjpbIkVSUk9SX01FU1NBR0UiLCJtb2R1bGUiLCJleHBvcnRzIiwibWV0YSIsImRvY3MiLCJ1cmwiLCJjcmVhdGUiLCJjb250ZXh0IiwiSW1wb3J0RGVjbGFyYXRpb24iLCJub2RlIiwiZ2V0U2NvcGUiLCJ0eXBlIiwicmVwb3J0IiwibWVzc2FnZSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7O0FBRUEsTUFBTUEsZ0JBQWdCLDBDQUF0Qjs7QUFFQTtBQUNBO0FBQ0E7O0FBRUFDLE9BQU9DLE9BQVAsR0FBaUI7QUFDZkMsUUFBTTtBQUNKQyxVQUFNO0FBQ0pDLFdBQUssdUJBQVEsYUFBUjtBQUREO0FBREYsR0FEUzs7QUFPZkMsVUFBUSxVQUFVQyxPQUFWLEVBQW1CO0FBQ3pCLFdBQU87QUFDTEMseUJBQW1CLFVBQVNDLElBQVQsRUFBZTtBQUNoQyxZQUFJRixRQUFRRyxRQUFSLEdBQW1CQyxJQUFuQixLQUE0QixRQUFoQyxFQUEwQzs7QUFFMUNKLGdCQUFRSyxNQUFSLENBQWU7QUFDYkgsY0FEYTtBQUViSSxtQkFBU2I7QUFGSSxTQUFmO0FBSUQ7QUFSSSxLQUFQO0FBV0Q7QUFuQmMsQ0FBakIiLCJmaWxlIjoibm8taW1wb3J0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBkb2NzVXJsIGZyb20gJy4uL2RvY3NVcmwnXG5cbmNvbnN0IEVSUk9SX01FU1NBR0UgPSAnRXhwZWN0ZWQgXCJyZXF1aXJlKClcIiBpbnN0ZWFkIG9mIFwiaW1wb3J0XCInXG5cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBSdWxlIERlZmluaXRpb25cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBtZXRhOiB7XG4gICAgZG9jczoge1xuICAgICAgdXJsOiBkb2NzVXJsKCduby1jb21tb25qcycpLFxuICAgIH0sXG4gIH0sXG5cbiAgY3JlYXRlOiBmdW5jdGlvbiAoY29udGV4dCkge1xuICAgIHJldHVybiB7XG4gICAgICBJbXBvcnREZWNsYXJhdGlvbjogZnVuY3Rpb24obm9kZSkge1xuICAgICAgICBpZiAoY29udGV4dC5nZXRTY29wZSgpLnR5cGUgIT09ICdtb2R1bGUnKSByZXR1cm5cblxuICAgICAgICBjb250ZXh0LnJlcG9ydCh7XG4gICAgICAgICAgbm9kZSxcbiAgICAgICAgICBtZXNzYWdlOiBFUlJPUl9NRVNTQUdFLFxuICAgICAgICB9KVxuICAgICAgfSxcbiAgICB9XG5cbiAgfSxcbn1cbiJdfQ==