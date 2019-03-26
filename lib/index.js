'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
const rules = exports.rules = {
  'no-unresolved': require('./rules/no-unresolved'),
  'named': require('./rules/named'),
  'default': require('./rules/default'),
  'namespace': require('./rules/namespace'),
  'no-namespace': require('./rules/no-namespace'),
  'export': require('./rules/export'),
  'no-mutable-exports': require('./rules/no-mutable-exports'),
  'extensions': require('./rules/extensions'),
  'no-restricted-paths': require('./rules/no-restricted-paths'),
  'no-internal-modules': require('./rules/no-internal-modules'),
  'group-exports': require('./rules/group-exports'),
  'no-relative-parent-imports': require('./rules/no-relative-parent-imports'),

  'no-self-import': require('./rules/no-self-import'),
  'no-cycle': require('./rules/no-cycle'),
  'no-named-default': require('./rules/no-named-default'),
  'no-named-as-default': require('./rules/no-named-as-default'),
  'no-named-as-default-member': require('./rules/no-named-as-default-member'),
  'no-anonymous-default-export': require('./rules/no-anonymous-default-export'),

  'no-imports': require('./rules/no-imports'),
  'no-commonjs': require('./rules/no-commonjs'),
  'no-amd': require('./rules/no-amd'),
  'no-duplicates': require('./rules/no-duplicates'),
  'first': require('./rules/first'),
  'max-dependencies': require('./rules/max-dependencies'),
  'no-extraneous-dependencies': require('./rules/no-extraneous-dependencies'),
  'no-absolute-path': require('./rules/no-absolute-path'),
  'no-nodejs-modules': require('./rules/no-nodejs-modules'),
  'no-webpack-loader-syntax': require('./rules/no-webpack-loader-syntax'),
  'order': require('./rules/order'),
  'newline-after-import': require('./rules/newline-after-import'),
  'prefer-default-export': require('./rules/prefer-default-export'),
  'no-default-export': require('./rules/no-default-export'),
  'no-named-export': require('./rules/no-named-export'),
  'no-dynamic-require': require('./rules/no-dynamic-require'),
  'unambiguous': require('./rules/unambiguous'),
  'no-unassigned-import': require('./rules/no-unassigned-import'),
  'no-useless-path-segments': require('./rules/no-useless-path-segments'),
  'dynamic-import-chunkname': require('./rules/dynamic-import-chunkname'),

  // export
  'exports-last': require('./rules/exports-last'),

  // metadata-based
  'no-deprecated': require('./rules/no-deprecated'),

  // deprecated aliases to rules
  'imports-first': require('./rules/imports-first')
};

