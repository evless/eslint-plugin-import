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
  'no-unused-modules': require('./rules/no-unused-modules'),

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
  'electron': require('../config/electron'),
  'typescript': require('../config/typescript')
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6WyJydWxlcyIsInJlcXVpcmUiLCJjb25maWdzIl0sIm1hcHBpbmdzIjoiOzs7OztBQUFPLE1BQU1BLHdCQUFRO0FBQ25CLG1CQUFpQkMsUUFBUSx1QkFBUixDQURFO0FBRW5CLFdBQVNBLFFBQVEsZUFBUixDQUZVO0FBR25CLGFBQVdBLFFBQVEsaUJBQVIsQ0FIUTtBQUluQixlQUFhQSxRQUFRLG1CQUFSLENBSk07QUFLbkIsa0JBQWdCQSxRQUFRLHNCQUFSLENBTEc7QUFNbkIsWUFBVUEsUUFBUSxnQkFBUixDQU5TO0FBT25CLHdCQUFzQkEsUUFBUSw0QkFBUixDQVBIO0FBUW5CLGdCQUFjQSxRQUFRLG9CQUFSLENBUks7QUFTbkIseUJBQXVCQSxRQUFRLDZCQUFSLENBVEo7QUFVbkIseUJBQXVCQSxRQUFRLDZCQUFSLENBVko7QUFXbkIsbUJBQWlCQSxRQUFRLHVCQUFSLENBWEU7QUFZbkIsZ0NBQThCQSxRQUFRLG9DQUFSLENBWlg7O0FBY25CLG9CQUFrQkEsUUFBUSx3QkFBUixDQWRDO0FBZW5CLGNBQVlBLFFBQVEsa0JBQVIsQ0FmTztBQWdCbkIsc0JBQW9CQSxRQUFRLDBCQUFSLENBaEJEO0FBaUJuQix5QkFBdUJBLFFBQVEsNkJBQVIsQ0FqQko7QUFrQm5CLGdDQUE4QkEsUUFBUSxvQ0FBUixDQWxCWDtBQW1CbkIsaUNBQStCQSxRQUFRLHFDQUFSLENBbkJaO0FBb0JuQix1QkFBcUJBLFFBQVEsMkJBQVIsQ0FwQkY7O0FBc0JuQixnQkFBY0EsUUFBUSxvQkFBUixDQXRCSztBQXVCbkIsaUJBQWVBLFFBQVEscUJBQVIsQ0F2Qkk7QUF3Qm5CLFlBQVVBLFFBQVEsZ0JBQVIsQ0F4QlM7QUF5Qm5CLG1CQUFpQkEsUUFBUSx1QkFBUixDQXpCRTtBQTBCbkIsV0FBU0EsUUFBUSxlQUFSLENBMUJVO0FBMkJuQixzQkFBb0JBLFFBQVEsMEJBQVIsQ0EzQkQ7QUE0Qm5CLGdDQUE4QkEsUUFBUSxvQ0FBUixDQTVCWDtBQTZCbkIsc0JBQW9CQSxRQUFRLDBCQUFSLENBN0JEO0FBOEJuQix1QkFBcUJBLFFBQVEsMkJBQVIsQ0E5QkY7QUErQm5CLDhCQUE0QkEsUUFBUSxrQ0FBUixDQS9CVDtBQWdDbkIsV0FBU0EsUUFBUSxlQUFSLENBaENVO0FBaUNuQiwwQkFBd0JBLFFBQVEsOEJBQVIsQ0FqQ0w7QUFrQ25CLDJCQUF5QkEsUUFBUSwrQkFBUixDQWxDTjtBQW1DbkIsdUJBQXFCQSxRQUFRLDJCQUFSLENBbkNGO0FBb0NuQixxQkFBbUJBLFFBQVEseUJBQVIsQ0FwQ0E7QUFxQ25CLHdCQUFzQkEsUUFBUSw0QkFBUixDQXJDSDtBQXNDbkIsaUJBQWVBLFFBQVEscUJBQVIsQ0F0Q0k7QUF1Q25CLDBCQUF3QkEsUUFBUSw4QkFBUixDQXZDTDtBQXdDbkIsOEJBQTRCQSxRQUFRLGtDQUFSLENBeENUO0FBeUNuQiw4QkFBNEJBLFFBQVEsa0NBQVIsQ0F6Q1Q7O0FBMkNuQjtBQUNBLGtCQUFnQkEsUUFBUSxzQkFBUixDQTVDRzs7QUE4Q25CO0FBQ0EsbUJBQWlCQSxRQUFRLHVCQUFSLENBL0NFOztBQWlEbkI7QUFDQSxtQkFBaUJBLFFBQVEsdUJBQVI7QUFsREUsQ0FBZDs7QUFxREEsTUFBTUMsNEJBQVU7QUFDckIsaUJBQWVELFFBQVEsdUJBQVIsQ0FETTs7QUFHckIsWUFBVUEsUUFBUSxrQkFBUixDQUhXO0FBSXJCLGNBQVlBLFFBQVEsb0JBQVIsQ0FKUzs7QUFNckI7QUFDQSxhQUFXQSxRQUFRLG1CQUFSLENBUFU7O0FBU3JCO0FBQ0EsV0FBU0EsUUFBUSxpQkFBUixDQVZZO0FBV3JCLGtCQUFnQkEsUUFBUSx3QkFBUixDQVhLO0FBWXJCLGNBQVlBLFFBQVEsb0JBQVIsQ0FaUztBQWFyQixnQkFBY0EsUUFBUSxzQkFBUjtBQWJPLENBQWhCIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IHJ1bGVzID0ge1xuICAnbm8tdW5yZXNvbHZlZCc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tdW5yZXNvbHZlZCcpLFxuICAnbmFtZWQnOiByZXF1aXJlKCcuL3J1bGVzL25hbWVkJyksXG4gICdkZWZhdWx0JzogcmVxdWlyZSgnLi9ydWxlcy9kZWZhdWx0JyksXG4gICduYW1lc3BhY2UnOiByZXF1aXJlKCcuL3J1bGVzL25hbWVzcGFjZScpLFxuICAnbm8tbmFtZXNwYWNlJzogcmVxdWlyZSgnLi9ydWxlcy9uby1uYW1lc3BhY2UnKSxcbiAgJ2V4cG9ydCc6IHJlcXVpcmUoJy4vcnVsZXMvZXhwb3J0JyksXG4gICduby1tdXRhYmxlLWV4cG9ydHMnOiByZXF1aXJlKCcuL3J1bGVzL25vLW11dGFibGUtZXhwb3J0cycpLFxuICAnZXh0ZW5zaW9ucyc6IHJlcXVpcmUoJy4vcnVsZXMvZXh0ZW5zaW9ucycpLFxuICAnbm8tcmVzdHJpY3RlZC1wYXRocyc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tcmVzdHJpY3RlZC1wYXRocycpLFxuICAnbm8taW50ZXJuYWwtbW9kdWxlcyc6IHJlcXVpcmUoJy4vcnVsZXMvbm8taW50ZXJuYWwtbW9kdWxlcycpLFxuICAnZ3JvdXAtZXhwb3J0cyc6IHJlcXVpcmUoJy4vcnVsZXMvZ3JvdXAtZXhwb3J0cycpLFxuICAnbm8tcmVsYXRpdmUtcGFyZW50LWltcG9ydHMnOiByZXF1aXJlKCcuL3J1bGVzL25vLXJlbGF0aXZlLXBhcmVudC1pbXBvcnRzJyksXG5cbiAgJ25vLXNlbGYtaW1wb3J0JzogcmVxdWlyZSgnLi9ydWxlcy9uby1zZWxmLWltcG9ydCcpLFxuICAnbm8tY3ljbGUnOiByZXF1aXJlKCcuL3J1bGVzL25vLWN5Y2xlJyksXG4gICduby1uYW1lZC1kZWZhdWx0JzogcmVxdWlyZSgnLi9ydWxlcy9uby1uYW1lZC1kZWZhdWx0JyksXG4gICduby1uYW1lZC1hcy1kZWZhdWx0JzogcmVxdWlyZSgnLi9ydWxlcy9uby1uYW1lZC1hcy1kZWZhdWx0JyksXG4gICduby1uYW1lZC1hcy1kZWZhdWx0LW1lbWJlcic6IHJlcXVpcmUoJy4vcnVsZXMvbm8tbmFtZWQtYXMtZGVmYXVsdC1tZW1iZXInKSxcbiAgJ25vLWFub255bW91cy1kZWZhdWx0LWV4cG9ydCc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tYW5vbnltb3VzLWRlZmF1bHQtZXhwb3J0JyksXG4gICduby11bnVzZWQtbW9kdWxlcyc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tdW51c2VkLW1vZHVsZXMnKSxcblxuICAnbm8taW1wb3J0cyc6IHJlcXVpcmUoJy4vcnVsZXMvbm8taW1wb3J0cycpLFxuICAnbm8tY29tbW9uanMnOiByZXF1aXJlKCcuL3J1bGVzL25vLWNvbW1vbmpzJyksXG4gICduby1hbWQnOiByZXF1aXJlKCcuL3J1bGVzL25vLWFtZCcpLFxuICAnbm8tZHVwbGljYXRlcyc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tZHVwbGljYXRlcycpLFxuICAnZmlyc3QnOiByZXF1aXJlKCcuL3J1bGVzL2ZpcnN0JyksXG4gICdtYXgtZGVwZW5kZW5jaWVzJzogcmVxdWlyZSgnLi9ydWxlcy9tYXgtZGVwZW5kZW5jaWVzJyksXG4gICduby1leHRyYW5lb3VzLWRlcGVuZGVuY2llcyc6IHJlcXVpcmUoJy4vcnVsZXMvbm8tZXh0cmFuZW91cy1kZXBlbmRlbmNpZXMnKSxcbiAgJ25vLWFic29sdXRlLXBhdGgnOiByZXF1aXJlKCcuL3J1bGVzL25vLWFic29sdXRlLXBhdGgnKSxcbiAgJ25vLW5vZGVqcy1tb2R1bGVzJzogcmVxdWlyZSgnLi9ydWxlcy9uby1ub2RlanMtbW9kdWxlcycpLFxuICAnbm8td2VicGFjay1sb2FkZXItc3ludGF4JzogcmVxdWlyZSgnLi9ydWxlcy9uby13ZWJwYWNrLWxvYWRlci1zeW50YXgnKSxcbiAgJ29yZGVyJzogcmVxdWlyZSgnLi9ydWxlcy9vcmRlcicpLFxuICAnbmV3bGluZS1hZnRlci1pbXBvcnQnOiByZXF1aXJlKCcuL3J1bGVzL25ld2xpbmUtYWZ0ZXItaW1wb3J0JyksXG4gICdwcmVmZXItZGVmYXVsdC1leHBvcnQnOiByZXF1aXJlKCcuL3J1bGVzL3ByZWZlci1kZWZhdWx0LWV4cG9ydCcpLFxuICAnbm8tZGVmYXVsdC1leHBvcnQnOiByZXF1aXJlKCcuL3J1bGVzL25vLWRlZmF1bHQtZXhwb3J0JyksXG4gICduby1uYW1lZC1leHBvcnQnOiByZXF1aXJlKCcuL3J1bGVzL25vLW5hbWVkLWV4cG9ydCcpLFxuICAnbm8tZHluYW1pYy1yZXF1aXJlJzogcmVxdWlyZSgnLi9ydWxlcy9uby1keW5hbWljLXJlcXVpcmUnKSxcbiAgJ3VuYW1iaWd1b3VzJzogcmVxdWlyZSgnLi9ydWxlcy91bmFtYmlndW91cycpLFxuICAnbm8tdW5hc3NpZ25lZC1pbXBvcnQnOiByZXF1aXJlKCcuL3J1bGVzL25vLXVuYXNzaWduZWQtaW1wb3J0JyksXG4gICduby11c2VsZXNzLXBhdGgtc2VnbWVudHMnOiByZXF1aXJlKCcuL3J1bGVzL25vLXVzZWxlc3MtcGF0aC1zZWdtZW50cycpLFxuICAnZHluYW1pYy1pbXBvcnQtY2h1bmtuYW1lJzogcmVxdWlyZSgnLi9ydWxlcy9keW5hbWljLWltcG9ydC1jaHVua25hbWUnKSxcblxuICAvLyBleHBvcnRcbiAgJ2V4cG9ydHMtbGFzdCc6IHJlcXVpcmUoJy4vcnVsZXMvZXhwb3J0cy1sYXN0JyksXG5cbiAgLy8gbWV0YWRhdGEtYmFzZWRcbiAgJ25vLWRlcHJlY2F0ZWQnOiByZXF1aXJlKCcuL3J1bGVzL25vLWRlcHJlY2F0ZWQnKSxcblxuICAvLyBkZXByZWNhdGVkIGFsaWFzZXMgdG8gcnVsZXNcbiAgJ2ltcG9ydHMtZmlyc3QnOiByZXF1aXJlKCcuL3J1bGVzL2ltcG9ydHMtZmlyc3QnKSxcbn1cblxuZXhwb3J0IGNvbnN0IGNvbmZpZ3MgPSB7XG4gICdyZWNvbW1lbmRlZCc6IHJlcXVpcmUoJy4uL2NvbmZpZy9yZWNvbW1lbmRlZCcpLFxuXG4gICdlcnJvcnMnOiByZXF1aXJlKCcuLi9jb25maWcvZXJyb3JzJyksXG4gICd3YXJuaW5ncyc6IHJlcXVpcmUoJy4uL2NvbmZpZy93YXJuaW5ncycpLFxuXG4gIC8vIHNoaGhoLi4uIHdvcmsgaW4gcHJvZ3Jlc3MgXCJzZWNyZXRcIiBydWxlc1xuICAnc3RhZ2UtMCc6IHJlcXVpcmUoJy4uL2NvbmZpZy9zdGFnZS0wJyksXG5cbiAgLy8gdXNlZnVsIHN0dWZmIGZvciBmb2xrcyB1c2luZyB2YXJpb3VzIGVudmlyb25tZW50c1xuICAncmVhY3QnOiByZXF1aXJlKCcuLi9jb25maWcvcmVhY3QnKSxcbiAgJ3JlYWN0LW5hdGl2ZSc6IHJlcXVpcmUoJy4uL2NvbmZpZy9yZWFjdC1uYXRpdmUnKSxcbiAgJ2VsZWN0cm9uJzogcmVxdWlyZSgnLi4vY29uZmlnL2VsZWN0cm9uJyksXG4gICd0eXBlc2NyaXB0JzogcmVxdWlyZSgnLi4vY29uZmlnL3R5cGVzY3JpcHQnKSxcbn1cbiJdfQ==