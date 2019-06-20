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

// path is defined only when a resolver resolves to a non-standard path
function isBuiltIn(name, settings, path) {
  if (path) return false;
  const base = baseModule(name);
  const extras = settings && settings['import/core-modules'] || [];
  return _core2.default[base] || extras.indexOf(base) > -1;
}

function isExternalPath(path, name, settings) {
  const folders = settings && settings['import/external-module-folders'] || ['node_modules'];

  // extract the part before the first / (redux-saga/effects => redux-saga)
  const packageName = name.match(/([^/]+)/)[0];

  return !path || folders.some(folder => -1 < path.indexOf((0, _path.join)(folder, packageName)));
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
  const matchesScopedOrExternalRegExp = scopedRegExp.test(name) || externalModuleRegExp.test(name);
  return matchesScopedOrExternalRegExp && !isExternalPath(path, name, settings);
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

const typeTest = (0, _cond2.default)([[isAbsolute, constant('absolute')], [isPrivate, constant('private')], [isBuiltIn, constant('builtin')], [isInternalModule, constant('internal')], [isExternalModule, constant('external')], [isScoped, constant('external')], [isRelativeToParent, constant('parent')], [isIndex, constant('index')], [isRelativeToSibling, constant('sibling')], [constant(true), constant('unknown')]]);

function resolveImportType(name, context, groups) {
  return typeTest(name, context.settings, (0, _resolve2.default)(name, context), groups);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb3JlL2ltcG9ydFR5cGUuanMiXSwibmFtZXMiOlsiaXNBYnNvbHV0ZSIsImlzUHJpdmF0ZSIsImlzQnVpbHRJbiIsImlzRXh0ZXJuYWxNb2R1bGVNYWluIiwiaXNTY29wZWRNYWluIiwicmVzb2x2ZUltcG9ydFR5cGUiLCJjb25zdGFudCIsInZhbHVlIiwiYmFzZU1vZHVsZSIsIm5hbWUiLCJpc1Njb3BlZCIsInNwbGl0Iiwic2NvcGUiLCJwa2ciLCJzZXR0aW5ncyIsInBhdGgiLCJncm91cHMiLCJhYnNvbHV0ZUdyb3VwIiwiZmluZCIsInBhdHRlcm4iLCJyZWdleHAiLCJSZWdFeHAiLCJpbmRleE9mIiwidGVzdCIsImJhc2UiLCJleHRyYXMiLCJjb3JlTW9kdWxlcyIsImlzRXh0ZXJuYWxQYXRoIiwiZm9sZGVycyIsInBhY2thZ2VOYW1lIiwibWF0Y2giLCJzb21lIiwiZm9sZGVyIiwiZXh0ZXJuYWxNb2R1bGVSZWdFeHAiLCJpc0V4dGVybmFsTW9kdWxlIiwiZXh0ZXJuYWxNb2R1bGVNYWluUmVnRXhwIiwic2NvcGVkUmVnRXhwIiwic2NvcGVkTWFpblJlZ0V4cCIsImlzSW50ZXJuYWxNb2R1bGUiLCJtYXRjaGVzU2NvcGVkT3JFeHRlcm5hbFJlZ0V4cCIsImlzUmVsYXRpdmVUb1BhcmVudCIsImluZGV4RmlsZXMiLCJpc0luZGV4IiwiaXNSZWxhdGl2ZVRvU2libGluZyIsInR5cGVUZXN0IiwiY29udGV4dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7UUFtQmdCQSxVLEdBQUFBLFU7UUFRQUMsUyxHQUFBQSxTO1FBU0FDLFMsR0FBQUEsUztRQXNCQUMsb0IsR0FBQUEsb0I7UUFVQUMsWSxHQUFBQSxZO2tCQW1DUUMsaUI7O0FBdkd4Qjs7OztBQUNBOzs7O0FBQ0E7O0FBRUE7Ozs7OztBQUVBLFNBQVNDLFFBQVQsQ0FBa0JDLEtBQWxCLEVBQXlCO0FBQ3ZCLFNBQU8sTUFBTUEsS0FBYjtBQUNEOztBQUVELFNBQVNDLFVBQVQsQ0FBb0JD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RDs7QUFFRCxNQUFNbUMsV0FBVyxvQkFBSyxDQUNwQixDQUFDNUMsVUFBRCxFQUFhTSxTQUFTLFVBQVQsQ0FBYixDQURvQixFQUVwQixDQUFDTCxTQUFELEVBQVlLLFNBQVMsU0FBVCxDQUFaLENBRm9CLEVBR3BCLENBQUNKLFNBQUQsRUFBWUksU0FBUyxTQUFULENBQVosQ0FIb0IsRUFJcEIsQ0FBQ2dDLGdCQUFELEVBQW1CaEMsU0FBUyxVQUFULENBQW5CLENBSm9CLEVBS3BCLENBQUM0QixnQkFBRCxFQUFtQjVCLFNBQVMsVUFBVCxDQUFuQixDQUxvQixFQU1wQixDQUFDSSxRQUFELEVBQVdKLFNBQVMsVUFBVCxDQUFYLENBTm9CLEVBT3BCLENBQUNrQyxrQkFBRCxFQUFxQmxDLFNBQVMsUUFBVCxDQUFyQixDQVBvQixFQVFwQixDQUFDb0MsT0FBRCxFQUFVcEMsU0FBUyxPQUFULENBQVYsQ0FSb0IsRUFTcEIsQ0FBQ3FDLG1CQUFELEVBQXNCckMsU0FBUyxTQUFULENBQXRCLENBVG9CLEVBVXBCLENBQUNBLFNBQVMsSUFBVCxDQUFELEVBQWlCQSxTQUFTLFNBQVQsQ0FBakIsQ0FWb0IsQ0FBTCxDQUFqQjs7QUFhZSxTQUFTRCxpQkFBVCxDQUEyQkksSUFBM0IsRUFBaUNvQyxPQUFqQyxFQUEwQzdCLE1BQTFDLEVBQWtEO0FBQy9ELFNBQU80QixTQUFTbkMsSUFBVCxFQUFlb0MsUUFBUS9CLFFBQXZCLEVBQWlDLHVCQUFRTCxJQUFSLEVBQWNvQyxPQUFkLENBQWpDLEVBQXlEN0IsTUFBekQsQ0FBUDtBQUNEIiwiZmlsZSI6ImltcG9ydFR5cGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY29uZCBmcm9tICdsb2Rhc2gvY29uZCdcbmltcG9ydCBjb3JlTW9kdWxlcyBmcm9tICdyZXNvbHZlL2xpYi9jb3JlJ1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnXG5cbmltcG9ydCByZXNvbHZlIGZyb20gJ2VzbGludC1tb2R1bGUtdXRpbHMvcmVzb2x2ZSdcblxuZnVuY3Rpb24gY29uc3RhbnQodmFsdWUpIHtcbiAgcmV0dXJuICgpID0+IHZhbHVlXG59XG5cbmZ1bmN0aW9uIGJhc2VNb2R1bGUobmFtZSkge1xuICBpZiAoaXNTY29wZWQobmFtZSkpIHtcbiAgICBjb25zdCBbc2NvcGUsIHBrZ10gPSBuYW1lLnNwbGl0KCcvJylcbiAgICByZXR1cm4gYCR7c2NvcGV9LyR7cGtnfWBcbiAgfVxuICBjb25zdCBbcGtnXSA9IG5hbWUuc3BsaXQoJy8nKVxuICByZXR1cm4gcGtnXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Fic29sdXRlKG5hbWUsIHNldHRpbmdzLCBwYXRoLCBncm91cHMgPSBbXSkge1xuICBjb25zdCBhYnNvbHV0ZUdyb3VwID0gZ3JvdXBzLmZpbmQoKHsgbmFtZSB9KSA9PiBuYW1lID09PSAnYWJzb2x1dGUnKVxuICBjb25zdCBwYXR0ZXJuID0gYWJzb2x1dGVHcm91cCAmJiBhYnNvbHV0ZUdyb3VwLnBhdHRlcm5cbiAgY29uc3QgcmVnZXhwID0gcGF0dGVybiAmJiBuZXcgUmVnRXhwKHBhdHRlcm4pXG5cbiAgcmV0dXJuIG5hbWUuaW5kZXhPZignLycpID09PSAwIHx8IHJlZ2V4cCAmJiByZWdleHAudGVzdChuYW1lKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNQcml2YXRlKG5hbWUsIHNldHRpbmdzLCBwYXRoLCBncm91cHMgPSBbXSkge1xuICBjb25zdCBhYnNvbHV0ZUdyb3VwID0gZ3JvdXBzLmZpbmQoKHsgbmFtZSB9KSA9PiBuYW1lID09PSAncHJpdmF0ZScpXG4gIGNvbnN0IHBhdHRlcm4gPSBhYnNvbHV0ZUdyb3VwICYmIGFic29sdXRlR3JvdXAucGF0dGVyblxuICBjb25zdCByZWdleHAgPSAhIXBhdHRlcm4gJiYgbmV3IFJlZ0V4cChwYXR0ZXJuKVxuXG4gIHJldHVybiAhIXJlZ2V4cCAmJiByZWdleHAudGVzdChuYW1lKVxufVxuXG4vLyBwYXRoIGlzIGRlZmluZWQgb25seSB3aGVuIGEgcmVzb2x2ZXIgcmVzb2x2ZXMgdG8gYSBub24tc3RhbmRhcmQgcGF0aFxuZXhwb3J0IGZ1bmN0aW9uIGlzQnVpbHRJbihuYW1lLCBzZXR0aW5ncywgcGF0aCkge1xuICBpZiAocGF0aCkgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IGJhc2UgPSBiYXNlTW9kdWxlKG5hbWUpXG4gIGNvbnN0IGV4dHJhcyA9IChzZXR0aW5ncyAmJiBzZXR0aW5nc1snaW1wb3J0L2NvcmUtbW9kdWxlcyddKSB8fCBbXVxuICByZXR1cm4gY29yZU1vZHVsZXNbYmFzZV0gfHwgZXh0cmFzLmluZGV4T2YoYmFzZSkgPiAtMVxufVxuXG5mdW5jdGlvbiBpc0V4dGVybmFsUGF0aChwYXRoLCBuYW1lLCBzZXR0aW5ncykge1xuICBjb25zdCBmb2xkZXJzID0gKHNldHRpbmdzICYmIHNldHRpbmdzWydpbXBvcnQvZXh0ZXJuYWwtbW9kdWxlLWZvbGRlcnMnXSkgfHwgWydub2RlX21vZHVsZXMnXVxuXG4gIC8vIGV4dHJhY3QgdGhlIHBhcnQgYmVmb3JlIHRoZSBmaXJzdCAvIChyZWR1eC1zYWdhL2VmZmVjdHMgPT4gcmVkdXgtc2FnYSlcbiAgY29uc3QgcGFja2FnZU5hbWUgPSBuYW1lLm1hdGNoKC8oW14vXSspLylbMF1cblxuICByZXR1cm4gIXBhdGggfHwgZm9sZGVycy5zb21lKGZvbGRlciA9PiAtMSA8IHBhdGguaW5kZXhPZihqb2luKGZvbGRlciwgcGFja2FnZU5hbWUpKSlcbn1cblxuY29uc3QgZXh0ZXJuYWxNb2R1bGVSZWdFeHAgPSAvXlxcdy9cbmZ1bmN0aW9uIGlzRXh0ZXJuYWxNb2R1bGUobmFtZSwgc2V0dGluZ3MsIHBhdGgpIHtcbiAgcmV0dXJuIGV4dGVybmFsTW9kdWxlUmVnRXhwLnRlc3QobmFtZSkgJiYgaXNFeHRlcm5hbFBhdGgocGF0aCwgbmFtZSwgc2V0dGluZ3MpXG59XG5cbmNvbnN0IGV4dGVybmFsTW9kdWxlTWFpblJlZ0V4cCA9IC9eW1xcd10oKD8hXFwvKS4pKiQvXG5leHBvcnQgZnVuY3Rpb24gaXNFeHRlcm5hbE1vZHVsZU1haW4obmFtZSwgc2V0dGluZ3MsIHBhdGgpIHtcbiAgcmV0dXJuIGV4dGVybmFsTW9kdWxlTWFpblJlZ0V4cC50ZXN0KG5hbWUpICYmIGlzRXh0ZXJuYWxQYXRoKHBhdGgsIG5hbWUsIHNldHRpbmdzKVxufVxuXG5jb25zdCBzY29wZWRSZWdFeHAgPSAvXkBbXi9dK1xcL1teL10rL1xuZnVuY3Rpb24gaXNTY29wZWQobmFtZSkge1xuICByZXR1cm4gc2NvcGVkUmVnRXhwLnRlc3QobmFtZSlcbn1cblxuY29uc3Qgc2NvcGVkTWFpblJlZ0V4cCA9IC9eQFteL10rXFwvP1teL10rJC9cbmV4cG9ydCBmdW5jdGlvbiBpc1Njb3BlZE1haW4obmFtZSkge1xuICByZXR1cm4gc2NvcGVkTWFpblJlZ0V4cC50ZXN0KG5hbWUpXG59XG5cbmZ1bmN0aW9uIGlzSW50ZXJuYWxNb2R1bGUobmFtZSwgc2V0dGluZ3MsIHBhdGgpIHtcbiAgY29uc3QgbWF0Y2hlc1Njb3BlZE9yRXh0ZXJuYWxSZWdFeHAgPSBzY29wZWRSZWdFeHAudGVzdChuYW1lKSB8fCBleHRlcm5hbE1vZHVsZVJlZ0V4cC50ZXN0KG5hbWUpXG4gIHJldHVybiAobWF0Y2hlc1Njb3BlZE9yRXh0ZXJuYWxSZWdFeHAgJiYgIWlzRXh0ZXJuYWxQYXRoKHBhdGgsIG5hbWUsIHNldHRpbmdzKSlcbn1cblxuZnVuY3Rpb24gaXNSZWxhdGl2ZVRvUGFyZW50KG5hbWUpIHtcbiAgcmV0dXJuIC9eXFwuXFwuW1xcXFwvXS8udGVzdChuYW1lKVxufVxuXG5jb25zdCBpbmRleEZpbGVzID0gWycuJywgJy4vJywgJy4vaW5kZXgnLCAnLi9pbmRleC5qcyddXG5mdW5jdGlvbiBpc0luZGV4KG5hbWUpIHtcbiAgcmV0dXJuIGluZGV4RmlsZXMuaW5kZXhPZihuYW1lKSAhPT0gLTFcbn1cblxuZnVuY3Rpb24gaXNSZWxhdGl2ZVRvU2libGluZyhuYW1lKSB7XG4gIHJldHVybiAvXlxcLltcXFxcL10vLnRlc3QobmFtZSlcbn1cblxuY29uc3QgdHlwZVRlc3QgPSBjb25kKFtcbiAgW2lzQWJzb2x1dGUsIGNvbnN0YW50KCdhYnNvbHV0ZScpXSxcbiAgW2lzUHJpdmF0ZSwgY29uc3RhbnQoJ3ByaXZhdGUnKV0sXG4gIFtpc0J1aWx0SW4sIGNvbnN0YW50KCdidWlsdGluJyldLFxuICBbaXNJbnRlcm5hbE1vZHVsZSwgY29uc3RhbnQoJ2ludGVybmFsJyldLFxuICBbaXNFeHRlcm5hbE1vZHVsZSwgY29uc3RhbnQoJ2V4dGVybmFsJyldLFxuICBbaXNTY29wZWQsIGNvbnN0YW50KCdleHRlcm5hbCcpXSxcbiAgW2lzUmVsYXRpdmVUb1BhcmVudCwgY29uc3RhbnQoJ3BhcmVudCcpXSxcbiAgW2lzSW5kZXgsIGNvbnN0YW50KCdpbmRleCcpXSxcbiAgW2lzUmVsYXRpdmVUb1NpYmxpbmcsIGNvbnN0YW50KCdzaWJsaW5nJyldLFxuICBbY29uc3RhbnQodHJ1ZSksIGNvbnN0YW50KCd1bmtub3duJyldLFxuXSlcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVzb2x2ZUltcG9ydFR5cGUobmFtZSwgY29udGV4dCwgZ3JvdXBzKSB7XG4gIHJldHVybiB0eXBlVGVzdChuYW1lLCBjb250ZXh0LnNldHRpbmdzLCByZXNvbHZlKG5hbWUsIGNvbnRleHQpLCBncm91cHMpXG59XG4iXX0=