'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.isAbsolute = isAbsolute;
exports.isPrivate = isPrivate;
exports.isBuiltIn = isBuiltIn;
exports.isExternalModuleMain = isExternalModuleMain;
exports.isScopedMain = isScopedMain;
exports.default = resolveImportType;

var _cond = require('lodash/cond');

var _cond2 = _interopRequireDefault(_cond);

var _core = require('resolve/lib/core');

var _core2 = _interopRequireDefault(_core);

var _path = require('path');

var _resolve = require('eslint-module-utils/resolve');

var _resolve2 = _interopRequireDefault(_resolve);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function constant(value) {
  return () => value;
}

function baseModule(name) {
  if (isScoped(name)) {
    var _name$split = name.split('/'),
        _name$split2 = _slicedToArray(_name$split, 2);

    const scope = _name$split2[0],
          pkg = _name$split2[1];

    return `${scope}/${pkg}`;
  }

  var _name$split3 = name.split('/'),
      _name$split4 = _slicedToArray(_name$split3, 1);

  const pkg = _name$split4[0];

  return pkg;
}

function isAbsolute(name, settings, path) {
  let groups = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

  const absoluteGroup = groups.find((_ref) => {
    let name = _ref.name;
    return name === 'absolute';
  });
  const pattern = absoluteGroup && absoluteGroup.pattern;
  const regexp = pattern && new RegExp(pattern);

  return name.indexOf('/') === 0 || regexp && regexp.test(name);
}

function isPrivate(name, settings, path) {
  let groups = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

  const absoluteGroup = groups.find((_ref2) => {
    let name = _ref2.name;
    return name === 'private';
  });
  const pattern = absoluteGroup && absoluteGroup.pattern;
  const regexp = !!pattern && new RegExp(pattern);

  return !!regexp && regexp.test(name);
}

function isBuiltIn(name, settings) {
  const base = baseModule(name);
  const extras = settings && settings['import/core-modules'] || [];
  return _core2.default[base] || extras.indexOf(base) > -1;
}

function isExternalPath(path, name, settings) {
  const folders = settings && settings['import/external-module-folders'] || ['node_modules'];
  return !path || folders.some(folder => -1 < path.indexOf((0, _path.join)(folder, name)));
}

const externalModuleRegExp = /^\w/;
function isExternalModule(name, settings, path) {
  return externalModuleRegExp.test(name) && isExternalPath(path, name, settings);
}

const externalModuleMainRegExp = /^[\w]((?!\/).)*$/;
function isExternalModuleMain(name, settings, path) {
  return externalModuleMainRegExp.test(name) && isExternalPath(path, name, settings);
}

const scopedRegExp = /^@[^/]+\/[^/]+/;
function isScoped(name) {
  return scopedRegExp.test(name);
}

const scopedMainRegExp = /^@[^/]+\/?[^/]+$/;
function isScopedMain(name) {
  return scopedMainRegExp.test(name);
}

function isInternalModule(name, settings, path) {
  return externalModuleRegExp.test(name) && !isExternalPath(path, name, settings);
}

function isRelativeToParent(name) {
  return (/^\.\.[\\/]/.test(name)
  );
}

const indexFiles = ['.', './', './index', './index.js'];
function isIndex(name) {
  return indexFiles.indexOf(name) !== -1;
}

function isRelativeToSibling(name) {
  return (/^\.[\\/]/.test(name)
  );
}

const typeTest = (0, _cond2.default)([[isAbsolute, constant('absolute')], [isPrivate, constant('private')], [isBuiltIn, constant('builtin')], [isExternalModule, constant('external')], [isScoped, constant('external')], [isInternalModule, constant('internal')], [isRelativeToParent, constant('parent')], [isIndex, constant('index')], [isRelativeToSibling, constant('sibling')], [constant(true), constant('unknown')]]);

