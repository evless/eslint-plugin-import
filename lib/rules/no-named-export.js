'use strict';

var _docsUrl = require('../docsUrl');

var _docsUrl2 = _interopRequireDefault(_docsUrl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = {
  meta: {
    docs: { url: (0, _docsUrl2.default)('no-named-export') }
  },

  create(context) {
    // ignore non-modules
    if (context.parserOptions.sourceType !== 'module') {
      return {};
    }

    const message = 'Named exports are not allowed.';

    return {
      ExportAllDeclaration(node) {
        context.report({ node, message });
      },

      ExportNamedDeclaration(node) {
        if (node.specifiers.length === 0) {
          return context.report({ node, message });
        }

        const someNamed = node.specifiers.some(specifier => specifier.exported.name !== 'default');
        if (someNamed) {
          context.report({ node, message });
        }
      }
    };
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJ1bGVzL25vLW5hbWVkLWV4cG9ydC5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnRzIiwibWV0YSIsImRvY3MiLCJ1cmwiLCJjcmVhdGUiLCJjb250ZXh0IiwicGFyc2VyT3B0aW9ucyIsInNvdXJjZVR5cGUiLCJtZXNzYWdlIiwiRXhwb3J0QWxsRGVjbGFyYXRpb24iLCJub2RlIiwicmVwb3J0IiwiRXhwb3J0TmFtZWREZWNsYXJhdGlvbiIsInNwZWNpZmllcnMiLCJsZW5ndGgiLCJzb21lTmFtZWQiLCJzb21lIiwic3BlY2lmaWVyIiwiZXhwb3J0ZWQiLCJuYW1lIl0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7QUFFQUEsT0FBT0MsT0FBUCxHQUFpQjtBQUNmQyxRQUFNO0FBQ0pDLFVBQU0sRUFBRUMsS0FBSyx1QkFBUSxpQkFBUixDQUFQO0FBREYsR0FEUzs7QUFLZkMsU0FBT0MsT0FBUCxFQUFnQjtBQUNkO0FBQ0EsUUFBSUEsUUFBUUMsYUFBUixDQUFzQkMsVUFBdEIsS0FBcUMsUUFBekMsRUFBbUQ7QUFDakQsYUFBTyxFQUFQO0FBQ0Q7O0FBRUQsVUFBTUMsVUFBVSxnQ0FBaEI7O0FBRUEsV0FBTztBQUNMQywyQkFBcUJDLElBQXJCLEVBQTJCO0FBQ3pCTCxnQkFBUU0sTUFBUixDQUFlLEVBQUNELElBQUQsRUFBT0YsT0FBUCxFQUFmO0FBQ0QsT0FISTs7QUFLTEksNkJBQXVCRixJQUF2QixFQUE2QjtBQUMzQixZQUFJQSxLQUFLRyxVQUFMLENBQWdCQyxNQUFoQixLQUEyQixDQUEvQixFQUFrQztBQUNoQyxpQkFBT1QsUUFBUU0sTUFBUixDQUFlLEVBQUNELElBQUQsRUFBT0YsT0FBUCxFQUFmLENBQVA7QUFDRDs7QUFFRCxjQUFNTyxZQUFZTCxLQUFLRyxVQUFMLENBQWdCRyxJQUFoQixDQUFxQkMsYUFBYUEsVUFBVUMsUUFBVixDQUFtQkMsSUFBbkIsS0FBNEIsU0FBOUQsQ0FBbEI7QUFDQSxZQUFJSixTQUFKLEVBQWU7QUFDYlYsa0JBQVFNLE1BQVIsQ0FBZSxFQUFDRCxJQUFELEVBQU9GLE9BQVAsRUFBZjtBQUNEO0FBQ0Y7QUFkSSxLQUFQO0FBZ0JEO0FBN0JjLENBQWpCIiwiZmlsZSI6InJ1bGVzL25vLW5hbWVkLWV4cG9ydC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBkb2NzVXJsIGZyb20gJy4uL2RvY3NVcmwnXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBtZXRhOiB7XG4gICAgZG9jczogeyB1cmw6IGRvY3NVcmwoJ25vLW5hbWVkLWV4cG9ydCcpIH0sXG4gIH0sXG5cbiAgY3JlYXRlKGNvbnRleHQpIHtcbiAgICAvLyBpZ25vcmUgbm9uLW1vZHVsZXNcbiAgICBpZiAoY29udGV4dC5wYXJzZXJPcHRpb25zLnNvdXJjZVR5cGUgIT09ICdtb2R1bGUnKSB7XG4gICAgICByZXR1cm4ge31cbiAgICB9XG5cbiAgICBjb25zdCBtZXNzYWdlID0gJ05hbWVkIGV4cG9ydHMgYXJlIG5vdCBhbGxvd2VkLidcblxuICAgIHJldHVybiB7XG4gICAgICBFeHBvcnRBbGxEZWNsYXJhdGlvbihub2RlKSB7XG4gICAgICAgIGNvbnRleHQucmVwb3J0KHtub2RlLCBtZXNzYWdlfSlcbiAgICAgIH0sXG5cbiAgICAgIEV4cG9ydE5hbWVkRGVjbGFyYXRpb24obm9kZSkge1xuICAgICAgICBpZiAobm9kZS5zcGVjaWZpZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBjb250ZXh0LnJlcG9ydCh7bm9kZSwgbWVzc2FnZX0pXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzb21lTmFtZWQgPSBub2RlLnNwZWNpZmllcnMuc29tZShzcGVjaWZpZXIgPT4gc3BlY2lmaWVyLmV4cG9ydGVkLm5hbWUgIT09ICdkZWZhdWx0JylcbiAgICAgICAgaWYgKHNvbWVOYW1lZCkge1xuICAgICAgICAgIGNvbnRleHQucmVwb3J0KHtub2RlLCBtZXNzYWdlfSlcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9XG4gIH0sXG59XG4iXX0=