const configs = exports.configs = {
  'recommended': require('../config/recommended'),

  'errors': require('../config/errors'),
  'warnings': require('../config/warnings'),

  // shhhh... work in progress "secret" rules
  'stage-0': require('../config/stage-0'),

  // useful stuff for folks using various environments
  'react': require('../config/react'),
  'react-native': require('../config/react-native'),
  'electron': require('../config/electron')
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzIl0sIm5hbWVzIjpbInJ1bGVzIiwicmVxdWlyZSIsImNvbmZpZ3MiXSwibWFwcGluZ3MiOiI7Ozs7O0FBQU8sTUFBTUEsd0JBQVE7QUFDbkIsbUJBQWlCQyxRQUFRLHVCQUFSLENBREU7QUFFbkIsV0FBU0EsUUFBUSxlQUFSLENBRlU7QUFHbkIsYUFBV0EsUUFBUSxpQkFBUixDQUhRO0FBSW5CLGVBQWFBLFFBQVEsbUJBQVIsQ0FKTTtBQUtuQixrQkFBZ0JBLFFBQVEsc0JBQVIsQ0FMRztBQU1uQixZQUFVQSxRQUFRLGdCQUFSLENBTlM7QUFPbkIsd0JBQXNCQSxRQUFRLDRCQUFSLENBUEg7QUFRbkIsZ0JBQWNBLFFBQVEsb0JBQVIsQ0FSSztBQVNuQix5QkFBdUJBLFFBQVEsNkJBQVIsQ0FUSjtBQVVuQix5QkFBdUJBLFFBQVEsNkJBQVIsQ0FWSjtBQVduQixtQkFBaUJBLFFBQVEsdUJBQVIsQ0FYRTtBQVluQixnQ0FBOEJBLFFBQVEsb0NBQVIsQ0FaWDs7QUFjbkIsb0JBQWtCQSxRQUFRLHdCQUFSLENBZEM7QUFlbkIsY0FBWUEsUUFBUSxrQkFBUixDQWZPO0FBZ0JuQixzQkFBb0JBLFFBQVEsMEJBQVIsQ0FoQkQ7QUFpQm5CLHlCQUF1QkEsUUFBUSw2QkFBUixDQWpCSjtBQWtCbkIsZ0NBQThCQSxRQUFRLG9DQUFSLENBbEJYO0FBbUJuQixpQ0FBK0JBLFFBQVEscUNBQVIsQ0FuQlo7O0FBcUJuQixnQkFBY0EsUUFBUSxvQkFBUixDQXJCSztBQXNCbkIsaUJBQWVBLFFBQVEscUJBQVIsQ0F0Qkk7QUF1Qm5CLFlBQVVBLFFBQVEsZ0JBQVIsQ0F2QlM7QUF3Qm5CLG1CQUFpQkEsUUFBUSx1QkFBUixDQXhCRTtBQXlCbkIsV0FBU0EsUUFBUSxlQUFSLENBekJVO0FBMEJuQixzQkFBb0JBLFFBQVEsMEJBQVIsQ0ExQkQ7QUEyQm5CLGdDQUE4QkEsUUFBUSxvQ0FBUixDQTNCWDtBQTRCbkIsc0JBQW9CQSxRQUFRLDBCQUFSLENBNUJEO0FBNkJuQix1QkFBcUJBLFFBQVEsMkJBQVIsQ0E3QkY7QUE4Qm5CLDhCQUE0QkEsUUFBUSxrQ0FBUixDQTlCVDtBQStCbkIsV0FBU0EsUUFBUSxlQUFSLENBL0JVO0FBZ0NuQiwwQkFBd0JBLFFBQVEsOEJBQVIsQ0FoQ0w7QUFpQ25CLDJCQUF5QkEsUUFBUSwrQkFBUixDQWpDTjtBQWtDbkIsdUJBQXFCQSxRQUFRLDJCQUFSLENBbENGO0FBbUNuQixxQkFBbUJBLFFBQVEseUJBQVIsQ0FuQ0E7QUFvQ25CLHdCQUFzQkEsUUFBUSw0QkFBUixDQXBDSDtBQXFDbkIsaUJBQWVBLFFBQVEscUJBQVIsQ0FyQ0k7QUFzQ25CLDBCQUF3QkEsUUFBUSw4QkFBUixDQXRDTDtBQXVDbkIsOEJBQTRCQSxRQUFRLGtDQUFSLENBdkNUO0FBd0NuQiw4QkFBNEJBLFFBQVEsa0NBQVIsQ0F4Q1Q7O0FBMENuQjtBQUNBLGtCQUFnQkEsUUFBUSxzQkFBUixDQTNDRzs7QUE2Q25CO0FBQ0EsbUJBQWlCQSxRQUFRLHVCQUFSLENBOUNFOztBQWdEbkI7QUFDQSxtQkFBaUJBLFFBQVEsdUJBQVI7QUFqREUsQ0FBZDs7QUFvREEsTUFBTUMsNEJBQVU7QUFDckIsaUJBQWVELFFBQVEsdUJBQVIsQ0FETTs7QUFHckIsWUFBVUEsUUFBUSxrQkFBUixDQUhXO0FBSXJCLGNBQVlBLFFBQVEsb0JBQVIsQ0FKUzs7QUFNckI7QUFDQSxhQUFXQSxRQUFRLG1CQUFSLENBUFU7O0FBU3JCO0FBQ0EsV0FBU0EsUUFBUSxpQkFBUixDQVZZO0FBV3JCLGtCQUFnQkEsUUFBUSx3QkFBUixDQVhLO0FBWXJCLGNBQVlBLFFBQVEsb0JBQVI7QUFaUyxDQUFoQiIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBydWxlcyA9IHtcbiAgJ25vLXVucmVzb2x2ZWQnOiByZXF1aXJlKCcuL3J1bGVzL25vLXVucmVzb2x2ZWQnKSxcbiAgJ25hbWVkJzogcmVxdWlyZSgnLi9ydWxlcy9uYW1lZCcpLFxuICAnZGVmYXVsdCc6IHJlcXVpcmUoJy4vcnVsZXMvZGVmYXVsdCcpLFxuICAnbmFtZXNwYWNlJzogcmVxdWlyZSgnLi9ydWxlcy9uYW1lc3BhY2UnKSxcbiAgJ25vLW5hbWVzcGFjZSc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tbmFtZXNwYWNlJyksXG4gICdleHBvcnQnOiByZXF1aXJlKCcuL3J1bGVzL2V4cG9ydCcpLFxuICAnbm8tbXV0YWJsZS1leHBvcnRzJzogcmVxdWlyZSgnLi9ydWxlcy9uby1tdXRhYmxlLWV4cG9ydHMnKSxcbiAgJ2V4dGVuc2lvbnMnOiByZXF1aXJlKCcuL3J1bGVzL2V4dGVuc2lvbnMnKSxcbiAgJ25vLXJlc3RyaWN0ZWQtcGF0aHMnOiByZXF1aXJlKCcuL3J1bGVzL25vLXJlc3RyaWN0ZWQtcGF0aHMnKSxcbiAgJ25vLWludGVybmFsLW1vZHVsZXMnOiByZXF1aXJlKCcuL3J1bGVzL25vLWludGVybmFsLW1vZHVsZXMnKSxcbiAgJ2dyb3VwLWV4cG9ydHMnOiByZXF1aXJlKCcuL3J1bGVzL2dyb3VwLWV4cG9ydHMnKSxcbiAgJ25vLXJlbGF0aXZlLXBhcmVudC1pbXBvcnRzJzogcmVxdWlyZSgnLi9ydWxlcy9uby1yZWxhdGl2ZS1wYXJlbnQtaW1wb3J0cycpLFxuXG4gICduby1zZWxmLWltcG9ydCc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tc2VsZi1pbXBvcnQnKSxcbiAgJ25vLWN5Y2xlJzogcmVxdWlyZSgnLi9ydWxlcy9uby1jeWNsZScpLFxuICAnbm8tbmFtZWQtZGVmYXVsdCc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tbmFtZWQtZGVmYXVsdCcpLFxuICAnbm8tbmFtZWQtYXMtZGVmYXVsdCc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tbmFtZWQtYXMtZGVmYXVsdCcpLFxuICAnbm8tbmFtZWQtYXMtZGVmYXVsdC1tZW1iZXInOiByZXF1aXJlKCcuL3J1bGVzL25vLW5hbWVkLWFzLWRlZmF1bHQtbWVtYmVyJyksXG4gICduby1hbm9ueW1vdXMtZGVmYXVsdC1leHBvcnQnOiByZXF1aXJlKCcuL3J1bGVzL25vLWFub255bW91cy1kZWZhdWx0LWV4cG9ydCcpLFxuXG4gICduby1pbXBvcnRzJzogcmVxdWlyZSgnLi9ydWxlcy9uby1pbXBvcnRzJyksXG4gICduby1jb21tb25qcyc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tY29tbW9uanMnKSxcbiAgJ25vLWFtZCc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tYW1kJyksXG4gICduby1kdXBsaWNhdGVzJzogcmVxdWlyZSgnLi9ydWxlcy9uby1kdXBsaWNhdGVzJyksXG4gICdmaXJzdCc6IHJlcXVpcmUoJy4vcnVsZXMvZmlyc3QnKSxcbiAgJ21heC1kZXBlbmRlbmNpZXMnOiByZXF1aXJlKCcuL3J1bGVzL21heC1kZXBlbmRlbmNpZXMnKSxcbiAgJ25vLWV4dHJhbmVvdXMtZGVwZW5kZW5jaWVzJzogcmVxdWlyZSgnLi9ydWxlcy9uby1leHRyYW5lb3VzLWRlcGVuZGVuY2llcycpLFxuICAnbm8tYWJzb2x1dGUtcGF0aCc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tYWJzb2x1dGUtcGF0aCcpLFxuICAnbm8tbm9kZWpzLW1vZHVsZXMnOiByZXF1aXJlKCcuL3J1bGVzL25vLW5vZGVqcy1tb2R1bGVzJyksXG4gICduby13ZWJwYWNrLWxvYWRlci1zeW50YXgnOiByZXF1aXJlKCcuL3J1bGVzL25vLXdlYnBhY2stbG9hZGVyLXN5bnRheCcpLFxuICAnb3JkZXInOiByZXF1aXJlKCcuL3J1bGVzL29yZGVyJyksXG4gICduZXdsaW5lLWFmdGVyLWltcG9ydCc6IHJlcXVpcmUoJy4vcnVsZXMvbmV3bGluZS1hZnRlci1pbXBvcnQnKSxcbiAgJ3ByZWZlci1kZWZhdWx0LWV4cG9ydCc6IHJlcXVpcmUoJy4vcnVsZXMvcHJlZmVyLWRlZmF1bHQtZXhwb3J0JyksXG4gICduby1kZWZhdWx0LWV4cG9ydCc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tZGVmYXVsdC1leHBvcnQnKSxcbiAgJ25vLW5hbWVkLWV4cG9ydCc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tbmFtZWQtZXhwb3J0JyksXG4gICduby1keW5hbWljLXJlcXVpcmUnOiByZXF1aXJlKCcuL3J1bGVzL25vLWR5bmFtaWMtcmVxdWlyZScpLFxuICAndW5hbWJpZ3VvdXMnOiByZXF1aXJlKCcuL3J1bGVzL3VuYW1iaWd1b3VzJyksXG4gICduby11bmFzc2lnbmVkLWltcG9ydCc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tdW5hc3NpZ25lZC1pbXBvcnQnKSxcbiAgJ25vLXVzZWxlc3MtcGF0aC1zZWdtZW50cyc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tdXNlbGVzcy1wYXRoLXNlZ21lbnRzJyksXG4gICdkeW5hbWljLWltcG9ydC1jaHVua25hbWUnOiByZXF1aXJlKCcuL3J1bGVzL2R5bmFtaWMtaW1wb3J0LWNodW5rbmFtZScpLFxuXG4gIC8vIGV4cG9ydFxuICAnZXhwb3J0cy1sYXN0JzogcmVxdWlyZSgnLi9ydWxlcy9leHBvcnRzLWxhc3QnKSxcblxuICAvLyBtZXRhZGF0YS1iYXNlZFxuICAnbm8tZGVwcmVjYXRlZCc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tZGVwcmVjYXRlZCcpLFxuXG4gIC8vIGRlcHJlY2F0ZWQgYWxpYXNlcyB0byBydWxlc1xuICAnaW1wb3J0cy1maXJzdCc6IHJlcXVpcmUoJy4vcnVsZXMvaW1wb3J0cy1maXJzdCcpLFxufVxuXG5leHBvcnQgY29uc3QgY29uZmlncyA9IHtcbiAgJ3JlY29tbWVuZGVkJzogcmVxdWlyZSgnLi4vY29uZmlnL3JlY29tbWVuZGVkJyksXG5cbiAgJ2Vycm9ycyc6IHJlcXVpcmUoJy4uL2NvbmZpZy9lcnJvcnMnKSxcbiAgJ3dhcm5pbmdzJzogcmVxdWlyZSgnLi4vY29uZmlnL3dhcm5pbmdzJyksXG5cbiAgLy8gc2hoaGguLi4gd29yayBpbiBwcm9ncmVzcyBcInNlY3JldFwiIHJ1bGVzXG4gICdzdGFnZS0wJzogcmVxdWlyZSgnLi4vY29uZmlnL3N0YWdlLTAnKSxcblxuICAvLyB1c2VmdWwgc3R1ZmYgZm9yIGZvbGtzIHVzaW5nIHZhcmlvdXMgZW52aXJvbm1lbnRzXG4gICdyZWFjdCc6IHJlcXVpcmUoJy4uL2NvbmZpZy9yZWFjdCcpLFxuICAncmVhY3QtbmF0aXZlJzogcmVxdWlyZSgnLi4vY29uZmlnL3JlYWN0LW5hdGl2ZScpLFxuICAnZWxlY3Ryb24nOiByZXF1aXJlKCcuLi9jb25maWcvZWxlY3Ryb24nKSxcbn1cbiJdfQ==