function resolveImportType(name, context, groups) {
  return typeTest(name, context.settings, (0, _resolve2.default)(name, context), groups);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvaW1wb3J0VHlwZS5qcyJdLCJuYW1lcyI6WyJpc0Fic29sdXRlIiwiaXNQcml2YXRlIiwiaXNCdWlsdEluIiwiaXNFeHRlcm5hbE1vZHVsZU1haW4iLCJpc1Njb3BlZE1haW4iLCJyZXNvbHZlSW1wb3J0VHlwZSIsImNvbnN0YW50IiwidmFsdWUiLCJiYXNlTW9kdWxlIiwibmFtZSIsImlzU2NvcGVkIiwic3BsaXQiLCJzY29wZSIsInBrZyIsInNldHRpbmdzIiwicGF0aCIsImdyb3VwcyIsImFic29sdXRlR3JvdXAiLCJmaW5kIiwicGF0dGVybiIsInJlZ2V4cCIsIlJlZ0V4cCIsImluZGV4T2YiLCJ0ZXN0IiwiYmFzZSIsImV4dHJhcyIsImNvcmVNb2R1bGVzIiwiaXNFeHRlcm5hbFBhdGgiLCJmb2xkZXJzIiwic29tZSIsImZvbGRlciIsImV4dGVybmFsTW9kdWxlUmVnRXhwIiwiaXNFeHRlcm5hbE1vZHVsZSIsImV4dGVybmFsTW9kdWxlTWFpblJlZ0V4cCIsInNjb3BlZFJlZ0V4cCIsInNjb3BlZE1haW5SZWdFeHAiLCJpc0ludGVybmFsTW9kdWxlIiwiaXNSZWxhdGl2ZVRvUGFyZW50IiwiaW5kZXhGaWxlcyIsImlzSW5kZXgiLCJpc1JlbGF0aXZlVG9TaWJsaW5nIiwidHlwZVRlc3QiLCJjb250ZXh0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztRQW1CZ0JBLFUsR0FBQUEsVTtRQVFBQyxTLEdBQUFBLFM7UUFRQUMsUyxHQUFBQSxTO1FBaUJBQyxvQixHQUFBQSxvQjtRQVVBQyxZLEdBQUFBLFk7a0JBa0NRQyxpQjs7QUFoR3hCOzs7O0FBQ0E7Ozs7QUFDQTs7QUFFQTs7Ozs7O0FBRUEsU0FBU0MsUUFBVCxDQUFrQkMsS0FBbEIsRUFBeUI7QUFDdkIsU0FBTyxNQUFNQSxLQUFiO0FBQ0Q7O0FBRUQsU0FBU0MsVUFBVCxDQUFvQkMsSUFBcEIsRUFBMEI7QUFDeEIsTUFBSUMsU0FBU0QsSUFBVCxDQUFKLEVBQW9CO0FBQUEsc0JBQ0dBLEtBQUtF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LFVBQVQsQ0FBWCxDQUxvQixFQU1wQixDQUFDOEIsZ0JBQUQsRUFBbUI5QixTQUFTLFVBQVQsQ0FBbkIsQ0FOb0IsRUFPcEIsQ0FBQytCLGtCQUFELEVBQXFCL0IsU0FBUyxRQUFULENBQXJCLENBUG9CLEVBUXBCLENBQUNpQyxPQUFELEVBQVVqQyxTQUFTLE9BQVQsQ0FBVixDQVJvQixFQVNwQixDQUFDa0MsbUJBQUQsRUFBc0JsQyxTQUFTLFNBQVQsQ0FBdEIsQ0FUb0IsRUFVcEIsQ0FBQ0EsU0FBUyxJQUFULENBQUQsRUFBaUJBLFNBQVMsU0FBVCxDQUFqQixDQVZvQixDQUFMLENBQWpCOztBQWFlLFNBQVNELGlCQUFULENBQTJCSSxJQUEzQixFQUFpQ2lDLE9BQWpDLEVBQTBDMUIsTUFBMUMsRUFBa0Q7QUFDL0QsU0FBT3lCLFNBQVNoQyxJQUFULEVBQWVpQyxRQUFRNUIsUUFBdkIsRUFBaUMsdUJBQVFMLElBQVIsRUFBY2lDLE9BQWQsQ0FBakMsRUFBeUQxQixNQUF6RCxDQUFQO0FBQ0QiLCJmaWxlIjoiY29yZS9pbXBvcnRUeXBlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNvbmQgZnJvbSAnbG9kYXNoL2NvbmQnXG5pbXBvcnQgY29yZU1vZHVsZXMgZnJvbSAncmVzb2x2ZS9saWIvY29yZSdcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJ1xuXG5pbXBvcnQgcmVzb2x2ZSBmcm9tICdlc2xpbnQtbW9kdWxlLXV0aWxzL3Jlc29sdmUnXG5cbmZ1bmN0aW9uIGNvbnN0YW50KHZhbHVlKSB7XG4gIHJldHVybiAoKSA9PiB2YWx1ZVxufVxuXG5mdW5jdGlvbiBiYXNlTW9kdWxlKG5hbWUpIHtcbiAgaWYgKGlzU2NvcGVkKG5hbWUpKSB7XG4gICAgY29uc3QgW3Njb3BlLCBwa2ddID0gbmFtZS5zcGxpdCgnLycpXG4gICAgcmV0dXJuIGAke3Njb3BlfS8ke3BrZ31gXG4gIH1cbiAgY29uc3QgW3BrZ10gPSBuYW1lLnNwbGl0KCcvJylcbiAgcmV0dXJuIHBrZ1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBYnNvbHV0ZShuYW1lLCBzZXR0aW5ncywgcGF0aCwgZ3JvdXBzID0gW10pIHtcbiAgY29uc3QgYWJzb2x1dGVHcm91cCA9IGdyb3Vwcy5maW5kKCh7IG5hbWUgfSkgPT4gbmFtZSA9PT0gJ2Fic29sdXRlJylcbiAgY29uc3QgcGF0dGVybiA9IGFic29sdXRlR3JvdXAgJiYgYWJzb2x1dGVHcm91cC5wYXR0ZXJuXG4gIGNvbnN0IHJlZ2V4cCA9IHBhdHRlcm4gJiYgbmV3IFJlZ0V4cChwYXR0ZXJuKVxuXG4gIHJldHVybiBuYW1lLmluZGV4T2YoJy8nKSA9PT0gMCB8fCByZWdleHAgJiYgcmVnZXhwLnRlc3QobmFtZSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUHJpdmF0ZShuYW1lLCBzZXR0aW5ncywgcGF0aCwgZ3JvdXBzID0gW10pIHtcbiAgY29uc3QgYWJzb2x1dGVHcm91cCA9IGdyb3Vwcy5maW5kKCh7IG5hbWUgfSkgPT4gbmFtZSA9PT0gJ3ByaXZhdGUnKVxuICBjb25zdCBwYXR0ZXJuID0gYWJzb2x1dGVHcm91cCAmJiBhYnNvbHV0ZUdyb3VwLnBhdHRlcm5cbiAgY29uc3QgcmVnZXhwID0gISFwYXR0ZXJuICYmIG5ldyBSZWdFeHAocGF0dGVybilcblxuICByZXR1cm4gISFyZWdleHAgJiYgcmVnZXhwLnRlc3QobmFtZSlcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQnVpbHRJbihuYW1lLCBzZXR0aW5ncykge1xuICBjb25zdCBiYXNlID0gYmFzZU1vZHVsZShuYW1lKVxuICBjb25zdCBleHRyYXMgPSAoc2V0dGluZ3MgJiYgc2V0dGluZ3NbJ2ltcG9ydC9jb3JlLW1vZHVsZXMnXSkgfHwgW11cbiAgcmV0dXJuIGNvcmVNb2R1bGVzW2Jhc2VdIHx8IGV4dHJhcy5pbmRleE9mKGJhc2UpID4gLTFcbn1cblxuZnVuY3Rpb24gaXNFeHRlcm5hbFBhdGgocGF0aCwgbmFtZSwgc2V0dGluZ3MpIHtcbiAgY29uc3QgZm9sZGVycyA9IChzZXR0aW5ncyAmJiBzZXR0aW5nc1snaW1wb3J0L2V4dGVybmFsLW1vZHVsZS1mb2xkZXJzJ10pIHx8IFsnbm9kZV9tb2R1bGVzJ11cbiAgcmV0dXJuICFwYXRoIHx8IGZvbGRlcnMuc29tZShmb2xkZXIgPT4gLTEgPCBwYXRoLmluZGV4T2Yoam9pbihmb2xkZXIsIG5hbWUpKSlcbn1cblxuY29uc3QgZXh0ZXJuYWxNb2R1bGVSZWdFeHAgPSAvXlxcdy9cbmZ1bmN0aW9uIGlzRXh0ZXJuYWxNb2R1bGUobmFtZSwgc2V0dGluZ3MsIHBhdGgpIHtcbiAgcmV0dXJuIGV4dGVybmFsTW9kdWxlUmVnRXhwLnRlc3QobmFtZSkgJiYgaXNFeHRlcm5hbFBhdGgocGF0aCwgbmFtZSwgc2V0dGluZ3MpXG59XG5cbmNvbnN0IGV4dGVybmFsTW9kdWxlTWFpblJlZ0V4cCA9IC9eW1xcd10oKD8hXFwvKS4pKiQvXG5leHBvcnQgZnVuY3Rpb24gaXNFeHRlcm5hbE1vZHVsZU1haW4obmFtZSwgc2V0dGluZ3MsIHBhdGgpIHtcbiAgcmV0dXJuIGV4dGVybmFsTW9kdWxlTWFpblJlZ0V4cC50ZXN0KG5hbWUpICYmIGlzRXh0ZXJuYWxQYXRoKHBhdGgsIG5hbWUsIHNldHRpbmdzKVxufVxuXG5jb25zdCBzY29wZWRSZWdFeHAgPSAvXkBbXi9dK1xcL1teL10rL1xuZnVuY3Rpb24gaXNTY29wZWQobmFtZSkge1xuICByZXR1cm4gc2NvcGVkUmVnRXhwLnRlc3QobmFtZSlcbn1cblxuY29uc3Qgc2NvcGVkTWFpblJlZ0V4cCA9IC9eQFteL10rXFwvP1teL10rJC9cbmV4cG9ydCBmdW5jdGlvbiBpc1Njb3BlZE1haW4obmFtZSkge1xuICByZXR1cm4gc2NvcGVkTWFpblJlZ0V4cC50ZXN0KG5hbWUpXG59XG5cbmZ1bmN0aW9uIGlzSW50ZXJuYWxNb2R1bGUobmFtZSwgc2V0dGluZ3MsIHBhdGgpIHtcbiAgcmV0dXJuIGV4dGVybmFsTW9kdWxlUmVnRXhwLnRlc3QobmFtZSkgJiYgIWlzRXh0ZXJuYWxQYXRoKHBhdGgsIG5hbWUsIHNldHRpbmdzKVxufVxuXG5mdW5jdGlvbiBpc1JlbGF0aXZlVG9QYXJlbnQobmFtZSkge1xuICByZXR1cm4gL15cXC5cXC5bXFxcXC9dLy50ZXN0KG5hbWUpXG59XG5cbmNvbnN0IGluZGV4RmlsZXMgPSBbJy4nLCAnLi8nLCAnLi9pbmRleCcsICcuL2luZGV4LmpzJ11cbmZ1bmN0aW9uIGlzSW5kZXgobmFtZSkge1xuICByZXR1cm4gaW5kZXhGaWxlcy5pbmRleE9mKG5hbWUpICE9PSAtMVxufVxuXG5mdW5jdGlvbiBpc1JlbGF0aXZlVG9TaWJsaW5nKG5hbWUpIHtcbiAgcmV0dXJuIC9eXFwuW1xcXFwvXS8udGVzdChuYW1lKVxufVxuXG5jb25zdCB0eXBlVGVzdCA9IGNvbmQoW1xuICBbaXNBYnNvbHV0ZSwgY29uc3RhbnQoJ2Fic29sdXRlJyldLFxuICBbaXNQcml2YXRlLCBjb25zdGFudCgncHJpdmF0ZScpXSxcbiAgW2lzQnVpbHRJbiwgY29uc3RhbnQoJ2J1aWx0aW4nKV0sXG4gIFtpc0V4dGVybmFsTW9kdWxlLCBjb25zdGFudCgnZXh0ZXJuYWwnKV0sXG4gIFtpc1Njb3BlZCwgY29uc3RhbnQoJ2V4dGVybmFsJyldLFxuICBbaXNJbnRlcm5hbE1vZHVsZSwgY29uc3RhbnQoJ2ludGVybmFsJyldLFxuICBbaXNSZWxhdGl2ZVRvUGFyZW50LCBjb25zdGFudCgncGFyZW50JyldLFxuICBbaXNJbmRleCwgY29uc3RhbnQoJ2luZGV4JyldLFxuICBbaXNSZWxhdGl2ZVRvU2libGluZywgY29uc3RhbnQoJ3NpYmxpbmcnKV0sXG4gIFtjb25zdGFudCh0cnVlKSwgY29uc3RhbnQoJ3Vua25vd24nKV0sXG5dKVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZXNvbHZlSW1wb3J0VHlwZShuYW1lLCBjb250ZXh0LCBncm91cHMpIHtcbiAgcmV0dXJuIHR5cGVUZXN0KG5hbWUsIGNvbnRleHQuc2V0dGluZ3MsIHJlc29sdmUobmFtZSwgY29udGV4dCksIGdyb3Vwcylcbn1cbiJdfQ==