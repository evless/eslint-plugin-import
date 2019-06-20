'use strict';

var _ExportMap = require('../ExportMap');

var _ExportMap2 = _interopRequireDefault(_ExportMap);

var _resolve = require('eslint-module-utils/resolve');

var _resolve2 = _interopRequireDefault(_resolve);

var _docsUrl = require('../docsUrl');

var _docsUrl2 = _interopRequireDefault(_docsUrl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } } /**
                                                                                                                                                                                                 * @fileOverview Ensures that modules contain exports and/or all
                                                                                                                                                                                                 * modules are consumed within other modules.
                                                                                                                                                                                                 * @author René Fermann
                                                                                                                                                                                                 */

// eslint/lib/util/glob-util has been moved to eslint/lib/util/glob-utils with version 5.3
// and has been moved to eslint/lib/cli-engine/file-enumerator in version 6
let listFilesToProcess;
try {
  var FileEnumerator = require('eslint/lib/cli-engine/file-enumerator').FileEnumerator;
  listFilesToProcess = function (src) {
    var e = new FileEnumerator();
    return Array.from(e.iterateFiles(src));
  };
} catch (e1) {
  try {
    listFilesToProcess = require('eslint/lib/util/glob-utils').listFilesToProcess;
  } catch (e2) {
    listFilesToProcess = require('eslint/lib/util/glob-util').listFilesToProcess;
  }
}

const EXPORT_DEFAULT_DECLARATION = 'ExportDefaultDeclaration';
const EXPORT_NAMED_DECLARATION = 'ExportNamedDeclaration';
const EXPORT_ALL_DECLARATION = 'ExportAllDeclaration';
const IMPORT_DECLARATION = 'ImportDeclaration';
const IMPORT_NAMESPACE_SPECIFIER = 'ImportNamespaceSpecifier';
const IMPORT_DEFAULT_SPECIFIER = 'ImportDefaultSpecifier';
const VARIABLE_DECLARATION = 'VariableDeclaration';
const FUNCTION_DECLARATION = 'FunctionDeclaration';
const CLASS_DECLARATION = 'ClassDeclaration';
const DEFAULT = 'default';

let preparationDone = false;
const importList = new Map();
const exportList = new Map();
const ignoredFiles = new Set();

const isNodeModule = path => {
  return (/\/(node_modules)\//.test(path)
  );
};

/**
 * read all files matching the patterns in src and ignoreExports
 *
 * return all files matching src pattern, which are not matching the ignoreExports pattern
 */
const resolveFiles = (src, ignoreExports) => {
  const srcFiles = new Set();
  const srcFileList = listFilesToProcess(src);

  // prepare list of ignored files
  const ignoredFilesList = listFilesToProcess(ignoreExports);
  ignoredFilesList.forEach((_ref) => {
    let filename = _ref.filename;
    return ignoredFiles.add(filename);
  });

  // prepare list of source files, don't consider files from node_modules
  srcFileList.filter((_ref2) => {
    let filename = _ref2.filename;
    return !isNodeModule(filename);
  }).forEach((_ref3) => {
    let filename = _ref3.filename;

    srcFiles.add(filename);
  });
  return srcFiles;
};

/**
 * parse all source files and build up 2 maps containing the existing imports and exports
 */
const prepareImportsAndExports = (srcFiles, context) => {
  const exportAll = new Map();
  srcFiles.forEach(file => {
    const exports = new Map();
    const imports = new Map();
    const currentExports = _ExportMap2.default.get(file, context);
    if (currentExports) {
      const dependencies = currentExports.dependencies,
            reexports = currentExports.reexports,
            localImportList = currentExports.imports,
            namespace = currentExports.namespace;

      // dependencies === export * from 

      const currentExportAll = new Set();
      dependencies.forEach(value => {
        currentExportAll.add(value().path);
      });
      exportAll.set(file, currentExportAll);

      reexports.forEach((value, key) => {
        if (key === DEFAULT) {
          exports.set(IMPORT_DEFAULT_SPECIFIER, { whereUsed: new Set() });
        } else {
          exports.set(key, { whereUsed: new Set() });
        }
        const reexport = value.getImport();
        if (!reexport) {
          return;
        }
        let localImport = imports.get(reexport.path);
        let currentValue;
        if (value.local === DEFAULT) {
          currentValue = IMPORT_DEFAULT_SPECIFIER;
        } else {
          currentValue = value.local;
        }
        if (typeof localImport !== 'undefined') {
          localImport = new Set([].concat(_toConsumableArray(localImport), [currentValue]));
        } else {
          localImport = new Set([currentValue]);
        }
        imports.set(reexport.path, localImport);
      });

      localImportList.forEach((value, key) => {
        if (isNodeModule(key)) {
          return;
        }
        imports.set(key, value.importedSpecifiers);
      });
      importList.set(file, imports);

      // build up export list only, if file is not ignored
      if (ignoredFiles.has(file)) {
        return;
      }
      namespace.forEach((value, key) => {
        if (key === DEFAULT) {
          exports.set(IMPORT_DEFAULT_SPECIFIER, { whereUsed: new Set() });
        } else {
          exports.set(key, { whereUsed: new Set() });
        }
      });
    }
    exports.set(EXPORT_ALL_DECLARATION, { whereUsed: new Set() });
    exports.set(IMPORT_NAMESPACE_SPECIFIER, { whereUsed: new Set() });
    exportList.set(file, exports);
  });
  exportAll.forEach((value, key) => {
    value.forEach(val => {
      const currentExports = exportList.get(val);
      const currentExport = currentExports.get(EXPORT_ALL_DECLARATION);
      currentExport.whereUsed.add(key);
    });
  });
};

/**
 * traverse through all imports and add the respective path to the whereUsed-list 
 * of the corresponding export
 */
const determineUsage = () => {
  importList.forEach((listValue, listKey) => {
    listValue.forEach((value, key) => {
      const exports = exportList.get(key);
      if (typeof exports !== 'undefined') {
        value.forEach(currentImport => {
          let specifier;
          if (currentImport === IMPORT_NAMESPACE_SPECIFIER) {
            specifier = IMPORT_NAMESPACE_SPECIFIER;
          } else if (currentImport === IMPORT_DEFAULT_SPECIFIER) {
            specifier = IMPORT_DEFAULT_SPECIFIER;
          } else {
            specifier = currentImport;
          }
          if (typeof specifier !== 'undefined') {
            const exportStatement = exports.get(specifier);
            if (typeof exportStatement !== 'undefined') {
              const whereUsed = exportStatement.whereUsed;

              whereUsed.add(listKey);
              exports.set(specifier, { whereUsed });
            }
          }
        });
      }
    });
  });
};

const getSrc = src => {
  if (src) {
    return src;
  }
  return [process.cwd()];
};

/**
 * prepare the lists of existing imports and exports - should only be executed once at
 * the start of a new eslint run
 */
const doPreparation = (src, ignoreExports, context) => {
  const srcFiles = resolveFiles(getSrc(src), ignoreExports);
  prepareImportsAndExports(srcFiles, context);
  determineUsage();
  preparationDone = true;
};

const newNamespaceImportExists = specifiers => specifiers.some((_ref4) => {
  let type = _ref4.type;
  return type === IMPORT_NAMESPACE_SPECIFIER;
});

const newDefaultImportExists = specifiers => specifiers.some((_ref5) => {
  let type = _ref5.type;
  return type === IMPORT_DEFAULT_SPECIFIER;
});

module.exports = {
  meta: {
    docs: { url: (0, _docsUrl2.default)('no-unused-modules') },
    schema: [{
      properties: {
        src: {
          description: 'files/paths to be analyzed (only for unused exports)',
          type: 'array',
          minItems: 1,
          items: {
            type: 'string',
            minLength: 1
          }
        },
        ignoreExports: {
          description: 'files/paths for which unused exports will not be reported (e.g module entry points)',
          type: 'array',
          minItems: 1,
          items: {
            type: 'string',
            minLength: 1
          }
        },
        missingExports: {
          description: 'report modules without any exports',
          type: 'boolean'
        },
        unusedExports: {
          description: 'report exports without any usage',
          type: 'boolean'
        }
      },
      not: {
        properties: {
          unusedExports: { enum: [false] },
          missingExports: { enum: [false] }
        }
      },
      anyOf: [{
        not: {
          properties: {
            unusedExports: { enum: [true] }
          }
        },
        required: ['missingExports']
      }, {
        not: {
          properties: {
            missingExports: { enum: [true] }
          }
        },
        required: ['unusedExports']
      }, {
        properties: {
          unusedExports: { enum: [true] }
        },
        required: ['unusedExports']
      }, {
        properties: {
          missingExports: { enum: [true] }
        },
        required: ['missingExports']
      }]
    }]
  },

  create: context => {
    var _ref6 = context.options[0] || {};

    const src = _ref6.src;
    var _ref6$ignoreExports = _ref6.ignoreExports;
    const ignoreExports = _ref6$ignoreExports === undefined ? [] : _ref6$ignoreExports,
          missingExports = _ref6.missingExports,
          unusedExports = _ref6.unusedExports;


    if (unusedExports && !preparationDone) {
      doPreparation(src, ignoreExports, context);
    }

    const file = context.getFilename();

    const checkExportPresence = node => {
      if (!missingExports) {
        return;
      }

      if (ignoredFiles.has(file)) {
        return;
      }

      const exportCount = exportList.get(file);
      const exportAll = exportCount.get(EXPORT_ALL_DECLARATION);
      const namespaceImports = exportCount.get(IMPORT_NAMESPACE_SPECIFIER);

      exportCount.delete(EXPORT_ALL_DECLARATION);
      exportCount.delete(IMPORT_NAMESPACE_SPECIFIER);
      if (missingExports && exportCount.size < 1) {
        // node.body[0] === 'undefined' only happens, if everything is commented out in the file
        // being linted
        context.report(node.body[0] ? node.body[0] : node, 'No exports found');
      }
      exportCount.set(EXPORT_ALL_DECLARATION, exportAll);
      exportCount.set(IMPORT_NAMESPACE_SPECIFIER, namespaceImports);
    };

    const checkUsage = (node, exportedValue) => {
      if (!unusedExports) {
        return;
      }

      if (ignoredFiles.has(file)) {
        return;
      }

      // refresh list of source files
      const srcFiles = resolveFiles(getSrc(src), ignoreExports);

      // make sure file to be linted is included in source files
      if (!srcFiles.has(file)) {
        return;
      }

      exports = exportList.get(file);

      // special case: export * from 
      const exportAll = exports.get(EXPORT_ALL_DECLARATION);
      if (typeof exportAll !== 'undefined' && exportedValue !== IMPORT_DEFAULT_SPECIFIER) {
        if (exportAll.whereUsed.size > 0) {
          return;
        }
      }

      // special case: namespace import
      const namespaceImports = exports.get(IMPORT_NAMESPACE_SPECIFIER);
      if (typeof namespaceImports !== 'undefined') {
        if (namespaceImports.whereUsed.size > 0) {
          return;
        }
      }

      const exportStatement = exports.get(exportedValue);

      const value = exportedValue === IMPORT_DEFAULT_SPECIFIER ? DEFAULT : exportedValue;

      if (typeof exportStatement !== 'undefined') {
        if (exportStatement.whereUsed.size < 1) {
          context.report(node, `exported declaration '${value}' not used within other modules`);
        }
      } else {
        context.report(node, `exported declaration '${value}' not used within other modules`);
      }
    };

    /**
     * only useful for tools like vscode-eslint
     * 
     * update lists of existing exports during runtime
     */
    const updateExportUsage = node => {
      if (ignoredFiles.has(file)) {
        return;
      }

      let exports = exportList.get(file);

      // new module has been created during runtime
      // include it in further processing
      if (typeof exports === 'undefined') {
        exports = new Map();
      }

      const newExports = new Map();
      const newExportIdentifiers = new Set();

      node.body.forEach((_ref7) => {
        let type = _ref7.type,
            declaration = _ref7.declaration,
            specifiers = _ref7.specifiers;

        if (type === EXPORT_DEFAULT_DECLARATION) {
          newExportIdentifiers.add(IMPORT_DEFAULT_SPECIFIER);
        }
        if (type === EXPORT_NAMED_DECLARATION) {
          if (specifiers.length > 0) {
            specifiers.forEach(specifier => {
              if (specifier.exported) {
                newExportIdentifiers.add(specifier.exported.name);
              }
            });
          }
          if (declaration) {
            if (declaration.type === FUNCTION_DECLARATION || declaration.type === CLASS_DECLARATION) {
              newExportIdentifiers.add(declaration.id.name);
            }
            if (declaration.type === VARIABLE_DECLARATION) {
              declaration.declarations.forEach((_ref8) => {
                let id = _ref8.id;

                newExportIdentifiers.add(id.name);
              });
            }
          }
        }
      });

      // old exports exist within list of new exports identifiers: add to map of new exports
      exports.forEach((value, key) => {
        if (newExportIdentifiers.has(key)) {
          newExports.set(key, value);
        }
      });

      // new export identifiers added: add to map of new exports
      newExportIdentifiers.forEach(key => {
        if (!exports.has(key)) {
          newExports.set(key, { whereUsed: new Set() });
        }
      });

      // preserve information about namespace imports
      let exportAll = exports.get(EXPORT_ALL_DECLARATION);
      let namespaceImports = exports.get(IMPORT_NAMESPACE_SPECIFIER);

      if (typeof namespaceImports === 'undefined') {
        namespaceImports = { whereUsed: new Set() };
      }

      newExports.set(EXPORT_ALL_DECLARATION, exportAll);
      newExports.set(IMPORT_NAMESPACE_SPECIFIER, namespaceImports);
      exportList.set(file, newExports);
    };

    /**
     * only useful for tools like vscode-eslint
     * 
     * update lists of existing imports during runtime
     */
    const updateImportUsage = node => {
      if (!unusedExports) {
        return;
      }

      let oldImportPaths = importList.get(file);
      if (typeof oldImportPaths === 'undefined') {
        oldImportPaths = new Map();
      }

      const oldNamespaceImports = new Set();
      const newNamespaceImports = new Set();

      const oldExportAll = new Set();
      const newExportAll = new Set();

      const oldDefaultImports = new Set();
      const newDefaultImports = new Set();

      const oldImports = new Map();
      const newImports = new Map();
      oldImportPaths.forEach((value, key) => {
        if (value.has(EXPORT_ALL_DECLARATION)) {
          oldExportAll.add(key);
        }
        if (value.has(IMPORT_NAMESPACE_SPECIFIER)) {
          oldNamespaceImports.add(key);
        }
        if (value.has(IMPORT_DEFAULT_SPECIFIER)) {
          oldDefaultImports.add(key);
        }
        value.forEach(val => {
          if (val !== IMPORT_NAMESPACE_SPECIFIER && val !== IMPORT_DEFAULT_SPECIFIER) {
            oldImports.set(val, key);
          }
        });
      });

      node.body.forEach(astNode => {
        let resolvedPath;

        // support for export { value } from 'module'
        if (astNode.type === EXPORT_NAMED_DECLARATION) {
          if (astNode.source) {
            resolvedPath = (0, _resolve2.default)(astNode.source.raw.replace(/('|")/g, ''), context);
            astNode.specifiers.forEach(specifier => {
              let name;
              if (specifier.exported.name === DEFAULT) {
                name = IMPORT_DEFAULT_SPECIFIER;
              } else {
                name = specifier.local.name;
              }
              newImports.set(name, resolvedPath);
            });
          }
        }

        if (astNode.type === EXPORT_ALL_DECLARATION) {
          resolvedPath = (0, _resolve2.default)(astNode.source.raw.replace(/('|")/g, ''), context);
          newExportAll.add(resolvedPath);
        }

        if (astNode.type === IMPORT_DECLARATION) {
          resolvedPath = (0, _resolve2.default)(astNode.source.raw.replace(/('|")/g, ''), context);
          if (!resolvedPath) {
            return;
          }

          if (isNodeModule(resolvedPath)) {
            return;
          }

          if (newNamespaceImportExists(astNode.specifiers)) {
            newNamespaceImports.add(resolvedPath);
          }

          if (newDefaultImportExists(astNode.specifiers)) {
            newDefaultImports.add(resolvedPath);
          }

          astNode.specifiers.forEach(specifier => {
            if (specifier.type === IMPORT_DEFAULT_SPECIFIER || specifier.type === IMPORT_NAMESPACE_SPECIFIER) {
              return;
            }
            newImports.set(specifier.imported.name, resolvedPath);
          });
        }
      });

      newExportAll.forEach(value => {
        if (!oldExportAll.has(value)) {
          let imports = oldImportPaths.get(value);
          if (typeof imports === 'undefined') {
            imports = new Set();
          }
          imports.add(EXPORT_ALL_DECLARATION);
          oldImportPaths.set(value, imports);

          let exports = exportList.get(value);
          let currentExport;
          if (typeof exports !== 'undefined') {
            currentExport = exports.get(EXPORT_ALL_DECLARATION);
          } else {
            exports = new Map();
            exportList.set(value, exports);
          }

          if (typeof currentExport !== 'undefined') {
            currentExport.whereUsed.add(file);
          } else {
            const whereUsed = new Set();
            whereUsed.add(file);
            exports.set(EXPORT_ALL_DECLARATION, { whereUsed });
          }
        }
      });

      oldExportAll.forEach(value => {
        if (!newExportAll.has(value)) {
          const imports = oldImportPaths.get(value);
          imports.delete(EXPORT_ALL_DECLARATION);

          const exports = exportList.get(value);
          if (typeof exports !== 'undefined') {
            const currentExport = exports.get(EXPORT_ALL_DECLARATION);
            if (typeof currentExport !== 'undefined') {
              currentExport.whereUsed.delete(file);
            }
          }
        }
      });

      newDefaultImports.forEach(value => {
        if (!oldDefaultImports.has(value)) {
          let imports = oldImportPaths.get(value);
          if (typeof imports === 'undefined') {
            imports = new Set();
          }
          imports.add(IMPORT_DEFAULT_SPECIFIER);
          oldImportPaths.set(value, imports);

          let exports = exportList.get(value);
          let currentExport;
          if (typeof exports !== 'undefined') {
            currentExport = exports.get(IMPORT_DEFAULT_SPECIFIER);
          } else {
            exports = new Map();
            exportList.set(value, exports);
          }

          if (typeof currentExport !== 'undefined') {
            currentExport.whereUsed.add(file);
          } else {
            const whereUsed = new Set();
            whereUsed.add(file);
            exports.set(IMPORT_DEFAULT_SPECIFIER, { whereUsed });
          }
        }
      });

      oldDefaultImports.forEach(value => {
        if (!newDefaultImports.has(value)) {
          const imports = oldImportPaths.get(value);
          imports.delete(IMPORT_DEFAULT_SPECIFIER);

          const exports = exportList.get(value);
          if (typeof exports !== 'undefined') {
            const currentExport = exports.get(IMPORT_DEFAULT_SPECIFIER);
            if (typeof currentExport !== 'undefined') {
              currentExport.whereUsed.delete(file);
            }
          }
        }
      });

      newNamespaceImports.forEach(value => {
        if (!oldNamespaceImports.has(value)) {
          let imports = oldImportPaths.get(value);
          if (typeof imports === 'undefined') {
            imports = new Set();
          }
          imports.add(IMPORT_NAMESPACE_SPECIFIER);
          oldImportPaths.set(value, imports);

          let exports = exportList.get(value);
          let currentExport;
          if (typeof exports !== 'undefined') {
            currentExport = exports.get(IMPORT_NAMESPACE_SPECIFIER);
          } else {
            exports = new Map();
            exportList.set(value, exports);
          }

          if (typeof currentExport !== 'undefined') {
            currentExport.whereUsed.add(file);
          } else {
            const whereUsed = new Set();
            whereUsed.add(file);
            exports.set(IMPORT_NAMESPACE_SPECIFIER, { whereUsed });
          }
        }
      });

      oldNamespaceImports.forEach(value => {
        if (!newNamespaceImports.has(value)) {
          const imports = oldImportPaths.get(value);
          imports.delete(IMPORT_NAMESPACE_SPECIFIER);

          const exports = exportList.get(value);
          if (typeof exports !== 'undefined') {
            const currentExport = exports.get(IMPORT_NAMESPACE_SPECIFIER);
            if (typeof currentExport !== 'undefined') {
              currentExport.whereUsed.delete(file);
            }
          }
        }
      });

      newImports.forEach((value, key) => {
        if (!oldImports.has(key)) {
          let imports = oldImportPaths.get(value);
          if (typeof imports === 'undefined') {
            imports = new Set();
          }
          imports.add(key);
          oldImportPaths.set(value, imports);

          let exports = exportList.get(value);
          let currentExport;
          if (typeof exports !== 'undefined') {
            currentExport = exports.get(key);
          } else {
            exports = new Map();
            exportList.set(value, exports);
          }

          if (typeof currentExport !== 'undefined') {
            currentExport.whereUsed.add(file);
          } else {
            const whereUsed = new Set();
            whereUsed.add(file);
            exports.set(key, { whereUsed });
          }
        }
      });

      oldImports.forEach((value, key) => {
        if (!newImports.has(key)) {
          const imports = oldImportPaths.get(value);
          imports.delete(key);

          const exports = exportList.get(value);
          if (typeof exports !== 'undefined') {
            const currentExport = exports.get(key);
            if (typeof currentExport !== 'undefined') {
              currentExport.whereUsed.delete(file);
            }
          }
        }
      });
    };

    return {
      'Program:exit': node => {
        updateExportUsage(node);
        updateImportUsage(node);
        checkExportPresence(node);
      },
      'ExportDefaultDeclaration': node => {
        checkUsage(node, IMPORT_DEFAULT_SPECIFIER);
      },
      'ExportNamedDeclaration': node => {
        node.specifiers.forEach(specifier => {
          checkUsage(node, specifier.exported.name);
        });
        if (node.declaration) {
          if (node.declaration.type === FUNCTION_DECLARATION || node.declaration.type === CLASS_DECLARATION) {
            checkUsage(node, node.declaration.id.name);
          }
          if (node.declaration.type === VARIABLE_DECLARATION) {
            node.declaration.declarations.forEach(declaration => {
              checkUsage(node, declaration.id.name);
            });
          }
        }
      }
    };
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9ydWxlcy9uby11bnVzZWQtbW9kdWxlcy5qcyJdLCJuYW1lcyI6WyJsaXN0RmlsZXNUb1Byb2Nlc3MiLCJGaWxlRW51bWVyYXRvciIsInJlcXVpcmUiLCJzcmMiLCJlIiwiQXJyYXkiLCJmcm9tIiwiaXRlcmF0ZUZpbGVzIiwiZTEiLCJlMiIsIkVYUE9SVF9ERUZBVUxUX0RFQ0xBUkFUSU9OIiwiRVhQT1JUX05BTUVEX0RFQ0xBUkFUSU9OIiwiRVhQT1JUX0FMTF9ERUNMQVJBVElPTiIsIklNUE9SVF9ERUNMQVJBVElPTiIsIklNUE9SVF9OQU1FU1BBQ0VfU1BFQ0lGSUVSIiwiSU1QT1JUX0RFRkFVTFRfU1BFQ0lGSUVSIiwiVkFSSUFCTEVfREVDTEFSQVRJT04iLCJGVU5DVElPTl9ERUNMQVJBVElPTiIsIkNMQVNTX0RFQ0xBUkFUSU9OIiwiREVGQVVMVCIsInByZXBhcmF0aW9uRG9uZSIsImltcG9ydExpc3QiLCJNYXAiLCJleHBvcnRMaXN0IiwiaWdub3JlZEZpbGVzIiwiU2V0IiwiaXNOb2RlTW9kdWxlIiwicGF0aCIsInRlc3QiLCJyZXNvbHZlRmlsZXMiLCJpZ25vcmVFeHBvcnRzIiwic3JjRmlsZXMiLCJzcmNGaWxlTGlzdCIsImlnbm9yZWRGaWxlc0xpc3QiLCJmb3JFYWNoIiwiZmlsZW5hbWUiLCJhZGQiLCJmaWx0ZXIiLCJwcmVwYXJlSW1wb3J0c0FuZEV4cG9ydHMiLCJjb250ZXh0IiwiZXhwb3J0QWxsIiwiZmlsZSIsImV4cG9ydHMiLCJpbXBvcnRzIiwiY3VycmVudEV4cG9ydHMiLCJFeHBvcnRzIiwiZ2V0IiwiZGVwZW5kZW5jaWVzIiwicmVleHBvcnRzIiwibG9jYWxJbXBvcnRMaXN0IiwibmFtZXNwYWNlIiwiY3VycmVudEV4cG9ydEFsbCIsInZhbHVlIiwic2V0Iiwia2V5Iiwid2hlcmVVc2VkIiwicmVleHBvcnQiLCJnZXRJbXBvcnQiLCJsb2NhbEltcG9ydCIsImN1cnJlbnRWYWx1ZSIsImxvY2FsIiwiaW1wb3J0ZWRTcGVjaWZpZXJzIiwiaGFzIiwidmFsIiwiY3VycmVudEV4cG9ydCIsImRldGVybWluZVVzYWdlIiwibGlzdFZhbHVlIiwibGlzdEtleSIsImN1cnJlbnRJbXBvcnQiLCJzcGVjaWZpZXIiLCJleHBvcnRTdGF0ZW1lbnQiLCJnZXRTcmMiLCJwcm9jZXNzIiwiY3dkIiwiZG9QcmVwYXJhdGlvbiIsIm5ld05hbWVzcGFjZUltcG9ydEV4aXN0cyIsInNwZWNpZmllcnMiLCJzb21lIiwidHlwZSIsIm5ld0RlZmF1bHRJbXBvcnRFeGlzdHMiLCJtb2R1bGUiLCJtZXRhIiwiZG9jcyIsInVybCIsInNjaGVtYSIsInByb3BlcnRpZXMiLCJkZXNjcmlwdGlvbiIsIm1pbkl0ZW1zIiwiaXRlbXMiLCJtaW5MZW5ndGgiLCJtaXNzaW5nRXhwb3J0cyIsInVudXNlZEV4cG9ydHMiLCJub3QiLCJlbnVtIiwiYW55T2YiLCJyZXF1aXJlZCIsImNyZWF0ZSIsIm9wdGlvbnMiLCJnZXRGaWxlbmFtZSIsImNoZWNrRXhwb3J0UHJlc2VuY2UiLCJub2RlIiwiZXhwb3J0Q291bnQiLCJuYW1lc3BhY2VJbXBvcnRzIiwiZGVsZXRlIiwic2l6ZSIsInJlcG9ydCIsImJvZHkiLCJjaGVja1VzYWdlIiwiZXhwb3J0ZWRWYWx1ZSIsInVwZGF0ZUV4cG9ydFVzYWdlIiwibmV3RXhwb3J0cyIsIm5ld0V4cG9ydElkZW50aWZpZXJzIiwiZGVjbGFyYXRpb24iLCJsZW5ndGgiLCJleHBvcnRlZCIsIm5hbWUiLCJpZCIsImRlY2xhcmF0aW9ucyIsInVwZGF0ZUltcG9ydFVzYWdlIiwib2xkSW1wb3J0UGF0aHMiLCJvbGROYW1lc3BhY2VJbXBvcnRzIiwibmV3TmFtZXNwYWNlSW1wb3J0cyIsIm9sZEV4cG9ydEFsbCIsIm5ld0V4cG9ydEFsbCIsIm9sZERlZmF1bHRJbXBvcnRzIiwibmV3RGVmYXVsdEltcG9ydHMiLCJvbGRJbXBvcnRzIiwibmV3SW1wb3J0cyIsImFzdE5vZGUiLCJyZXNvbHZlZFBhdGgiLCJzb3VyY2UiLCJyYXciLCJyZXBsYWNlIiwiaW1wb3J0ZWQiXSwibWFwcGluZ3MiOiI7O0FBTUE7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7Z01BUkE7Ozs7OztBQVVBO0FBQ0E7QUFDQSxJQUFJQSxrQkFBSjtBQUNBLElBQUk7QUFDRixNQUFJQyxpQkFBaUJDLFFBQVEsdUNBQVIsRUFBaURELGNBQXRFO0FBQ0FELHVCQUFxQixVQUFVRyxHQUFWLEVBQWU7QUFDbEMsUUFBSUMsSUFBSSxJQUFJSCxjQUFKLEVBQVI7QUFDQSxXQUFPSSxNQUFNQyxJQUFOLENBQVdGLEVBQUVHLFlBQUYsQ0FBZUosR0FBZixDQUFYLENBQVA7QUFDRCxHQUhEO0FBSUQsQ0FORCxDQU1FLE9BQU9LLEVBQVAsRUFBVztBQUNYLE1BQUk7QUFDRlIseUJBQXFCRSxRQUFRLDRCQUFSLEVBQXNDRixrQkFBM0Q7QUFDRCxHQUZELENBRUUsT0FBT1MsRUFBUCxFQUFXO0FBQ1hULHlCQUFxQkUsUUFBUSwyQkFBUixFQUFxQ0Ysa0JBQTFEO0FBQ0Q7QUFDRjs7QUFFRCxNQUFNVSw2QkFBNkIsMEJBQW5DO0FBQ0EsTUFBTUMsMkJBQTJCLHdCQUFqQztBQUNBLE1BQU1DLHlCQUF5QixzQkFBL0I7QUFDQSxNQUFNQyxxQkFBcUIsbUJBQTNCO0FBQ0EsTUFBTUMsNkJBQTZCLDBCQUFuQztBQUNBLE1BQU1DLDJCQUEyQix3QkFBakM7QUFDQSxNQUFNQyx1QkFBdUIscUJBQTdCO0FBQ0EsTUFBTUMsdUJBQXVCLHFCQUE3QjtBQUNBLE1BQU1DLG9CQUFvQixrQkFBMUI7QUFDQSxNQUFNQyxVQUFVLFNBQWhCOztBQUVBLElBQUlDLGtCQUFrQixLQUF0QjtBQUNBLE1BQU1DLGFBQWEsSUFBSUMsR0FBSixFQUFuQjtBQUNBLE1BQU1DLGFBQWEsSUFBSUQsR0FBSixFQUFuQjtBQUNBLE1BQU1FLGVBQWUsSUFBSUMsR0FBSixFQUFyQjs7QUFFQSxNQUFNQyxlQUFlQyxRQUFRO0FBQzNCLFNBQU8sc0JBQXFCQyxJQUFyQixDQUEwQkQsSUFBMUI7QUFBUDtBQUNELENBRkQ7O0FBSUE7Ozs7O0FBS0EsTUFBTUUsZUFBZSxDQUFDMUIsR0FBRCxFQUFNMkIsYUFBTixLQUF3QjtBQUMzQyxRQUFNQyxXQUFXLElBQUlOLEdBQUosRUFBakI7QUFDQSxRQUFNTyxjQUFjaEMsbUJBQW1CRyxHQUFuQixDQUFwQjs7QUFFQTtBQUNBLFFBQU04QixtQkFBb0JqQyxtQkFBbUI4QixhQUFuQixDQUExQjtBQUNBRyxtQkFBaUJDLE9BQWpCLENBQXlCO0FBQUEsUUFBR0MsUUFBSCxRQUFHQSxRQUFIO0FBQUEsV0FBa0JYLGFBQWFZLEdBQWIsQ0FBaUJELFFBQWpCLENBQWxCO0FBQUEsR0FBekI7O0FBRUE7QUFDQUgsY0FBWUssTUFBWixDQUFtQjtBQUFBLFFBQUdGLFFBQUgsU0FBR0EsUUFBSDtBQUFBLFdBQWtCLENBQUNULGFBQWFTLFFBQWIsQ0FBbkI7QUFBQSxHQUFuQixFQUE4REQsT0FBOUQsQ0FBc0UsV0FBa0I7QUFBQSxRQUFmQyxRQUFlLFNBQWZBLFFBQWU7O0FBQ3RGSixhQUFTSyxHQUFULENBQWFELFFBQWI7QUFDRCxHQUZEO0FBR0EsU0FBT0osUUFBUDtBQUNELENBYkQ7O0FBZUE7OztBQUdBLE1BQU1PLDJCQUEyQixDQUFDUCxRQUFELEVBQVdRLE9BQVgsS0FBdUI7QUFDdEQsUUFBTUMsWUFBWSxJQUFJbEIsR0FBSixFQUFsQjtBQUNBUyxXQUFTRyxPQUFULENBQWlCTyxRQUFRO0FBQ3ZCLFVBQU1DLFVBQVUsSUFBSXBCLEdBQUosRUFBaEI7QUFDQSxVQUFNcUIsVUFBVSxJQUFJckIsR0FBSixFQUFoQjtBQUNBLFVBQU1zQixpQkFBaUJDLG9CQUFRQyxHQUFSLENBQVlMLElBQVosRUFBa0JGLE9BQWxCLENBQXZCO0FBQ0EsUUFBSUssY0FBSixFQUFvQjtBQUFBLFlBQ1ZHLFlBRFUsR0FDd0RILGNBRHhELENBQ1ZHLFlBRFU7QUFBQSxZQUNJQyxTQURKLEdBQ3dESixjQUR4RCxDQUNJSSxTQURKO0FBQUEsWUFDd0JDLGVBRHhCLEdBQ3dETCxjQUR4RCxDQUNlRCxPQURmO0FBQUEsWUFDeUNPLFNBRHpDLEdBQ3dETixjQUR4RCxDQUN5Q00sU0FEekM7O0FBR2xCOztBQUNBLFlBQU1DLG1CQUFtQixJQUFJMUIsR0FBSixFQUF6QjtBQUNBc0IsbUJBQWFiLE9BQWIsQ0FBcUJrQixTQUFTO0FBQzVCRCx5QkFBaUJmLEdBQWpCLENBQXFCZ0IsUUFBUXpCLElBQTdCO0FBQ0QsT0FGRDtBQUdBYSxnQkFBVWEsR0FBVixDQUFjWixJQUFkLEVBQW9CVSxnQkFBcEI7O0FBRUFILGdCQUFVZCxPQUFWLENBQWtCLENBQUNrQixLQUFELEVBQVFFLEdBQVIsS0FBZ0I7QUFDaEMsWUFBSUEsUUFBUW5DLE9BQVosRUFBcUI7QUFDbkJ1QixrQkFBUVcsR0FBUixDQUFZdEMsd0JBQVosRUFBc0MsRUFBRXdDLFdBQVcsSUFBSTlCLEdBQUosRUFBYixFQUF0QztBQUNELFNBRkQsTUFFTztBQUNMaUIsa0JBQVFXLEdBQVIsQ0FBWUMsR0FBWixFQUFpQixFQUFFQyxXQUFXLElBQUk5QixHQUFKLEVBQWIsRUFBakI7QUFDRDtBQUNELGNBQU0rQixXQUFZSixNQUFNSyxTQUFOLEVBQWxCO0FBQ0EsWUFBSSxDQUFDRCxRQUFMLEVBQWU7QUFDYjtBQUNEO0FBQ0QsWUFBSUUsY0FBY2YsUUFBUUcsR0FBUixDQUFZVSxTQUFTN0IsSUFBckIsQ0FBbEI7QUFDQSxZQUFJZ0MsWUFBSjtBQUNBLFlBQUlQLE1BQU1RLEtBQU4sS0FBZ0J6QyxPQUFwQixFQUE2QjtBQUMzQndDLHlCQUFlNUMsd0JBQWY7QUFDRCxTQUZELE1BRU87QUFDTDRDLHlCQUFlUCxNQUFNUSxLQUFyQjtBQUNEO0FBQ0QsWUFBSSxPQUFPRixXQUFQLEtBQXVCLFdBQTNCLEVBQXdDO0FBQ3RDQSx3QkFBYyxJQUFJakMsR0FBSiw4QkFBWWlDLFdBQVosSUFBeUJDLFlBQXpCLEdBQWQ7QUFDRCxTQUZELE1BRU87QUFDTEQsd0JBQWMsSUFBSWpDLEdBQUosQ0FBUSxDQUFDa0MsWUFBRCxDQUFSLENBQWQ7QUFDRDtBQUNEaEIsZ0JBQVFVLEdBQVIsQ0FBWUcsU0FBUzdCLElBQXJCLEVBQTJCK0IsV0FBM0I7QUFDRCxPQXZCRDs7QUF5QkFULHNCQUFnQmYsT0FBaEIsQ0FBd0IsQ0FBQ2tCLEtBQUQsRUFBUUUsR0FBUixLQUFnQjtBQUN0QyxZQUFJNUIsYUFBYTRCLEdBQWIsQ0FBSixFQUF1QjtBQUNyQjtBQUNEO0FBQ0RYLGdCQUFRVSxHQUFSLENBQVlDLEdBQVosRUFBaUJGLE1BQU1TLGtCQUF2QjtBQUNELE9BTEQ7QUFNQXhDLGlCQUFXZ0MsR0FBWCxDQUFlWixJQUFmLEVBQXFCRSxPQUFyQjs7QUFFQTtBQUNBLFVBQUluQixhQUFhc0MsR0FBYixDQUFpQnJCLElBQWpCLENBQUosRUFBNEI7QUFDMUI7QUFDRDtBQUNEUyxnQkFBVWhCLE9BQVYsQ0FBa0IsQ0FBQ2tCLEtBQUQsRUFBUUUsR0FBUixLQUFnQjtBQUNoQyxZQUFJQSxRQUFRbkMsT0FBWixFQUFxQjtBQUNuQnVCLGtCQUFRVyxHQUFSLENBQVl0Qyx3QkFBWixFQUFzQyxFQUFFd0MsV0FBVyxJQUFJOUIsR0FBSixFQUFiLEVBQXRDO0FBQ0QsU0FGRCxNQUVPO0FBQ0xpQixrQkFBUVcsR0FBUixDQUFZQyxHQUFaLEVBQWlCLEVBQUVDLFdBQVcsSUFBSTlCLEdBQUosRUFBYixFQUFqQjtBQUNEO0FBQ0YsT0FORDtBQU9EO0FBQ0RpQixZQUFRVyxHQUFSLENBQVl6QyxzQkFBWixFQUFvQyxFQUFFMkMsV0FBVyxJQUFJOUIsR0FBSixFQUFiLEVBQXBDO0FBQ0FpQixZQUFRVyxHQUFSLENBQVl2QywwQkFBWixFQUF3QyxFQUFFeUMsV0FBVyxJQUFJOUIsR0FBSixFQUFiLEVBQXhDO0FBQ0FGLGVBQVc4QixHQUFYLENBQWVaLElBQWYsRUFBcUJDLE9BQXJCO0FBQ0QsR0E5REQ7QUErREFGLFlBQVVOLE9BQVYsQ0FBa0IsQ0FBQ2tCLEtBQUQsRUFBUUUsR0FBUixLQUFnQjtBQUNoQ0YsVUFBTWxCLE9BQU4sQ0FBYzZCLE9BQU87QUFDbkIsWUFBTW5CLGlCQUFpQnJCLFdBQVd1QixHQUFYLENBQWVpQixHQUFmLENBQXZCO0FBQ0EsWUFBTUMsZ0JBQWdCcEIsZUFBZUUsR0FBZixDQUFtQmxDLHNCQUFuQixDQUF0QjtBQUNBb0Qsb0JBQWNULFNBQWQsQ0FBd0JuQixHQUF4QixDQUE0QmtCLEdBQTVCO0FBQ0QsS0FKRDtBQUtELEdBTkQ7QUFPRCxDQXhFRDs7QUEwRUE7Ozs7QUFJQSxNQUFNVyxpQkFBaUIsTUFBTTtBQUMzQjVDLGFBQVdhLE9BQVgsQ0FBbUIsQ0FBQ2dDLFNBQUQsRUFBWUMsT0FBWixLQUF3QjtBQUN6Q0QsY0FBVWhDLE9BQVYsQ0FBa0IsQ0FBQ2tCLEtBQUQsRUFBUUUsR0FBUixLQUFnQjtBQUNoQyxZQUFNWixVQUFVbkIsV0FBV3VCLEdBQVgsQ0FBZVEsR0FBZixDQUFoQjtBQUNBLFVBQUksT0FBT1osT0FBUCxLQUFtQixXQUF2QixFQUFvQztBQUNsQ1UsY0FBTWxCLE9BQU4sQ0FBY2tDLGlCQUFpQjtBQUM3QixjQUFJQyxTQUFKO0FBQ0EsY0FBSUQsa0JBQWtCdEQsMEJBQXRCLEVBQWtEO0FBQ2hEdUQsd0JBQVl2RCwwQkFBWjtBQUNELFdBRkQsTUFFTyxJQUFJc0Qsa0JBQWtCckQsd0JBQXRCLEVBQWdEO0FBQ3JEc0Qsd0JBQVl0RCx3QkFBWjtBQUNELFdBRk0sTUFFQTtBQUNMc0Qsd0JBQVlELGFBQVo7QUFDRDtBQUNELGNBQUksT0FBT0MsU0FBUCxLQUFxQixXQUF6QixFQUFzQztBQUNwQyxrQkFBTUMsa0JBQWtCNUIsUUFBUUksR0FBUixDQUFZdUIsU0FBWixDQUF4QjtBQUNBLGdCQUFJLE9BQU9DLGVBQVAsS0FBMkIsV0FBL0IsRUFBNEM7QUFBQSxvQkFDbENmLFNBRGtDLEdBQ3BCZSxlQURvQixDQUNsQ2YsU0FEa0M7O0FBRTFDQSx3QkFBVW5CLEdBQVYsQ0FBYytCLE9BQWQ7QUFDQXpCLHNCQUFRVyxHQUFSLENBQVlnQixTQUFaLEVBQXVCLEVBQUVkLFNBQUYsRUFBdkI7QUFDRDtBQUNGO0FBQ0YsU0FqQkQ7QUFrQkQ7QUFDRixLQXRCRDtBQXVCRCxHQXhCRDtBQXlCRCxDQTFCRDs7QUE0QkEsTUFBTWdCLFNBQVNwRSxPQUFPO0FBQ3BCLE1BQUlBLEdBQUosRUFBUztBQUNQLFdBQU9BLEdBQVA7QUFDRDtBQUNELFNBQU8sQ0FBQ3FFLFFBQVFDLEdBQVIsRUFBRCxDQUFQO0FBQ0QsQ0FMRDs7QUFPQTs7OztBQUlBLE1BQU1DLGdCQUFnQixDQUFDdkUsR0FBRCxFQUFNMkIsYUFBTixFQUFxQlMsT0FBckIsS0FBaUM7QUFDckQsUUFBTVIsV0FBV0YsYUFBYTBDLE9BQU9wRSxHQUFQLENBQWIsRUFBMEIyQixhQUExQixDQUFqQjtBQUNBUSwyQkFBeUJQLFFBQXpCLEVBQW1DUSxPQUFuQztBQUNBMEI7QUFDQTdDLG9CQUFrQixJQUFsQjtBQUNELENBTEQ7O0FBT0EsTUFBTXVELDJCQUEyQkMsY0FDL0JBLFdBQVdDLElBQVgsQ0FBZ0I7QUFBQSxNQUFHQyxJQUFILFNBQUdBLElBQUg7QUFBQSxTQUFjQSxTQUFTaEUsMEJBQXZCO0FBQUEsQ0FBaEIsQ0FERjs7QUFHQSxNQUFNaUUseUJBQXlCSCxjQUM3QkEsV0FBV0MsSUFBWCxDQUFnQjtBQUFBLE1BQUdDLElBQUgsU0FBR0EsSUFBSDtBQUFBLFNBQWNBLFNBQVMvRCx3QkFBdkI7QUFBQSxDQUFoQixDQURGOztBQUdBaUUsT0FBT3RDLE9BQVAsR0FBaUI7QUFDZnVDLFFBQU07QUFDSkMsVUFBTSxFQUFFQyxLQUFLLHVCQUFRLG1CQUFSLENBQVAsRUFERjtBQUVKQyxZQUFRLENBQUM7QUFDUEMsa0JBQVk7QUFDVmxGLGFBQUs7QUFDSG1GLHVCQUFhLHNEQURWO0FBRUhSLGdCQUFNLE9BRkg7QUFHSFMsb0JBQVUsQ0FIUDtBQUlIQyxpQkFBTztBQUNMVixrQkFBTSxRQUREO0FBRUxXLHVCQUFXO0FBRk47QUFKSixTQURLO0FBVVYzRCx1QkFBZTtBQUNid0QsdUJBQ0UscUZBRlc7QUFHYlIsZ0JBQU0sT0FITztBQUliUyxvQkFBVSxDQUpHO0FBS2JDLGlCQUFPO0FBQ0xWLGtCQUFNLFFBREQ7QUFFTFcsdUJBQVc7QUFGTjtBQUxNLFNBVkw7QUFvQlZDLHdCQUFnQjtBQUNkSix1QkFBYSxvQ0FEQztBQUVkUixnQkFBTTtBQUZRLFNBcEJOO0FBd0JWYSx1QkFBZTtBQUNiTCx1QkFBYSxrQ0FEQTtBQUViUixnQkFBTTtBQUZPO0FBeEJMLE9BREw7QUE4QlBjLFdBQUs7QUFDSFAsb0JBQVk7QUFDVk0seUJBQWUsRUFBRUUsTUFBTSxDQUFDLEtBQUQsQ0FBUixFQURMO0FBRVZILDBCQUFnQixFQUFFRyxNQUFNLENBQUMsS0FBRCxDQUFSO0FBRk47QUFEVCxPQTlCRTtBQW9DUEMsYUFBTSxDQUFDO0FBQ0xGLGFBQUs7QUFDSFAsc0JBQVk7QUFDVk0sMkJBQWUsRUFBRUUsTUFBTSxDQUFDLElBQUQsQ0FBUjtBQURMO0FBRFQsU0FEQTtBQU1MRSxrQkFBVSxDQUFDLGdCQUFEO0FBTkwsT0FBRCxFQU9IO0FBQ0RILGFBQUs7QUFDSFAsc0JBQVk7QUFDVkssNEJBQWdCLEVBQUVHLE1BQU0sQ0FBQyxJQUFELENBQVI7QUFETjtBQURULFNBREo7QUFNREUsa0JBQVUsQ0FBQyxlQUFEO0FBTlQsT0FQRyxFQWNIO0FBQ0RWLG9CQUFZO0FBQ1ZNLHlCQUFlLEVBQUVFLE1BQU0sQ0FBQyxJQUFELENBQVI7QUFETCxTQURYO0FBSURFLGtCQUFVLENBQUMsZUFBRDtBQUpULE9BZEcsRUFtQkg7QUFDRFYsb0JBQVk7QUFDVkssMEJBQWdCLEVBQUVHLE1BQU0sQ0FBQyxJQUFELENBQVI7QUFETixTQURYO0FBSURFLGtCQUFVLENBQUMsZ0JBQUQ7QUFKVCxPQW5CRztBQXBDQyxLQUFEO0FBRkosR0FEUzs7QUFtRWZDLFVBQVF6RCxXQUFXO0FBQUEsZ0JBTWJBLFFBQVEwRCxPQUFSLENBQWdCLENBQWhCLEtBQXNCLEVBTlQ7O0FBQUEsVUFFZjlGLEdBRmUsU0FFZkEsR0FGZTtBQUFBLG9DQUdmMkIsYUFIZTtBQUFBLFVBR2ZBLGFBSGUsdUNBR0MsRUFIRDtBQUFBLFVBSWY0RCxjQUplLFNBSWZBLGNBSmU7QUFBQSxVQUtmQyxhQUxlLFNBS2ZBLGFBTGU7OztBQVFqQixRQUFJQSxpQkFBaUIsQ0FBQ3ZFLGVBQXRCLEVBQXVDO0FBQ3JDc0Qsb0JBQWN2RSxHQUFkLEVBQW1CMkIsYUFBbkIsRUFBa0NTLE9BQWxDO0FBQ0Q7O0FBRUQsVUFBTUUsT0FBT0YsUUFBUTJELFdBQVIsRUFBYjs7QUFFQSxVQUFNQyxzQkFBc0JDLFFBQVE7QUFDbEMsVUFBSSxDQUFDVixjQUFMLEVBQXFCO0FBQ25CO0FBQ0Q7O0FBRUQsVUFBSWxFLGFBQWFzQyxHQUFiLENBQWlCckIsSUFBakIsQ0FBSixFQUE0QjtBQUMxQjtBQUNEOztBQUVELFlBQU00RCxjQUFjOUUsV0FBV3VCLEdBQVgsQ0FBZUwsSUFBZixDQUFwQjtBQUNBLFlBQU1ELFlBQVk2RCxZQUFZdkQsR0FBWixDQUFnQmxDLHNCQUFoQixDQUFsQjtBQUNBLFlBQU0wRixtQkFBbUJELFlBQVl2RCxHQUFaLENBQWdCaEMsMEJBQWhCLENBQXpCOztBQUVBdUYsa0JBQVlFLE1BQVosQ0FBbUIzRixzQkFBbkI7QUFDQXlGLGtCQUFZRSxNQUFaLENBQW1CekYsMEJBQW5CO0FBQ0EsVUFBSTRFLGtCQUFrQlcsWUFBWUcsSUFBWixHQUFtQixDQUF6QyxFQUE0QztBQUMxQztBQUNBO0FBQ0FqRSxnQkFBUWtFLE1BQVIsQ0FBZUwsS0FBS00sSUFBTCxDQUFVLENBQVYsSUFBZU4sS0FBS00sSUFBTCxDQUFVLENBQVYsQ0FBZixHQUE4Qk4sSUFBN0MsRUFBbUQsa0JBQW5EO0FBQ0Q7QUFDREMsa0JBQVloRCxHQUFaLENBQWdCekMsc0JBQWhCLEVBQXdDNEIsU0FBeEM7QUFDQTZELGtCQUFZaEQsR0FBWixDQUFnQnZDLDBCQUFoQixFQUE0Q3dGLGdCQUE1QztBQUNELEtBdEJEOztBQXdCQSxVQUFNSyxhQUFhLENBQUNQLElBQUQsRUFBT1EsYUFBUCxLQUF5QjtBQUMxQyxVQUFJLENBQUNqQixhQUFMLEVBQW9CO0FBQ2xCO0FBQ0Q7O0FBRUQsVUFBSW5FLGFBQWFzQyxHQUFiLENBQWlCckIsSUFBakIsQ0FBSixFQUE0QjtBQUMxQjtBQUNEOztBQUVEO0FBQ0EsWUFBTVYsV0FBV0YsYUFBYTBDLE9BQU9wRSxHQUFQLENBQWIsRUFBMEIyQixhQUExQixDQUFqQjs7QUFFQTtBQUNBLFVBQUksQ0FBQ0MsU0FBUytCLEdBQVQsQ0FBYXJCLElBQWIsQ0FBTCxFQUF5QjtBQUN2QjtBQUNEOztBQUVEQyxnQkFBVW5CLFdBQVd1QixHQUFYLENBQWVMLElBQWYsQ0FBVjs7QUFFQTtBQUNBLFlBQU1ELFlBQVlFLFFBQVFJLEdBQVIsQ0FBWWxDLHNCQUFaLENBQWxCO0FBQ0EsVUFBSSxPQUFPNEIsU0FBUCxLQUFxQixXQUFyQixJQUFvQ29FLGtCQUFrQjdGLHdCQUExRCxFQUFvRjtBQUNsRixZQUFJeUIsVUFBVWUsU0FBVixDQUFvQmlELElBQXBCLEdBQTJCLENBQS9CLEVBQWtDO0FBQ2hDO0FBQ0Q7QUFDRjs7QUFFRDtBQUNBLFlBQU1GLG1CQUFtQjVELFFBQVFJLEdBQVIsQ0FBWWhDLDBCQUFaLENBQXpCO0FBQ0EsVUFBSSxPQUFPd0YsZ0JBQVAsS0FBNEIsV0FBaEMsRUFBNkM7QUFDM0MsWUFBSUEsaUJBQWlCL0MsU0FBakIsQ0FBMkJpRCxJQUEzQixHQUFrQyxDQUF0QyxFQUF5QztBQUN2QztBQUNEO0FBQ0Y7O0FBRUQsWUFBTWxDLGtCQUFrQjVCLFFBQVFJLEdBQVIsQ0FBWThELGFBQVosQ0FBeEI7O0FBRUEsWUFBTXhELFFBQVF3RCxrQkFBa0I3Rix3QkFBbEIsR0FBNkNJLE9BQTdDLEdBQXVEeUYsYUFBckU7O0FBRUEsVUFBSSxPQUFPdEMsZUFBUCxLQUEyQixXQUEvQixFQUEyQztBQUN6QyxZQUFJQSxnQkFBZ0JmLFNBQWhCLENBQTBCaUQsSUFBMUIsR0FBaUMsQ0FBckMsRUFBd0M7QUFDdENqRSxrQkFBUWtFLE1BQVIsQ0FDRUwsSUFERixFQUVHLHlCQUF3QmhELEtBQU0saUNBRmpDO0FBSUQ7QUFDRixPQVBELE1BT087QUFDTGIsZ0JBQVFrRSxNQUFSLENBQ0VMLElBREYsRUFFRyx5QkFBd0JoRCxLQUFNLGlDQUZqQztBQUlEO0FBQ0YsS0FwREQ7O0FBc0RBOzs7OztBQUtBLFVBQU15RCxvQkFBb0JULFFBQVE7QUFDaEMsVUFBSTVFLGFBQWFzQyxHQUFiLENBQWlCckIsSUFBakIsQ0FBSixFQUE0QjtBQUMxQjtBQUNEOztBQUVELFVBQUlDLFVBQVVuQixXQUFXdUIsR0FBWCxDQUFlTCxJQUFmLENBQWQ7O0FBRUE7QUFDQTtBQUNBLFVBQUksT0FBT0MsT0FBUCxLQUFtQixXQUF2QixFQUFvQztBQUNsQ0Esa0JBQVUsSUFBSXBCLEdBQUosRUFBVjtBQUNEOztBQUVELFlBQU13RixhQUFhLElBQUl4RixHQUFKLEVBQW5CO0FBQ0EsWUFBTXlGLHVCQUF1QixJQUFJdEYsR0FBSixFQUE3Qjs7QUFFQTJFLFdBQUtNLElBQUwsQ0FBVXhFLE9BQVYsQ0FBa0IsV0FBdUM7QUFBQSxZQUFwQzRDLElBQW9DLFNBQXBDQSxJQUFvQztBQUFBLFlBQTlCa0MsV0FBOEIsU0FBOUJBLFdBQThCO0FBQUEsWUFBakJwQyxVQUFpQixTQUFqQkEsVUFBaUI7O0FBQ3ZELFlBQUlFLFNBQVNwRSwwQkFBYixFQUF5QztBQUN2Q3FHLCtCQUFxQjNFLEdBQXJCLENBQXlCckIsd0JBQXpCO0FBQ0Q7QUFDRCxZQUFJK0QsU0FBU25FLHdCQUFiLEVBQXVDO0FBQ3JDLGNBQUlpRSxXQUFXcUMsTUFBWCxHQUFvQixDQUF4QixFQUEyQjtBQUN6QnJDLHVCQUFXMUMsT0FBWCxDQUFtQm1DLGFBQWE7QUFDOUIsa0JBQUlBLFVBQVU2QyxRQUFkLEVBQXdCO0FBQ3RCSCxxQ0FBcUIzRSxHQUFyQixDQUF5QmlDLFVBQVU2QyxRQUFWLENBQW1CQyxJQUE1QztBQUNEO0FBQ0YsYUFKRDtBQUtEO0FBQ0QsY0FBSUgsV0FBSixFQUFpQjtBQUNmLGdCQUNFQSxZQUFZbEMsSUFBWixLQUFxQjdELG9CQUFyQixJQUNBK0YsWUFBWWxDLElBQVosS0FBcUI1RCxpQkFGdkIsRUFHRTtBQUNBNkYsbUNBQXFCM0UsR0FBckIsQ0FBeUI0RSxZQUFZSSxFQUFaLENBQWVELElBQXhDO0FBQ0Q7QUFDRCxnQkFBSUgsWUFBWWxDLElBQVosS0FBcUI5RCxvQkFBekIsRUFBK0M7QUFDN0NnRywwQkFBWUssWUFBWixDQUF5Qm5GLE9BQXpCLENBQWlDLFdBQVk7QUFBQSxvQkFBVGtGLEVBQVMsU0FBVEEsRUFBUzs7QUFDM0NMLHFDQUFxQjNFLEdBQXJCLENBQXlCZ0YsR0FBR0QsSUFBNUI7QUFDRCxlQUZEO0FBR0Q7QUFDRjtBQUNGO0FBQ0YsT0ExQkQ7O0FBNEJBO0FBQ0F6RSxjQUFRUixPQUFSLENBQWdCLENBQUNrQixLQUFELEVBQVFFLEdBQVIsS0FBZ0I7QUFDOUIsWUFBSXlELHFCQUFxQmpELEdBQXJCLENBQXlCUixHQUF6QixDQUFKLEVBQW1DO0FBQ2pDd0QscUJBQVd6RCxHQUFYLENBQWVDLEdBQWYsRUFBb0JGLEtBQXBCO0FBQ0Q7QUFDRixPQUpEOztBQU1BO0FBQ0EyRCwyQkFBcUI3RSxPQUFyQixDQUE2Qm9CLE9BQU87QUFDbEMsWUFBSSxDQUFDWixRQUFRb0IsR0FBUixDQUFZUixHQUFaLENBQUwsRUFBdUI7QUFDckJ3RCxxQkFBV3pELEdBQVgsQ0FBZUMsR0FBZixFQUFvQixFQUFFQyxXQUFXLElBQUk5QixHQUFKLEVBQWIsRUFBcEI7QUFDRDtBQUNGLE9BSkQ7O0FBTUE7QUFDQSxVQUFJZSxZQUFZRSxRQUFRSSxHQUFSLENBQVlsQyxzQkFBWixDQUFoQjtBQUNBLFVBQUkwRixtQkFBbUI1RCxRQUFRSSxHQUFSLENBQVloQywwQkFBWixDQUF2Qjs7QUFFQSxVQUFJLE9BQU93RixnQkFBUCxLQUE0QixXQUFoQyxFQUE2QztBQUMzQ0EsMkJBQW1CLEVBQUUvQyxXQUFXLElBQUk5QixHQUFKLEVBQWIsRUFBbkI7QUFDRDs7QUFFRHFGLGlCQUFXekQsR0FBWCxDQUFlekMsc0JBQWYsRUFBdUM0QixTQUF2QztBQUNBc0UsaUJBQVd6RCxHQUFYLENBQWV2QywwQkFBZixFQUEyQ3dGLGdCQUEzQztBQUNBL0UsaUJBQVc4QixHQUFYLENBQWVaLElBQWYsRUFBcUJxRSxVQUFyQjtBQUNELEtBckVEOztBQXVFQTs7Ozs7QUFLQSxVQUFNUSxvQkFBb0JsQixRQUFRO0FBQ2hDLFVBQUksQ0FBQ1QsYUFBTCxFQUFvQjtBQUNsQjtBQUNEOztBQUVELFVBQUk0QixpQkFBaUJsRyxXQUFXeUIsR0FBWCxDQUFlTCxJQUFmLENBQXJCO0FBQ0EsVUFBSSxPQUFPOEUsY0FBUCxLQUEwQixXQUE5QixFQUEyQztBQUN6Q0EseUJBQWlCLElBQUlqRyxHQUFKLEVBQWpCO0FBQ0Q7O0FBRUQsWUFBTWtHLHNCQUFzQixJQUFJL0YsR0FBSixFQUE1QjtBQUNBLFlBQU1nRyxzQkFBc0IsSUFBSWhHLEdBQUosRUFBNUI7O0FBRUEsWUFBTWlHLGVBQWUsSUFBSWpHLEdBQUosRUFBckI7QUFDQSxZQUFNa0csZUFBZSxJQUFJbEcsR0FBSixFQUFyQjs7QUFFQSxZQUFNbUcsb0JBQW9CLElBQUluRyxHQUFKLEVBQTFCO0FBQ0EsWUFBTW9HLG9CQUFvQixJQUFJcEcsR0FBSixFQUExQjs7QUFFQSxZQUFNcUcsYUFBYSxJQUFJeEcsR0FBSixFQUFuQjtBQUNBLFlBQU15RyxhQUFhLElBQUl6RyxHQUFKLEVBQW5CO0FBQ0FpRyxxQkFBZXJGLE9BQWYsQ0FBdUIsQ0FBQ2tCLEtBQUQsRUFBUUUsR0FBUixLQUFnQjtBQUNyQyxZQUFJRixNQUFNVSxHQUFOLENBQVVsRCxzQkFBVixDQUFKLEVBQXVDO0FBQ3JDOEcsdUJBQWF0RixHQUFiLENBQWlCa0IsR0FBakI7QUFDRDtBQUNELFlBQUlGLE1BQU1VLEdBQU4sQ0FBVWhELDBCQUFWLENBQUosRUFBMkM7QUFDekMwRyw4QkFBb0JwRixHQUFwQixDQUF3QmtCLEdBQXhCO0FBQ0Q7QUFDRCxZQUFJRixNQUFNVSxHQUFOLENBQVUvQyx3QkFBVixDQUFKLEVBQXlDO0FBQ3ZDNkcsNEJBQWtCeEYsR0FBbEIsQ0FBc0JrQixHQUF0QjtBQUNEO0FBQ0RGLGNBQU1sQixPQUFOLENBQWM2QixPQUFPO0FBQ25CLGNBQUlBLFFBQVFqRCwwQkFBUixJQUNBaUQsUUFBUWhELHdCQURaLEVBQ3NDO0FBQ2pDK0csdUJBQVd6RSxHQUFYLENBQWVVLEdBQWYsRUFBb0JULEdBQXBCO0FBQ0Q7QUFDTCxTQUxEO0FBTUQsT0FoQkQ7O0FBa0JBOEMsV0FBS00sSUFBTCxDQUFVeEUsT0FBVixDQUFrQjhGLFdBQVc7QUFDM0IsWUFBSUMsWUFBSjs7QUFFQTtBQUNBLFlBQUlELFFBQVFsRCxJQUFSLEtBQWlCbkUsd0JBQXJCLEVBQStDO0FBQzdDLGNBQUlxSCxRQUFRRSxNQUFaLEVBQW9CO0FBQ2xCRCwyQkFBZSx1QkFBUUQsUUFBUUUsTUFBUixDQUFlQyxHQUFmLENBQW1CQyxPQUFuQixDQUEyQixRQUEzQixFQUFxQyxFQUFyQyxDQUFSLEVBQWtEN0YsT0FBbEQsQ0FBZjtBQUNBeUYsb0JBQVFwRCxVQUFSLENBQW1CMUMsT0FBbkIsQ0FBMkJtQyxhQUFhO0FBQ3RDLGtCQUFJOEMsSUFBSjtBQUNBLGtCQUFJOUMsVUFBVTZDLFFBQVYsQ0FBbUJDLElBQW5CLEtBQTRCaEcsT0FBaEMsRUFBeUM7QUFDdkNnRyx1QkFBT3BHLHdCQUFQO0FBQ0QsZUFGRCxNQUVPO0FBQ0xvRyx1QkFBTzlDLFVBQVVULEtBQVYsQ0FBZ0J1RCxJQUF2QjtBQUNEO0FBQ0RZLHlCQUFXMUUsR0FBWCxDQUFlOEQsSUFBZixFQUFxQmMsWUFBckI7QUFDRCxhQVJEO0FBU0Q7QUFDRjs7QUFFRCxZQUFJRCxRQUFRbEQsSUFBUixLQUFpQmxFLHNCQUFyQixFQUE2QztBQUMzQ3FILHlCQUFlLHVCQUFRRCxRQUFRRSxNQUFSLENBQWVDLEdBQWYsQ0FBbUJDLE9BQW5CLENBQTJCLFFBQTNCLEVBQXFDLEVBQXJDLENBQVIsRUFBa0Q3RixPQUFsRCxDQUFmO0FBQ0FvRix1QkFBYXZGLEdBQWIsQ0FBaUI2RixZQUFqQjtBQUNEOztBQUVELFlBQUlELFFBQVFsRCxJQUFSLEtBQWlCakUsa0JBQXJCLEVBQXlDO0FBQ3ZDb0gseUJBQWUsdUJBQVFELFFBQVFFLE1BQVIsQ0FBZUMsR0FBZixDQUFtQkMsT0FBbkIsQ0FBMkIsUUFBM0IsRUFBcUMsRUFBckMsQ0FBUixFQUFrRDdGLE9BQWxELENBQWY7QUFDQSxjQUFJLENBQUMwRixZQUFMLEVBQW1CO0FBQ2pCO0FBQ0Q7O0FBRUQsY0FBSXZHLGFBQWF1RyxZQUFiLENBQUosRUFBZ0M7QUFDOUI7QUFDRDs7QUFFRCxjQUFJdEQseUJBQXlCcUQsUUFBUXBELFVBQWpDLENBQUosRUFBa0Q7QUFDaEQ2QyxnQ0FBb0JyRixHQUFwQixDQUF3QjZGLFlBQXhCO0FBQ0Q7O0FBRUQsY0FBSWxELHVCQUF1QmlELFFBQVFwRCxVQUEvQixDQUFKLEVBQWdEO0FBQzlDaUQsOEJBQWtCekYsR0FBbEIsQ0FBc0I2RixZQUF0QjtBQUNEOztBQUVERCxrQkFBUXBELFVBQVIsQ0FBbUIxQyxPQUFuQixDQUEyQm1DLGFBQWE7QUFDdEMsZ0JBQUlBLFVBQVVTLElBQVYsS0FBbUIvRCx3QkFBbkIsSUFDQXNELFVBQVVTLElBQVYsS0FBbUJoRSwwQkFEdkIsRUFDbUQ7QUFDakQ7QUFDRDtBQUNEaUgsdUJBQVcxRSxHQUFYLENBQWVnQixVQUFVZ0UsUUFBVixDQUFtQmxCLElBQWxDLEVBQXdDYyxZQUF4QztBQUNELFdBTkQ7QUFPRDtBQUNGLE9BbEREOztBQW9EQU4sbUJBQWF6RixPQUFiLENBQXFCa0IsU0FBUztBQUM1QixZQUFJLENBQUNzRSxhQUFhNUQsR0FBYixDQUFpQlYsS0FBakIsQ0FBTCxFQUE4QjtBQUM1QixjQUFJVCxVQUFVNEUsZUFBZXpFLEdBQWYsQ0FBbUJNLEtBQW5CLENBQWQ7QUFDQSxjQUFJLE9BQU9ULE9BQVAsS0FBbUIsV0FBdkIsRUFBb0M7QUFDbENBLHNCQUFVLElBQUlsQixHQUFKLEVBQVY7QUFDRDtBQUNEa0Isa0JBQVFQLEdBQVIsQ0FBWXhCLHNCQUFaO0FBQ0EyRyx5QkFBZWxFLEdBQWYsQ0FBbUJELEtBQW5CLEVBQTBCVCxPQUExQjs7QUFFQSxjQUFJRCxVQUFVbkIsV0FBV3VCLEdBQVgsQ0FBZU0sS0FBZixDQUFkO0FBQ0EsY0FBSVksYUFBSjtBQUNBLGNBQUksT0FBT3RCLE9BQVAsS0FBbUIsV0FBdkIsRUFBb0M7QUFDbENzQiw0QkFBZ0J0QixRQUFRSSxHQUFSLENBQVlsQyxzQkFBWixDQUFoQjtBQUNELFdBRkQsTUFFTztBQUNMOEIsc0JBQVUsSUFBSXBCLEdBQUosRUFBVjtBQUNBQyx1QkFBVzhCLEdBQVgsQ0FBZUQsS0FBZixFQUFzQlYsT0FBdEI7QUFDRDs7QUFFRCxjQUFJLE9BQU9zQixhQUFQLEtBQXlCLFdBQTdCLEVBQTBDO0FBQ3hDQSwwQkFBY1QsU0FBZCxDQUF3Qm5CLEdBQXhCLENBQTRCSyxJQUE1QjtBQUNELFdBRkQsTUFFTztBQUNMLGtCQUFNYyxZQUFZLElBQUk5QixHQUFKLEVBQWxCO0FBQ0E4QixzQkFBVW5CLEdBQVYsQ0FBY0ssSUFBZDtBQUNBQyxvQkFBUVcsR0FBUixDQUFZekMsc0JBQVosRUFBb0MsRUFBRTJDLFNBQUYsRUFBcEM7QUFDRDtBQUNGO0FBQ0YsT0ExQkQ7O0FBNEJBbUUsbUJBQWF4RixPQUFiLENBQXFCa0IsU0FBUztBQUM1QixZQUFJLENBQUN1RSxhQUFhN0QsR0FBYixDQUFpQlYsS0FBakIsQ0FBTCxFQUE4QjtBQUM1QixnQkFBTVQsVUFBVTRFLGVBQWV6RSxHQUFmLENBQW1CTSxLQUFuQixDQUFoQjtBQUNBVCxrQkFBUTRELE1BQVIsQ0FBZTNGLHNCQUFmOztBQUVBLGdCQUFNOEIsVUFBVW5CLFdBQVd1QixHQUFYLENBQWVNLEtBQWYsQ0FBaEI7QUFDQSxjQUFJLE9BQU9WLE9BQVAsS0FBbUIsV0FBdkIsRUFBb0M7QUFDbEMsa0JBQU1zQixnQkFBZ0J0QixRQUFRSSxHQUFSLENBQVlsQyxzQkFBWixDQUF0QjtBQUNBLGdCQUFJLE9BQU9vRCxhQUFQLEtBQXlCLFdBQTdCLEVBQTBDO0FBQ3hDQSw0QkFBY1QsU0FBZCxDQUF3QmdELE1BQXhCLENBQStCOUQsSUFBL0I7QUFDRDtBQUNGO0FBQ0Y7QUFDRixPQWJEOztBQWVBb0Ysd0JBQWtCM0YsT0FBbEIsQ0FBMEJrQixTQUFTO0FBQ2pDLFlBQUksQ0FBQ3dFLGtCQUFrQjlELEdBQWxCLENBQXNCVixLQUF0QixDQUFMLEVBQW1DO0FBQ2pDLGNBQUlULFVBQVU0RSxlQUFlekUsR0FBZixDQUFtQk0sS0FBbkIsQ0FBZDtBQUNBLGNBQUksT0FBT1QsT0FBUCxLQUFtQixXQUF2QixFQUFvQztBQUNsQ0Esc0JBQVUsSUFBSWxCLEdBQUosRUFBVjtBQUNEO0FBQ0RrQixrQkFBUVAsR0FBUixDQUFZckIsd0JBQVo7QUFDQXdHLHlCQUFlbEUsR0FBZixDQUFtQkQsS0FBbkIsRUFBMEJULE9BQTFCOztBQUVBLGNBQUlELFVBQVVuQixXQUFXdUIsR0FBWCxDQUFlTSxLQUFmLENBQWQ7QUFDQSxjQUFJWSxhQUFKO0FBQ0EsY0FBSSxPQUFPdEIsT0FBUCxLQUFtQixXQUF2QixFQUFvQztBQUNsQ3NCLDRCQUFnQnRCLFFBQVFJLEdBQVIsQ0FBWS9CLHdCQUFaLENBQWhCO0FBQ0QsV0FGRCxNQUVPO0FBQ0wyQixzQkFBVSxJQUFJcEIsR0FBSixFQUFWO0FBQ0FDLHVCQUFXOEIsR0FBWCxDQUFlRCxLQUFmLEVBQXNCVixPQUF0QjtBQUNEOztBQUVELGNBQUksT0FBT3NCLGFBQVAsS0FBeUIsV0FBN0IsRUFBMEM7QUFDeENBLDBCQUFjVCxTQUFkLENBQXdCbkIsR0FBeEIsQ0FBNEJLLElBQTVCO0FBQ0QsV0FGRCxNQUVPO0FBQ0wsa0JBQU1jLFlBQVksSUFBSTlCLEdBQUosRUFBbEI7QUFDQThCLHNCQUFVbkIsR0FBVixDQUFjSyxJQUFkO0FBQ0FDLG9CQUFRVyxHQUFSLENBQVl0Qyx3QkFBWixFQUFzQyxFQUFFd0MsU0FBRixFQUF0QztBQUNEO0FBQ0Y7QUFDRixPQTFCRDs7QUE0QkFxRSx3QkFBa0IxRixPQUFsQixDQUEwQmtCLFNBQVM7QUFDakMsWUFBSSxDQUFDeUUsa0JBQWtCL0QsR0FBbEIsQ0FBc0JWLEtBQXRCLENBQUwsRUFBbUM7QUFDakMsZ0JBQU1ULFVBQVU0RSxlQUFlekUsR0FBZixDQUFtQk0sS0FBbkIsQ0FBaEI7QUFDQVQsa0JBQVE0RCxNQUFSLENBQWV4Rix3QkFBZjs7QUFFQSxnQkFBTTJCLFVBQVVuQixXQUFXdUIsR0FBWCxDQUFlTSxLQUFmLENBQWhCO0FBQ0EsY0FBSSxPQUFPVixPQUFQLEtBQW1CLFdBQXZCLEVBQW9DO0FBQ2xDLGtCQUFNc0IsZ0JBQWdCdEIsUUFBUUksR0FBUixDQUFZL0Isd0JBQVosQ0FBdEI7QUFDQSxnQkFBSSxPQUFPaUQsYUFBUCxLQUF5QixXQUE3QixFQUEwQztBQUN4Q0EsNEJBQWNULFNBQWQsQ0FBd0JnRCxNQUF4QixDQUErQjlELElBQS9CO0FBQ0Q7QUFDRjtBQUNGO0FBQ0YsT0FiRDs7QUFlQWdGLDBCQUFvQnZGLE9BQXBCLENBQTRCa0IsU0FBUztBQUNuQyxZQUFJLENBQUNvRSxvQkFBb0IxRCxHQUFwQixDQUF3QlYsS0FBeEIsQ0FBTCxFQUFxQztBQUNuQyxjQUFJVCxVQUFVNEUsZUFBZXpFLEdBQWYsQ0FBbUJNLEtBQW5CLENBQWQ7QUFDQSxjQUFJLE9BQU9ULE9BQVAsS0FBbUIsV0FBdkIsRUFBb0M7QUFDbENBLHNCQUFVLElBQUlsQixHQUFKLEVBQVY7QUFDRDtBQUNEa0Isa0JBQVFQLEdBQVIsQ0FBWXRCLDBCQUFaO0FBQ0F5Ryx5QkFBZWxFLEdBQWYsQ0FBbUJELEtBQW5CLEVBQTBCVCxPQUExQjs7QUFFQSxjQUFJRCxVQUFVbkIsV0FBV3VCLEdBQVgsQ0FBZU0sS0FBZixDQUFkO0FBQ0EsY0FBSVksYUFBSjtBQUNBLGNBQUksT0FBT3RCLE9BQVAsS0FBbUIsV0FBdkIsRUFBb0M7QUFDbENzQiw0QkFBZ0J0QixRQUFRSSxHQUFSLENBQVloQywwQkFBWixDQUFoQjtBQUNELFdBRkQsTUFFTztBQUNMNEIsc0JBQVUsSUFBSXBCLEdBQUosRUFBVjtBQUNBQyx1QkFBVzhCLEdBQVgsQ0FBZUQsS0FBZixFQUFzQlYsT0FBdEI7QUFDRDs7QUFFRCxjQUFJLE9BQU9zQixhQUFQLEtBQXlCLFdBQTdCLEVBQTBDO0FBQ3hDQSwwQkFBY1QsU0FBZCxDQUF3Qm5CLEdBQXhCLENBQTRCSyxJQUE1QjtBQUNELFdBRkQsTUFFTztBQUNMLGtCQUFNYyxZQUFZLElBQUk5QixHQUFKLEVBQWxCO0FBQ0E4QixzQkFBVW5CLEdBQVYsQ0FBY0ssSUFBZDtBQUNBQyxvQkFBUVcsR0FBUixDQUFZdkMsMEJBQVosRUFBd0MsRUFBRXlDLFNBQUYsRUFBeEM7QUFDRDtBQUNGO0FBQ0YsT0ExQkQ7O0FBNEJBaUUsMEJBQW9CdEYsT0FBcEIsQ0FBNEJrQixTQUFTO0FBQ25DLFlBQUksQ0FBQ3FFLG9CQUFvQjNELEdBQXBCLENBQXdCVixLQUF4QixDQUFMLEVBQXFDO0FBQ25DLGdCQUFNVCxVQUFVNEUsZUFBZXpFLEdBQWYsQ0FBbUJNLEtBQW5CLENBQWhCO0FBQ0FULGtCQUFRNEQsTUFBUixDQUFlekYsMEJBQWY7O0FBRUEsZ0JBQU00QixVQUFVbkIsV0FBV3VCLEdBQVgsQ0FBZU0sS0FBZixDQUFoQjtBQUNBLGNBQUksT0FBT1YsT0FBUCxLQUFtQixXQUF2QixFQUFvQztBQUNsQyxrQkFBTXNCLGdCQUFnQnRCLFFBQVFJLEdBQVIsQ0FBWWhDLDBCQUFaLENBQXRCO0FBQ0EsZ0JBQUksT0FBT2tELGFBQVAsS0FBeUIsV0FBN0IsRUFBMEM7QUFDeENBLDRCQUFjVCxTQUFkLENBQXdCZ0QsTUFBeEIsQ0FBK0I5RCxJQUEvQjtBQUNEO0FBQ0Y7QUFDRjtBQUNGLE9BYkQ7O0FBZUFzRixpQkFBVzdGLE9BQVgsQ0FBbUIsQ0FBQ2tCLEtBQUQsRUFBUUUsR0FBUixLQUFnQjtBQUNqQyxZQUFJLENBQUN3RSxXQUFXaEUsR0FBWCxDQUFlUixHQUFmLENBQUwsRUFBMEI7QUFDeEIsY0FBSVgsVUFBVTRFLGVBQWV6RSxHQUFmLENBQW1CTSxLQUFuQixDQUFkO0FBQ0EsY0FBSSxPQUFPVCxPQUFQLEtBQW1CLFdBQXZCLEVBQW9DO0FBQ2xDQSxzQkFBVSxJQUFJbEIsR0FBSixFQUFWO0FBQ0Q7QUFDRGtCLGtCQUFRUCxHQUFSLENBQVlrQixHQUFaO0FBQ0FpRSx5QkFBZWxFLEdBQWYsQ0FBbUJELEtBQW5CLEVBQTBCVCxPQUExQjs7QUFFQSxjQUFJRCxVQUFVbkIsV0FBV3VCLEdBQVgsQ0FBZU0sS0FBZixDQUFkO0FBQ0EsY0FBSVksYUFBSjtBQUNBLGNBQUksT0FBT3RCLE9BQVAsS0FBbUIsV0FBdkIsRUFBb0M7QUFDbENzQiw0QkFBZ0J0QixRQUFRSSxHQUFSLENBQVlRLEdBQVosQ0FBaEI7QUFDRCxXQUZELE1BRU87QUFDTFosc0JBQVUsSUFBSXBCLEdBQUosRUFBVjtBQUNBQyx1QkFBVzhCLEdBQVgsQ0FBZUQsS0FBZixFQUFzQlYsT0FBdEI7QUFDRDs7QUFFRCxjQUFJLE9BQU9zQixhQUFQLEtBQXlCLFdBQTdCLEVBQTBDO0FBQ3hDQSwwQkFBY1QsU0FBZCxDQUF3Qm5CLEdBQXhCLENBQTRCSyxJQUE1QjtBQUNELFdBRkQsTUFFTztBQUNMLGtCQUFNYyxZQUFZLElBQUk5QixHQUFKLEVBQWxCO0FBQ0E4QixzQkFBVW5CLEdBQVYsQ0FBY0ssSUFBZDtBQUNBQyxvQkFBUVcsR0FBUixDQUFZQyxHQUFaLEVBQWlCLEVBQUVDLFNBQUYsRUFBakI7QUFDRDtBQUNGO0FBQ0YsT0ExQkQ7O0FBNEJBdUUsaUJBQVc1RixPQUFYLENBQW1CLENBQUNrQixLQUFELEVBQVFFLEdBQVIsS0FBZ0I7QUFDakMsWUFBSSxDQUFDeUUsV0FBV2pFLEdBQVgsQ0FBZVIsR0FBZixDQUFMLEVBQTBCO0FBQ3hCLGdCQUFNWCxVQUFVNEUsZUFBZXpFLEdBQWYsQ0FBbUJNLEtBQW5CLENBQWhCO0FBQ0FULGtCQUFRNEQsTUFBUixDQUFlakQsR0FBZjs7QUFFQSxnQkFBTVosVUFBVW5CLFdBQVd1QixHQUFYLENBQWVNLEtBQWYsQ0FBaEI7QUFDQSxjQUFJLE9BQU9WLE9BQVAsS0FBbUIsV0FBdkIsRUFBb0M7QUFDbEMsa0JBQU1zQixnQkFBZ0J0QixRQUFRSSxHQUFSLENBQVlRLEdBQVosQ0FBdEI7QUFDQSxnQkFBSSxPQUFPVSxhQUFQLEtBQXlCLFdBQTdCLEVBQTBDO0FBQ3hDQSw0QkFBY1QsU0FBZCxDQUF3QmdELE1BQXhCLENBQStCOUQsSUFBL0I7QUFDRDtBQUNGO0FBQ0Y7QUFDRixPQWJEO0FBY0QsS0F0UUQ7O0FBd1FBLFdBQU87QUFDTCxzQkFBZ0IyRCxRQUFRO0FBQ3RCUywwQkFBa0JULElBQWxCO0FBQ0FrQiwwQkFBa0JsQixJQUFsQjtBQUNBRCw0QkFBb0JDLElBQXBCO0FBQ0QsT0FMSTtBQU1MLGtDQUE0QkEsUUFBUTtBQUNsQ08sbUJBQVdQLElBQVgsRUFBaUJyRix3QkFBakI7QUFDRCxPQVJJO0FBU0wsZ0NBQTBCcUYsUUFBUTtBQUNoQ0EsYUFBS3hCLFVBQUwsQ0FBZ0IxQyxPQUFoQixDQUF3Qm1DLGFBQWE7QUFDakNzQyxxQkFBV1AsSUFBWCxFQUFpQi9CLFVBQVU2QyxRQUFWLENBQW1CQyxJQUFwQztBQUNILFNBRkQ7QUFHQSxZQUFJZixLQUFLWSxXQUFULEVBQXNCO0FBQ3BCLGNBQ0VaLEtBQUtZLFdBQUwsQ0FBaUJsQyxJQUFqQixLQUEwQjdELG9CQUExQixJQUNBbUYsS0FBS1ksV0FBTCxDQUFpQmxDLElBQWpCLEtBQTBCNUQsaUJBRjVCLEVBR0U7QUFDQXlGLHVCQUFXUCxJQUFYLEVBQWlCQSxLQUFLWSxXQUFMLENBQWlCSSxFQUFqQixDQUFvQkQsSUFBckM7QUFDRDtBQUNELGNBQUlmLEtBQUtZLFdBQUwsQ0FBaUJsQyxJQUFqQixLQUEwQjlELG9CQUE5QixFQUFvRDtBQUNsRG9GLGlCQUFLWSxXQUFMLENBQWlCSyxZQUFqQixDQUE4Qm5GLE9BQTlCLENBQXNDOEUsZUFBZTtBQUNuREwseUJBQVdQLElBQVgsRUFBaUJZLFlBQVlJLEVBQVosQ0FBZUQsSUFBaEM7QUFDRCxhQUZEO0FBR0Q7QUFDRjtBQUNGO0FBMUJJLEtBQVA7QUE0QkQ7QUFwaEJjLENBQWpCIiwiZmlsZSI6Im5vLXVudXNlZC1tb2R1bGVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZU92ZXJ2aWV3IEVuc3VyZXMgdGhhdCBtb2R1bGVzIGNvbnRhaW4gZXhwb3J0cyBhbmQvb3IgYWxsXG4gKiBtb2R1bGVzIGFyZSBjb25zdW1lZCB3aXRoaW4gb3RoZXIgbW9kdWxlcy5cbiAqIEBhdXRob3IgUmVuw6kgRmVybWFublxuICovXG5cbmltcG9ydCBFeHBvcnRzIGZyb20gJy4uL0V4cG9ydE1hcCdcbmltcG9ydCByZXNvbHZlIGZyb20gJ2VzbGludC1tb2R1bGUtdXRpbHMvcmVzb2x2ZSdcbmltcG9ydCBkb2NzVXJsIGZyb20gJy4uL2RvY3NVcmwnXG5cbi8vIGVzbGludC9saWIvdXRpbC9nbG9iLXV0aWwgaGFzIGJlZW4gbW92ZWQgdG8gZXNsaW50L2xpYi91dGlsL2dsb2ItdXRpbHMgd2l0aCB2ZXJzaW9uIDUuM1xuLy8gYW5kIGhhcyBiZWVuIG1vdmVkIHRvIGVzbGludC9saWIvY2xpLWVuZ2luZS9maWxlLWVudW1lcmF0b3IgaW4gdmVyc2lvbiA2XG5sZXQgbGlzdEZpbGVzVG9Qcm9jZXNzXG50cnkge1xuICB2YXIgRmlsZUVudW1lcmF0b3IgPSByZXF1aXJlKCdlc2xpbnQvbGliL2NsaS1lbmdpbmUvZmlsZS1lbnVtZXJhdG9yJykuRmlsZUVudW1lcmF0b3JcbiAgbGlzdEZpbGVzVG9Qcm9jZXNzID0gZnVuY3Rpb24gKHNyYykge1xuICAgIHZhciBlID0gbmV3IEZpbGVFbnVtZXJhdG9yKClcbiAgICByZXR1cm4gQXJyYXkuZnJvbShlLml0ZXJhdGVGaWxlcyhzcmMpKVxuICB9XG59IGNhdGNoIChlMSkge1xuICB0cnkge1xuICAgIGxpc3RGaWxlc1RvUHJvY2VzcyA9IHJlcXVpcmUoJ2VzbGludC9saWIvdXRpbC9nbG9iLXV0aWxzJykubGlzdEZpbGVzVG9Qcm9jZXNzXG4gIH0gY2F0Y2ggKGUyKSB7XG4gICAgbGlzdEZpbGVzVG9Qcm9jZXNzID0gcmVxdWlyZSgnZXNsaW50L2xpYi91dGlsL2dsb2ItdXRpbCcpLmxpc3RGaWxlc1RvUHJvY2Vzc1xuICB9XG59XG5cbmNvbnN0IEVYUE9SVF9ERUZBVUxUX0RFQ0xBUkFUSU9OID0gJ0V4cG9ydERlZmF1bHREZWNsYXJhdGlvbidcbmNvbnN0IEVYUE9SVF9OQU1FRF9ERUNMQVJBVElPTiA9ICdFeHBvcnROYW1lZERlY2xhcmF0aW9uJ1xuY29uc3QgRVhQT1JUX0FMTF9ERUNMQVJBVElPTiA9ICdFeHBvcnRBbGxEZWNsYXJhdGlvbidcbmNvbnN0IElNUE9SVF9ERUNMQVJBVElPTiA9ICdJbXBvcnREZWNsYXJhdGlvbidcbmNvbnN0IElNUE9SVF9OQU1FU1BBQ0VfU1BFQ0lGSUVSID0gJ0ltcG9ydE5hbWVzcGFjZVNwZWNpZmllcidcbmNvbnN0IElNUE9SVF9ERUZBVUxUX1NQRUNJRklFUiA9ICdJbXBvcnREZWZhdWx0U3BlY2lmaWVyJ1xuY29uc3QgVkFSSUFCTEVfREVDTEFSQVRJT04gPSAnVmFyaWFibGVEZWNsYXJhdGlvbidcbmNvbnN0IEZVTkNUSU9OX0RFQ0xBUkFUSU9OID0gJ0Z1bmN0aW9uRGVjbGFyYXRpb24nXG5jb25zdCBDTEFTU19ERUNMQVJBVElPTiA9ICdDbGFzc0RlY2xhcmF0aW9uJ1xuY29uc3QgREVGQVVMVCA9ICdkZWZhdWx0J1xuXG5sZXQgcHJlcGFyYXRpb25Eb25lID0gZmFsc2VcbmNvbnN0IGltcG9ydExpc3QgPSBuZXcgTWFwKClcbmNvbnN0IGV4cG9ydExpc3QgPSBuZXcgTWFwKClcbmNvbnN0IGlnbm9yZWRGaWxlcyA9IG5ldyBTZXQoKVxuXG5jb25zdCBpc05vZGVNb2R1bGUgPSBwYXRoID0+IHtcbiAgcmV0dXJuIC9cXC8obm9kZV9tb2R1bGVzKVxcLy8udGVzdChwYXRoKVxufVxuXG4vKipcbiAqIHJlYWQgYWxsIGZpbGVzIG1hdGNoaW5nIHRoZSBwYXR0ZXJucyBpbiBzcmMgYW5kIGlnbm9yZUV4cG9ydHNcbiAqXG4gKiByZXR1cm4gYWxsIGZpbGVzIG1hdGNoaW5nIHNyYyBwYXR0ZXJuLCB3aGljaCBhcmUgbm90IG1hdGNoaW5nIHRoZSBpZ25vcmVFeHBvcnRzIHBhdHRlcm5cbiAqL1xuY29uc3QgcmVzb2x2ZUZpbGVzID0gKHNyYywgaWdub3JlRXhwb3J0cykgPT4ge1xuICBjb25zdCBzcmNGaWxlcyA9IG5ldyBTZXQoKVxuICBjb25zdCBzcmNGaWxlTGlzdCA9IGxpc3RGaWxlc1RvUHJvY2VzcyhzcmMpXG5cbiAgLy8gcHJlcGFyZSBsaXN0IG9mIGlnbm9yZWQgZmlsZXNcbiAgY29uc3QgaWdub3JlZEZpbGVzTGlzdCA9ICBsaXN0RmlsZXNUb1Byb2Nlc3MoaWdub3JlRXhwb3J0cylcbiAgaWdub3JlZEZpbGVzTGlzdC5mb3JFYWNoKCh7IGZpbGVuYW1lIH0pID0+IGlnbm9yZWRGaWxlcy5hZGQoZmlsZW5hbWUpKVxuXG4gIC8vIHByZXBhcmUgbGlzdCBvZiBzb3VyY2UgZmlsZXMsIGRvbid0IGNvbnNpZGVyIGZpbGVzIGZyb20gbm9kZV9tb2R1bGVzXG4gIHNyY0ZpbGVMaXN0LmZpbHRlcigoeyBmaWxlbmFtZSB9KSA9PiAhaXNOb2RlTW9kdWxlKGZpbGVuYW1lKSkuZm9yRWFjaCgoeyBmaWxlbmFtZSB9KSA9PiB7XG4gICAgc3JjRmlsZXMuYWRkKGZpbGVuYW1lKVxuICB9KVxuICByZXR1cm4gc3JjRmlsZXNcbn1cblxuLyoqXG4gKiBwYXJzZSBhbGwgc291cmNlIGZpbGVzIGFuZCBidWlsZCB1cCAyIG1hcHMgY29udGFpbmluZyB0aGUgZXhpc3RpbmcgaW1wb3J0cyBhbmQgZXhwb3J0c1xuICovXG5jb25zdCBwcmVwYXJlSW1wb3J0c0FuZEV4cG9ydHMgPSAoc3JjRmlsZXMsIGNvbnRleHQpID0+IHtcbiAgY29uc3QgZXhwb3J0QWxsID0gbmV3IE1hcCgpXG4gIHNyY0ZpbGVzLmZvckVhY2goZmlsZSA9PiB7XG4gICAgY29uc3QgZXhwb3J0cyA9IG5ldyBNYXAoKVxuICAgIGNvbnN0IGltcG9ydHMgPSBuZXcgTWFwKClcbiAgICBjb25zdCBjdXJyZW50RXhwb3J0cyA9IEV4cG9ydHMuZ2V0KGZpbGUsIGNvbnRleHQpXG4gICAgaWYgKGN1cnJlbnRFeHBvcnRzKSB7XG4gICAgICBjb25zdCB7IGRlcGVuZGVuY2llcywgcmVleHBvcnRzLCBpbXBvcnRzOiBsb2NhbEltcG9ydExpc3QsIG5hbWVzcGFjZSAgfSA9IGN1cnJlbnRFeHBvcnRzXG5cbiAgICAgIC8vIGRlcGVuZGVuY2llcyA9PT0gZXhwb3J0ICogZnJvbSBcbiAgICAgIGNvbnN0IGN1cnJlbnRFeHBvcnRBbGwgPSBuZXcgU2V0KClcbiAgICAgIGRlcGVuZGVuY2llcy5mb3JFYWNoKHZhbHVlID0+IHtcbiAgICAgICAgY3VycmVudEV4cG9ydEFsbC5hZGQodmFsdWUoKS5wYXRoKVxuICAgICAgfSlcbiAgICAgIGV4cG9ydEFsbC5zZXQoZmlsZSwgY3VycmVudEV4cG9ydEFsbClcblxuICAgICAgcmVleHBvcnRzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgaWYgKGtleSA9PT0gREVGQVVMVCkge1xuICAgICAgICAgIGV4cG9ydHMuc2V0KElNUE9SVF9ERUZBVUxUX1NQRUNJRklFUiwgeyB3aGVyZVVzZWQ6IG5ldyBTZXQoKSB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGV4cG9ydHMuc2V0KGtleSwgeyB3aGVyZVVzZWQ6IG5ldyBTZXQoKSB9KVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlZXhwb3J0ID0gIHZhbHVlLmdldEltcG9ydCgpXG4gICAgICAgIGlmICghcmVleHBvcnQpIHtcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICBsZXQgbG9jYWxJbXBvcnQgPSBpbXBvcnRzLmdldChyZWV4cG9ydC5wYXRoKVxuICAgICAgICBsZXQgY3VycmVudFZhbHVlXG4gICAgICAgIGlmICh2YWx1ZS5sb2NhbCA9PT0gREVGQVVMVCkge1xuICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IElNUE9SVF9ERUZBVUxUX1NQRUNJRklFUlxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGN1cnJlbnRWYWx1ZSA9IHZhbHVlLmxvY2FsXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBsb2NhbEltcG9ydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBsb2NhbEltcG9ydCA9IG5ldyBTZXQoWy4uLmxvY2FsSW1wb3J0LCBjdXJyZW50VmFsdWVdKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvY2FsSW1wb3J0ID0gbmV3IFNldChbY3VycmVudFZhbHVlXSlcbiAgICAgICAgfVxuICAgICAgICBpbXBvcnRzLnNldChyZWV4cG9ydC5wYXRoLCBsb2NhbEltcG9ydClcbiAgICAgIH0pXG5cbiAgICAgIGxvY2FsSW1wb3J0TGlzdC5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIGlmIChpc05vZGVNb2R1bGUoa2V5KSkge1xuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIGltcG9ydHMuc2V0KGtleSwgdmFsdWUuaW1wb3J0ZWRTcGVjaWZpZXJzKVxuICAgICAgfSlcbiAgICAgIGltcG9ydExpc3Quc2V0KGZpbGUsIGltcG9ydHMpXG5cbiAgICAgIC8vIGJ1aWxkIHVwIGV4cG9ydCBsaXN0IG9ubHksIGlmIGZpbGUgaXMgbm90IGlnbm9yZWRcbiAgICAgIGlmIChpZ25vcmVkRmlsZXMuaGFzKGZpbGUpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbmFtZXNwYWNlLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgaWYgKGtleSA9PT0gREVGQVVMVCkge1xuICAgICAgICAgIGV4cG9ydHMuc2V0KElNUE9SVF9ERUZBVUxUX1NQRUNJRklFUiwgeyB3aGVyZVVzZWQ6IG5ldyBTZXQoKSB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGV4cG9ydHMuc2V0KGtleSwgeyB3aGVyZVVzZWQ6IG5ldyBTZXQoKSB9KVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICBleHBvcnRzLnNldChFWFBPUlRfQUxMX0RFQ0xBUkFUSU9OLCB7IHdoZXJlVXNlZDogbmV3IFNldCgpIH0pXG4gICAgZXhwb3J0cy5zZXQoSU1QT1JUX05BTUVTUEFDRV9TUEVDSUZJRVIsIHsgd2hlcmVVc2VkOiBuZXcgU2V0KCkgfSlcbiAgICBleHBvcnRMaXN0LnNldChmaWxlLCBleHBvcnRzKVxuICB9KVxuICBleHBvcnRBbGwuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgIHZhbHVlLmZvckVhY2godmFsID0+IHtcbiAgICAgIGNvbnN0IGN1cnJlbnRFeHBvcnRzID0gZXhwb3J0TGlzdC5nZXQodmFsKVxuICAgICAgY29uc3QgY3VycmVudEV4cG9ydCA9IGN1cnJlbnRFeHBvcnRzLmdldChFWFBPUlRfQUxMX0RFQ0xBUkFUSU9OKVxuICAgICAgY3VycmVudEV4cG9ydC53aGVyZVVzZWQuYWRkKGtleSlcbiAgICB9KVxuICB9KVxufVxuXG4vKipcbiAqIHRyYXZlcnNlIHRocm91Z2ggYWxsIGltcG9ydHMgYW5kIGFkZCB0aGUgcmVzcGVjdGl2ZSBwYXRoIHRvIHRoZSB3aGVyZVVzZWQtbGlzdCBcbiAqIG9mIHRoZSBjb3JyZXNwb25kaW5nIGV4cG9ydFxuICovXG5jb25zdCBkZXRlcm1pbmVVc2FnZSA9ICgpID0+IHtcbiAgaW1wb3J0TGlzdC5mb3JFYWNoKChsaXN0VmFsdWUsIGxpc3RLZXkpID0+IHtcbiAgICBsaXN0VmFsdWUuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgY29uc3QgZXhwb3J0cyA9IGV4cG9ydExpc3QuZ2V0KGtleSlcbiAgICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdmFsdWUuZm9yRWFjaChjdXJyZW50SW1wb3J0ID0+IHtcbiAgICAgICAgICBsZXQgc3BlY2lmaWVyXG4gICAgICAgICAgaWYgKGN1cnJlbnRJbXBvcnQgPT09IElNUE9SVF9OQU1FU1BBQ0VfU1BFQ0lGSUVSKSB7XG4gICAgICAgICAgICBzcGVjaWZpZXIgPSBJTVBPUlRfTkFNRVNQQUNFX1NQRUNJRklFUlxuICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudEltcG9ydCA9PT0gSU1QT1JUX0RFRkFVTFRfU1BFQ0lGSUVSKSB7XG4gICAgICAgICAgICBzcGVjaWZpZXIgPSBJTVBPUlRfREVGQVVMVF9TUEVDSUZJRVJcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3BlY2lmaWVyID0gY3VycmVudEltcG9ydFxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIHNwZWNpZmllciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGV4cG9ydFN0YXRlbWVudCA9IGV4cG9ydHMuZ2V0KHNwZWNpZmllcilcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZXhwb3J0U3RhdGVtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICBjb25zdCB7IHdoZXJlVXNlZCB9ID0gZXhwb3J0U3RhdGVtZW50XG4gICAgICAgICAgICAgIHdoZXJlVXNlZC5hZGQobGlzdEtleSlcbiAgICAgICAgICAgICAgZXhwb3J0cy5zZXQoc3BlY2lmaWVyLCB7IHdoZXJlVXNlZCB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuICB9KVxufVxuXG5jb25zdCBnZXRTcmMgPSBzcmMgPT4ge1xuICBpZiAoc3JjKSB7XG4gICAgcmV0dXJuIHNyY1xuICB9XG4gIHJldHVybiBbcHJvY2Vzcy5jd2QoKV1cbn1cblxuLyoqXG4gKiBwcmVwYXJlIHRoZSBsaXN0cyBvZiBleGlzdGluZyBpbXBvcnRzIGFuZCBleHBvcnRzIC0gc2hvdWxkIG9ubHkgYmUgZXhlY3V0ZWQgb25jZSBhdFxuICogdGhlIHN0YXJ0IG9mIGEgbmV3IGVzbGludCBydW5cbiAqL1xuY29uc3QgZG9QcmVwYXJhdGlvbiA9IChzcmMsIGlnbm9yZUV4cG9ydHMsIGNvbnRleHQpID0+IHtcbiAgY29uc3Qgc3JjRmlsZXMgPSByZXNvbHZlRmlsZXMoZ2V0U3JjKHNyYyksIGlnbm9yZUV4cG9ydHMpXG4gIHByZXBhcmVJbXBvcnRzQW5kRXhwb3J0cyhzcmNGaWxlcywgY29udGV4dClcbiAgZGV0ZXJtaW5lVXNhZ2UoKVxuICBwcmVwYXJhdGlvbkRvbmUgPSB0cnVlXG59XG5cbmNvbnN0IG5ld05hbWVzcGFjZUltcG9ydEV4aXN0cyA9IHNwZWNpZmllcnMgPT5cbiAgc3BlY2lmaWVycy5zb21lKCh7IHR5cGUgfSkgPT4gdHlwZSA9PT0gSU1QT1JUX05BTUVTUEFDRV9TUEVDSUZJRVIpXG5cbmNvbnN0IG5ld0RlZmF1bHRJbXBvcnRFeGlzdHMgPSBzcGVjaWZpZXJzID0+XG4gIHNwZWNpZmllcnMuc29tZSgoeyB0eXBlIH0pID0+IHR5cGUgPT09IElNUE9SVF9ERUZBVUxUX1NQRUNJRklFUilcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIG1ldGE6IHtcbiAgICBkb2NzOiB7IHVybDogZG9jc1VybCgnbm8tdW51c2VkLW1vZHVsZXMnKSB9LFxuICAgIHNjaGVtYTogW3tcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgc3JjOiB7XG4gICAgICAgICAgZGVzY3JpcHRpb246ICdmaWxlcy9wYXRocyB0byBiZSBhbmFseXplZCAob25seSBmb3IgdW51c2VkIGV4cG9ydHMpJyxcbiAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgIG1pbkl0ZW1zOiAxLFxuICAgICAgICAgIGl0ZW1zOiB7XG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgIG1pbkxlbmd0aDogMSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBpZ25vcmVFeHBvcnRzOiB7XG4gICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAnZmlsZXMvcGF0aHMgZm9yIHdoaWNoIHVudXNlZCBleHBvcnRzIHdpbGwgbm90IGJlIHJlcG9ydGVkIChlLmcgbW9kdWxlIGVudHJ5IHBvaW50cyknLFxuICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgbWluSXRlbXM6IDEsXG4gICAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgbWluTGVuZ3RoOiAxLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIG1pc3NpbmdFeHBvcnRzOiB7XG4gICAgICAgICAgZGVzY3JpcHRpb246ICdyZXBvcnQgbW9kdWxlcyB3aXRob3V0IGFueSBleHBvcnRzJyxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIH0sXG4gICAgICAgIHVudXNlZEV4cG9ydHM6IHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ3JlcG9ydCBleHBvcnRzIHdpdGhvdXQgYW55IHVzYWdlJyxcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgbm90OiB7XG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICB1bnVzZWRFeHBvcnRzOiB7IGVudW06IFtmYWxzZV0gfSxcbiAgICAgICAgICBtaXNzaW5nRXhwb3J0czogeyBlbnVtOiBbZmFsc2VdIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgYW55T2Y6W3tcbiAgICAgICAgbm90OiB7XG4gICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgdW51c2VkRXhwb3J0czogeyBlbnVtOiBbdHJ1ZV0gfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICByZXF1aXJlZDogWydtaXNzaW5nRXhwb3J0cyddLFxuICAgICAgfSwge1xuICAgICAgICBub3Q6IHtcbiAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICBtaXNzaW5nRXhwb3J0czogeyBlbnVtOiBbdHJ1ZV0gfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICByZXF1aXJlZDogWyd1bnVzZWRFeHBvcnRzJ10sXG4gICAgICB9LCB7XG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICB1bnVzZWRFeHBvcnRzOiB7IGVudW06IFt0cnVlXSB9LFxuICAgICAgICB9LFxuICAgICAgICByZXF1aXJlZDogWyd1bnVzZWRFeHBvcnRzJ10sXG4gICAgICB9LCB7XG4gICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICBtaXNzaW5nRXhwb3J0czogeyBlbnVtOiBbdHJ1ZV0gfSxcbiAgICAgICAgfSxcbiAgICAgICAgcmVxdWlyZWQ6IFsnbWlzc2luZ0V4cG9ydHMnXSxcbiAgICAgIH1dLFxuICAgIH1dLFxuICB9LFxuXG4gIGNyZWF0ZTogY29udGV4dCA9PiB7XG4gICAgY29uc3Qge1xuICAgICAgc3JjLFxuICAgICAgaWdub3JlRXhwb3J0cyA9IFtdLFxuICAgICAgbWlzc2luZ0V4cG9ydHMsXG4gICAgICB1bnVzZWRFeHBvcnRzLFxuICAgIH0gPSBjb250ZXh0Lm9wdGlvbnNbMF0gfHwge31cblxuICAgIGlmICh1bnVzZWRFeHBvcnRzICYmICFwcmVwYXJhdGlvbkRvbmUpIHtcbiAgICAgIGRvUHJlcGFyYXRpb24oc3JjLCBpZ25vcmVFeHBvcnRzLCBjb250ZXh0KVxuICAgIH1cblxuICAgIGNvbnN0IGZpbGUgPSBjb250ZXh0LmdldEZpbGVuYW1lKClcblxuICAgIGNvbnN0IGNoZWNrRXhwb3J0UHJlc2VuY2UgPSBub2RlID0+IHtcbiAgICAgIGlmICghbWlzc2luZ0V4cG9ydHMpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGlmIChpZ25vcmVkRmlsZXMuaGFzKGZpbGUpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBjb25zdCBleHBvcnRDb3VudCA9IGV4cG9ydExpc3QuZ2V0KGZpbGUpXG4gICAgICBjb25zdCBleHBvcnRBbGwgPSBleHBvcnRDb3VudC5nZXQoRVhQT1JUX0FMTF9ERUNMQVJBVElPTilcbiAgICAgIGNvbnN0IG5hbWVzcGFjZUltcG9ydHMgPSBleHBvcnRDb3VudC5nZXQoSU1QT1JUX05BTUVTUEFDRV9TUEVDSUZJRVIpXG5cbiAgICAgIGV4cG9ydENvdW50LmRlbGV0ZShFWFBPUlRfQUxMX0RFQ0xBUkFUSU9OKVxuICAgICAgZXhwb3J0Q291bnQuZGVsZXRlKElNUE9SVF9OQU1FU1BBQ0VfU1BFQ0lGSUVSKVxuICAgICAgaWYgKG1pc3NpbmdFeHBvcnRzICYmIGV4cG9ydENvdW50LnNpemUgPCAxKSB7XG4gICAgICAgIC8vIG5vZGUuYm9keVswXSA9PT0gJ3VuZGVmaW5lZCcgb25seSBoYXBwZW5zLCBpZiBldmVyeXRoaW5nIGlzIGNvbW1lbnRlZCBvdXQgaW4gdGhlIGZpbGVcbiAgICAgICAgLy8gYmVpbmcgbGludGVkXG4gICAgICAgIGNvbnRleHQucmVwb3J0KG5vZGUuYm9keVswXSA/IG5vZGUuYm9keVswXSA6IG5vZGUsICdObyBleHBvcnRzIGZvdW5kJylcbiAgICAgIH1cbiAgICAgIGV4cG9ydENvdW50LnNldChFWFBPUlRfQUxMX0RFQ0xBUkFUSU9OLCBleHBvcnRBbGwpXG4gICAgICBleHBvcnRDb3VudC5zZXQoSU1QT1JUX05BTUVTUEFDRV9TUEVDSUZJRVIsIG5hbWVzcGFjZUltcG9ydHMpXG4gICAgfVxuXG4gICAgY29uc3QgY2hlY2tVc2FnZSA9IChub2RlLCBleHBvcnRlZFZhbHVlKSA9PiB7XG4gICAgICBpZiAoIXVudXNlZEV4cG9ydHMpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGlmIChpZ25vcmVkRmlsZXMuaGFzKGZpbGUpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyByZWZyZXNoIGxpc3Qgb2Ygc291cmNlIGZpbGVzXG4gICAgICBjb25zdCBzcmNGaWxlcyA9IHJlc29sdmVGaWxlcyhnZXRTcmMoc3JjKSwgaWdub3JlRXhwb3J0cylcblxuICAgICAgLy8gbWFrZSBzdXJlIGZpbGUgdG8gYmUgbGludGVkIGlzIGluY2x1ZGVkIGluIHNvdXJjZSBmaWxlc1xuICAgICAgaWYgKCFzcmNGaWxlcy5oYXMoZmlsZSkpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGV4cG9ydHMgPSBleHBvcnRMaXN0LmdldChmaWxlKVxuXG4gICAgICAvLyBzcGVjaWFsIGNhc2U6IGV4cG9ydCAqIGZyb20gXG4gICAgICBjb25zdCBleHBvcnRBbGwgPSBleHBvcnRzLmdldChFWFBPUlRfQUxMX0RFQ0xBUkFUSU9OKVxuICAgICAgaWYgKHR5cGVvZiBleHBvcnRBbGwgIT09ICd1bmRlZmluZWQnICYmIGV4cG9ydGVkVmFsdWUgIT09IElNUE9SVF9ERUZBVUxUX1NQRUNJRklFUikge1xuICAgICAgICBpZiAoZXhwb3J0QWxsLndoZXJlVXNlZC5zaXplID4gMCkge1xuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHNwZWNpYWwgY2FzZTogbmFtZXNwYWNlIGltcG9ydFxuICAgICAgY29uc3QgbmFtZXNwYWNlSW1wb3J0cyA9IGV4cG9ydHMuZ2V0KElNUE9SVF9OQU1FU1BBQ0VfU1BFQ0lGSUVSKVxuICAgICAgaWYgKHR5cGVvZiBuYW1lc3BhY2VJbXBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpZiAobmFtZXNwYWNlSW1wb3J0cy53aGVyZVVzZWQuc2l6ZSA+IDApIHtcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBleHBvcnRTdGF0ZW1lbnQgPSBleHBvcnRzLmdldChleHBvcnRlZFZhbHVlKVxuXG4gICAgICBjb25zdCB2YWx1ZSA9IGV4cG9ydGVkVmFsdWUgPT09IElNUE9SVF9ERUZBVUxUX1NQRUNJRklFUiA/IERFRkFVTFQgOiBleHBvcnRlZFZhbHVlXG5cbiAgICAgIGlmICh0eXBlb2YgZXhwb3J0U3RhdGVtZW50ICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICAgIGlmIChleHBvcnRTdGF0ZW1lbnQud2hlcmVVc2VkLnNpemUgPCAxKSB7XG4gICAgICAgICAgY29udGV4dC5yZXBvcnQoXG4gICAgICAgICAgICBub2RlLFxuICAgICAgICAgICAgYGV4cG9ydGVkIGRlY2xhcmF0aW9uICcke3ZhbHVlfScgbm90IHVzZWQgd2l0aGluIG90aGVyIG1vZHVsZXNgXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb250ZXh0LnJlcG9ydChcbiAgICAgICAgICBub2RlLFxuICAgICAgICAgIGBleHBvcnRlZCBkZWNsYXJhdGlvbiAnJHt2YWx1ZX0nIG5vdCB1c2VkIHdpdGhpbiBvdGhlciBtb2R1bGVzYFxuICAgICAgICApXG4gICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogb25seSB1c2VmdWwgZm9yIHRvb2xzIGxpa2UgdnNjb2RlLWVzbGludFxuICAgICAqIFxuICAgICAqIHVwZGF0ZSBsaXN0cyBvZiBleGlzdGluZyBleHBvcnRzIGR1cmluZyBydW50aW1lXG4gICAgICovXG4gICAgY29uc3QgdXBkYXRlRXhwb3J0VXNhZ2UgPSBub2RlID0+IHtcbiAgICAgIGlmIChpZ25vcmVkRmlsZXMuaGFzKGZpbGUpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICBsZXQgZXhwb3J0cyA9IGV4cG9ydExpc3QuZ2V0KGZpbGUpXG5cbiAgICAgIC8vIG5ldyBtb2R1bGUgaGFzIGJlZW4gY3JlYXRlZCBkdXJpbmcgcnVudGltZVxuICAgICAgLy8gaW5jbHVkZSBpdCBpbiBmdXJ0aGVyIHByb2Nlc3NpbmdcbiAgICAgIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZXhwb3J0cyA9IG5ldyBNYXAoKVxuICAgICAgfVxuXG4gICAgICBjb25zdCBuZXdFeHBvcnRzID0gbmV3IE1hcCgpXG4gICAgICBjb25zdCBuZXdFeHBvcnRJZGVudGlmaWVycyA9IG5ldyBTZXQoKVxuXG4gICAgICBub2RlLmJvZHkuZm9yRWFjaCgoeyB0eXBlLCBkZWNsYXJhdGlvbiwgc3BlY2lmaWVycyB9KSA9PiB7XG4gICAgICAgIGlmICh0eXBlID09PSBFWFBPUlRfREVGQVVMVF9ERUNMQVJBVElPTikge1xuICAgICAgICAgIG5ld0V4cG9ydElkZW50aWZpZXJzLmFkZChJTVBPUlRfREVGQVVMVF9TUEVDSUZJRVIpXG4gICAgICAgIH0gXG4gICAgICAgIGlmICh0eXBlID09PSBFWFBPUlRfTkFNRURfREVDTEFSQVRJT04pIHtcbiAgICAgICAgICBpZiAoc3BlY2lmaWVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBzcGVjaWZpZXJzLmZvckVhY2goc3BlY2lmaWVyID0+IHtcbiAgICAgICAgICAgICAgaWYgKHNwZWNpZmllci5leHBvcnRlZCkge1xuICAgICAgICAgICAgICAgIG5ld0V4cG9ydElkZW50aWZpZXJzLmFkZChzcGVjaWZpZXIuZXhwb3J0ZWQubmFtZSlcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGRlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIGRlY2xhcmF0aW9uLnR5cGUgPT09IEZVTkNUSU9OX0RFQ0xBUkFUSU9OIHx8XG4gICAgICAgICAgICAgIGRlY2xhcmF0aW9uLnR5cGUgPT09IENMQVNTX0RFQ0xBUkFUSU9OXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgbmV3RXhwb3J0SWRlbnRpZmllcnMuYWRkKGRlY2xhcmF0aW9uLmlkLm5hbWUpXG4gICAgICAgICAgICB9ICAgXG4gICAgICAgICAgICBpZiAoZGVjbGFyYXRpb24udHlwZSA9PT0gVkFSSUFCTEVfREVDTEFSQVRJT04pIHtcbiAgICAgICAgICAgICAgZGVjbGFyYXRpb24uZGVjbGFyYXRpb25zLmZvckVhY2goKHsgaWQgfSkgPT4ge1xuICAgICAgICAgICAgICAgIG5ld0V4cG9ydElkZW50aWZpZXJzLmFkZChpZC5uYW1lKVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgLy8gb2xkIGV4cG9ydHMgZXhpc3Qgd2l0aGluIGxpc3Qgb2YgbmV3IGV4cG9ydHMgaWRlbnRpZmllcnM6IGFkZCB0byBtYXAgb2YgbmV3IGV4cG9ydHNcbiAgICAgIGV4cG9ydHMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICBpZiAobmV3RXhwb3J0SWRlbnRpZmllcnMuaGFzKGtleSkpIHtcbiAgICAgICAgICBuZXdFeHBvcnRzLnNldChrZXksIHZhbHVlKVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAvLyBuZXcgZXhwb3J0IGlkZW50aWZpZXJzIGFkZGVkOiBhZGQgdG8gbWFwIG9mIG5ldyBleHBvcnRzXG4gICAgICBuZXdFeHBvcnRJZGVudGlmaWVycy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgIGlmICghZXhwb3J0cy5oYXMoa2V5KSkge1xuICAgICAgICAgIG5ld0V4cG9ydHMuc2V0KGtleSwgeyB3aGVyZVVzZWQ6IG5ldyBTZXQoKSB9KVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAvLyBwcmVzZXJ2ZSBpbmZvcm1hdGlvbiBhYm91dCBuYW1lc3BhY2UgaW1wb3J0c1xuICAgICAgbGV0IGV4cG9ydEFsbCA9IGV4cG9ydHMuZ2V0KEVYUE9SVF9BTExfREVDTEFSQVRJT04pXG4gICAgICBsZXQgbmFtZXNwYWNlSW1wb3J0cyA9IGV4cG9ydHMuZ2V0KElNUE9SVF9OQU1FU1BBQ0VfU1BFQ0lGSUVSKVxuXG4gICAgICBpZiAodHlwZW9mIG5hbWVzcGFjZUltcG9ydHMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIG5hbWVzcGFjZUltcG9ydHMgPSB7IHdoZXJlVXNlZDogbmV3IFNldCgpIH1cbiAgICAgIH1cblxuICAgICAgbmV3RXhwb3J0cy5zZXQoRVhQT1JUX0FMTF9ERUNMQVJBVElPTiwgZXhwb3J0QWxsKVxuICAgICAgbmV3RXhwb3J0cy5zZXQoSU1QT1JUX05BTUVTUEFDRV9TUEVDSUZJRVIsIG5hbWVzcGFjZUltcG9ydHMpXG4gICAgICBleHBvcnRMaXN0LnNldChmaWxlLCBuZXdFeHBvcnRzKVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIG9ubHkgdXNlZnVsIGZvciB0b29scyBsaWtlIHZzY29kZS1lc2xpbnRcbiAgICAgKiBcbiAgICAgKiB1cGRhdGUgbGlzdHMgb2YgZXhpc3RpbmcgaW1wb3J0cyBkdXJpbmcgcnVudGltZVxuICAgICAqL1xuICAgIGNvbnN0IHVwZGF0ZUltcG9ydFVzYWdlID0gbm9kZSA9PiB7XG4gICAgICBpZiAoIXVudXNlZEV4cG9ydHMpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIGxldCBvbGRJbXBvcnRQYXRocyA9IGltcG9ydExpc3QuZ2V0KGZpbGUpXG4gICAgICBpZiAodHlwZW9mIG9sZEltcG9ydFBhdGhzID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBvbGRJbXBvcnRQYXRocyA9IG5ldyBNYXAoKVxuICAgICAgfVxuXG4gICAgICBjb25zdCBvbGROYW1lc3BhY2VJbXBvcnRzID0gbmV3IFNldCgpXG4gICAgICBjb25zdCBuZXdOYW1lc3BhY2VJbXBvcnRzID0gbmV3IFNldCgpXG5cbiAgICAgIGNvbnN0IG9sZEV4cG9ydEFsbCA9IG5ldyBTZXQoKVxuICAgICAgY29uc3QgbmV3RXhwb3J0QWxsID0gbmV3IFNldCgpXG5cbiAgICAgIGNvbnN0IG9sZERlZmF1bHRJbXBvcnRzID0gbmV3IFNldCgpXG4gICAgICBjb25zdCBuZXdEZWZhdWx0SW1wb3J0cyA9IG5ldyBTZXQoKVxuXG4gICAgICBjb25zdCBvbGRJbXBvcnRzID0gbmV3IE1hcCgpXG4gICAgICBjb25zdCBuZXdJbXBvcnRzID0gbmV3IE1hcCgpXG4gICAgICBvbGRJbXBvcnRQYXRocy5mb3JFYWNoKCh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICAgIGlmICh2YWx1ZS5oYXMoRVhQT1JUX0FMTF9ERUNMQVJBVElPTikpIHtcbiAgICAgICAgICBvbGRFeHBvcnRBbGwuYWRkKGtleSlcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWUuaGFzKElNUE9SVF9OQU1FU1BBQ0VfU1BFQ0lGSUVSKSkge1xuICAgICAgICAgIG9sZE5hbWVzcGFjZUltcG9ydHMuYWRkKGtleSlcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWUuaGFzKElNUE9SVF9ERUZBVUxUX1NQRUNJRklFUikpIHtcbiAgICAgICAgICBvbGREZWZhdWx0SW1wb3J0cy5hZGQoa2V5KVxuICAgICAgICB9XG4gICAgICAgIHZhbHVlLmZvckVhY2godmFsID0+IHtcbiAgICAgICAgICBpZiAodmFsICE9PSBJTVBPUlRfTkFNRVNQQUNFX1NQRUNJRklFUiAmJlxuICAgICAgICAgICAgICB2YWwgIT09IElNUE9SVF9ERUZBVUxUX1NQRUNJRklFUikge1xuICAgICAgICAgICAgICAgb2xkSW1wb3J0cy5zZXQodmFsLCBrZXkpXG4gICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgbm9kZS5ib2R5LmZvckVhY2goYXN0Tm9kZSA9PiB7XG4gICAgICAgIGxldCByZXNvbHZlZFBhdGhcblxuICAgICAgICAvLyBzdXBwb3J0IGZvciBleHBvcnQgeyB2YWx1ZSB9IGZyb20gJ21vZHVsZSdcbiAgICAgICAgaWYgKGFzdE5vZGUudHlwZSA9PT0gRVhQT1JUX05BTUVEX0RFQ0xBUkFUSU9OKSB7XG4gICAgICAgICAgaWYgKGFzdE5vZGUuc291cmNlKSB7XG4gICAgICAgICAgICByZXNvbHZlZFBhdGggPSByZXNvbHZlKGFzdE5vZGUuc291cmNlLnJhdy5yZXBsYWNlKC8oJ3xcIikvZywgJycpLCBjb250ZXh0KVxuICAgICAgICAgICAgYXN0Tm9kZS5zcGVjaWZpZXJzLmZvckVhY2goc3BlY2lmaWVyID0+IHtcbiAgICAgICAgICAgICAgbGV0IG5hbWVcbiAgICAgICAgICAgICAgaWYgKHNwZWNpZmllci5leHBvcnRlZC5uYW1lID09PSBERUZBVUxUKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IElNUE9SVF9ERUZBVUxUX1NQRUNJRklFUlxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBzcGVjaWZpZXIubG9jYWwubmFtZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIG5ld0ltcG9ydHMuc2V0KG5hbWUsIHJlc29sdmVkUGF0aClcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFzdE5vZGUudHlwZSA9PT0gRVhQT1JUX0FMTF9ERUNMQVJBVElPTikge1xuICAgICAgICAgIHJlc29sdmVkUGF0aCA9IHJlc29sdmUoYXN0Tm9kZS5zb3VyY2UucmF3LnJlcGxhY2UoLygnfFwiKS9nLCAnJyksIGNvbnRleHQpXG4gICAgICAgICAgbmV3RXhwb3J0QWxsLmFkZChyZXNvbHZlZFBhdGgpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXN0Tm9kZS50eXBlID09PSBJTVBPUlRfREVDTEFSQVRJT04pIHtcbiAgICAgICAgICByZXNvbHZlZFBhdGggPSByZXNvbHZlKGFzdE5vZGUuc291cmNlLnJhdy5yZXBsYWNlKC8oJ3xcIikvZywgJycpLCBjb250ZXh0KVxuICAgICAgICAgIGlmICghcmVzb2x2ZWRQYXRoKSB7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoaXNOb2RlTW9kdWxlKHJlc29sdmVkUGF0aCkpIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChuZXdOYW1lc3BhY2VJbXBvcnRFeGlzdHMoYXN0Tm9kZS5zcGVjaWZpZXJzKSkge1xuICAgICAgICAgICAgbmV3TmFtZXNwYWNlSW1wb3J0cy5hZGQocmVzb2x2ZWRQYXRoKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChuZXdEZWZhdWx0SW1wb3J0RXhpc3RzKGFzdE5vZGUuc3BlY2lmaWVycykpIHtcbiAgICAgICAgICAgIG5ld0RlZmF1bHRJbXBvcnRzLmFkZChyZXNvbHZlZFBhdGgpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYXN0Tm9kZS5zcGVjaWZpZXJzLmZvckVhY2goc3BlY2lmaWVyID0+IHtcbiAgICAgICAgICAgIGlmIChzcGVjaWZpZXIudHlwZSA9PT0gSU1QT1JUX0RFRkFVTFRfU1BFQ0lGSUVSIHx8XG4gICAgICAgICAgICAgICAgc3BlY2lmaWVyLnR5cGUgPT09IElNUE9SVF9OQU1FU1BBQ0VfU1BFQ0lGSUVSKSB7XG4gICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3SW1wb3J0cy5zZXQoc3BlY2lmaWVyLmltcG9ydGVkLm5hbWUsIHJlc29sdmVkUGF0aClcbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICBuZXdFeHBvcnRBbGwuZm9yRWFjaCh2YWx1ZSA9PiB7XG4gICAgICAgIGlmICghb2xkRXhwb3J0QWxsLmhhcyh2YWx1ZSkpIHtcbiAgICAgICAgICBsZXQgaW1wb3J0cyA9IG9sZEltcG9ydFBhdGhzLmdldCh2YWx1ZSlcbiAgICAgICAgICBpZiAodHlwZW9mIGltcG9ydHMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBpbXBvcnRzID0gbmV3IFNldCgpXG4gICAgICAgICAgfVxuICAgICAgICAgIGltcG9ydHMuYWRkKEVYUE9SVF9BTExfREVDTEFSQVRJT04pXG4gICAgICAgICAgb2xkSW1wb3J0UGF0aHMuc2V0KHZhbHVlLCBpbXBvcnRzKVxuXG4gICAgICAgICAgbGV0IGV4cG9ydHMgPSBleHBvcnRMaXN0LmdldCh2YWx1ZSlcbiAgICAgICAgICBsZXQgY3VycmVudEV4cG9ydFxuICAgICAgICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGN1cnJlbnRFeHBvcnQgPSBleHBvcnRzLmdldChFWFBPUlRfQUxMX0RFQ0xBUkFUSU9OKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHBvcnRzID0gbmV3IE1hcCgpXG4gICAgICAgICAgICBleHBvcnRMaXN0LnNldCh2YWx1ZSwgZXhwb3J0cylcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodHlwZW9mIGN1cnJlbnRFeHBvcnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjdXJyZW50RXhwb3J0LndoZXJlVXNlZC5hZGQoZmlsZSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3Qgd2hlcmVVc2VkID0gbmV3IFNldCgpXG4gICAgICAgICAgICB3aGVyZVVzZWQuYWRkKGZpbGUpXG4gICAgICAgICAgICBleHBvcnRzLnNldChFWFBPUlRfQUxMX0RFQ0xBUkFUSU9OLCB7IHdoZXJlVXNlZCB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgb2xkRXhwb3J0QWxsLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgICBpZiAoIW5ld0V4cG9ydEFsbC5oYXModmFsdWUpKSB7XG4gICAgICAgICAgY29uc3QgaW1wb3J0cyA9IG9sZEltcG9ydFBhdGhzLmdldCh2YWx1ZSlcbiAgICAgICAgICBpbXBvcnRzLmRlbGV0ZShFWFBPUlRfQUxMX0RFQ0xBUkFUSU9OKVxuXG4gICAgICAgICAgY29uc3QgZXhwb3J0cyA9IGV4cG9ydExpc3QuZ2V0KHZhbHVlKVxuICAgICAgICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRFeHBvcnQgPSBleHBvcnRzLmdldChFWFBPUlRfQUxMX0RFQ0xBUkFUSU9OKVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjdXJyZW50RXhwb3J0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICBjdXJyZW50RXhwb3J0LndoZXJlVXNlZC5kZWxldGUoZmlsZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIG5ld0RlZmF1bHRJbXBvcnRzLmZvckVhY2godmFsdWUgPT4ge1xuICAgICAgICBpZiAoIW9sZERlZmF1bHRJbXBvcnRzLmhhcyh2YWx1ZSkpIHtcbiAgICAgICAgICBsZXQgaW1wb3J0cyA9IG9sZEltcG9ydFBhdGhzLmdldCh2YWx1ZSlcbiAgICAgICAgICBpZiAodHlwZW9mIGltcG9ydHMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBpbXBvcnRzID0gbmV3IFNldCgpXG4gICAgICAgICAgfVxuICAgICAgICAgIGltcG9ydHMuYWRkKElNUE9SVF9ERUZBVUxUX1NQRUNJRklFUilcbiAgICAgICAgICBvbGRJbXBvcnRQYXRocy5zZXQodmFsdWUsIGltcG9ydHMpXG5cbiAgICAgICAgICBsZXQgZXhwb3J0cyA9IGV4cG9ydExpc3QuZ2V0KHZhbHVlKVxuICAgICAgICAgIGxldCBjdXJyZW50RXhwb3J0XG4gICAgICAgICAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY3VycmVudEV4cG9ydCA9IGV4cG9ydHMuZ2V0KElNUE9SVF9ERUZBVUxUX1NQRUNJRklFUilcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXhwb3J0cyA9IG5ldyBNYXAoKVxuICAgICAgICAgICAgZXhwb3J0TGlzdC5zZXQodmFsdWUsIGV4cG9ydHMpXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHR5cGVvZiBjdXJyZW50RXhwb3J0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY3VycmVudEV4cG9ydC53aGVyZVVzZWQuYWRkKGZpbGUpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IHdoZXJlVXNlZCA9IG5ldyBTZXQoKVxuICAgICAgICAgICAgd2hlcmVVc2VkLmFkZChmaWxlKVxuICAgICAgICAgICAgZXhwb3J0cy5zZXQoSU1QT1JUX0RFRkFVTFRfU1BFQ0lGSUVSLCB7IHdoZXJlVXNlZCB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgb2xkRGVmYXVsdEltcG9ydHMuZm9yRWFjaCh2YWx1ZSA9PiB7XG4gICAgICAgIGlmICghbmV3RGVmYXVsdEltcG9ydHMuaGFzKHZhbHVlKSkge1xuICAgICAgICAgIGNvbnN0IGltcG9ydHMgPSBvbGRJbXBvcnRQYXRocy5nZXQodmFsdWUpXG4gICAgICAgICAgaW1wb3J0cy5kZWxldGUoSU1QT1JUX0RFRkFVTFRfU1BFQ0lGSUVSKVxuXG4gICAgICAgICAgY29uc3QgZXhwb3J0cyA9IGV4cG9ydExpc3QuZ2V0KHZhbHVlKVxuICAgICAgICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRFeHBvcnQgPSBleHBvcnRzLmdldChJTVBPUlRfREVGQVVMVF9TUEVDSUZJRVIpXG4gICAgICAgICAgICBpZiAodHlwZW9mIGN1cnJlbnRFeHBvcnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIGN1cnJlbnRFeHBvcnQud2hlcmVVc2VkLmRlbGV0ZShmaWxlKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgbmV3TmFtZXNwYWNlSW1wb3J0cy5mb3JFYWNoKHZhbHVlID0+IHtcbiAgICAgICAgaWYgKCFvbGROYW1lc3BhY2VJbXBvcnRzLmhhcyh2YWx1ZSkpIHtcbiAgICAgICAgICBsZXQgaW1wb3J0cyA9IG9sZEltcG9ydFBhdGhzLmdldCh2YWx1ZSlcbiAgICAgICAgICBpZiAodHlwZW9mIGltcG9ydHMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBpbXBvcnRzID0gbmV3IFNldCgpXG4gICAgICAgICAgfVxuICAgICAgICAgIGltcG9ydHMuYWRkKElNUE9SVF9OQU1FU1BBQ0VfU1BFQ0lGSUVSKVxuICAgICAgICAgIG9sZEltcG9ydFBhdGhzLnNldCh2YWx1ZSwgaW1wb3J0cylcblxuICAgICAgICAgIGxldCBleHBvcnRzID0gZXhwb3J0TGlzdC5nZXQodmFsdWUpXG4gICAgICAgICAgbGV0IGN1cnJlbnRFeHBvcnRcbiAgICAgICAgICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjdXJyZW50RXhwb3J0ID0gZXhwb3J0cy5nZXQoSU1QT1JUX05BTUVTUEFDRV9TUEVDSUZJRVIpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGV4cG9ydHMgPSBuZXcgTWFwKClcbiAgICAgICAgICAgIGV4cG9ydExpc3Quc2V0KHZhbHVlLCBleHBvcnRzKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh0eXBlb2YgY3VycmVudEV4cG9ydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGN1cnJlbnRFeHBvcnQud2hlcmVVc2VkLmFkZChmaWxlKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB3aGVyZVVzZWQgPSBuZXcgU2V0KClcbiAgICAgICAgICAgIHdoZXJlVXNlZC5hZGQoZmlsZSlcbiAgICAgICAgICAgIGV4cG9ydHMuc2V0KElNUE9SVF9OQU1FU1BBQ0VfU1BFQ0lGSUVSLCB7IHdoZXJlVXNlZCB9KVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgb2xkTmFtZXNwYWNlSW1wb3J0cy5mb3JFYWNoKHZhbHVlID0+IHtcbiAgICAgICAgaWYgKCFuZXdOYW1lc3BhY2VJbXBvcnRzLmhhcyh2YWx1ZSkpIHtcbiAgICAgICAgICBjb25zdCBpbXBvcnRzID0gb2xkSW1wb3J0UGF0aHMuZ2V0KHZhbHVlKVxuICAgICAgICAgIGltcG9ydHMuZGVsZXRlKElNUE9SVF9OQU1FU1BBQ0VfU1BFQ0lGSUVSKVxuXG4gICAgICAgICAgY29uc3QgZXhwb3J0cyA9IGV4cG9ydExpc3QuZ2V0KHZhbHVlKVxuICAgICAgICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRFeHBvcnQgPSBleHBvcnRzLmdldChJTVBPUlRfTkFNRVNQQUNFX1NQRUNJRklFUilcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY3VycmVudEV4cG9ydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgY3VycmVudEV4cG9ydC53aGVyZVVzZWQuZGVsZXRlKGZpbGUpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICBuZXdJbXBvcnRzLmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgICAgaWYgKCFvbGRJbXBvcnRzLmhhcyhrZXkpKSB7XG4gICAgICAgICAgbGV0IGltcG9ydHMgPSBvbGRJbXBvcnRQYXRocy5nZXQodmFsdWUpXG4gICAgICAgICAgaWYgKHR5cGVvZiBpbXBvcnRzID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgaW1wb3J0cyA9IG5ldyBTZXQoKVxuICAgICAgICAgIH1cbiAgICAgICAgICBpbXBvcnRzLmFkZChrZXkpXG4gICAgICAgICAgb2xkSW1wb3J0UGF0aHMuc2V0KHZhbHVlLCBpbXBvcnRzKVxuXG4gICAgICAgICAgbGV0IGV4cG9ydHMgPSBleHBvcnRMaXN0LmdldCh2YWx1ZSlcbiAgICAgICAgICBsZXQgY3VycmVudEV4cG9ydFxuICAgICAgICAgIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGN1cnJlbnRFeHBvcnQgPSBleHBvcnRzLmdldChrZXkpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGV4cG9ydHMgPSBuZXcgTWFwKClcbiAgICAgICAgICAgIGV4cG9ydExpc3Quc2V0KHZhbHVlLCBleHBvcnRzKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICh0eXBlb2YgY3VycmVudEV4cG9ydCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGN1cnJlbnRFeHBvcnQud2hlcmVVc2VkLmFkZChmaWxlKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCB3aGVyZVVzZWQgPSBuZXcgU2V0KClcbiAgICAgICAgICAgIHdoZXJlVXNlZC5hZGQoZmlsZSlcbiAgICAgICAgICAgIGV4cG9ydHMuc2V0KGtleSwgeyB3aGVyZVVzZWQgfSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIG9sZEltcG9ydHMuZm9yRWFjaCgodmFsdWUsIGtleSkgPT4ge1xuICAgICAgICBpZiAoIW5ld0ltcG9ydHMuaGFzKGtleSkpIHtcbiAgICAgICAgICBjb25zdCBpbXBvcnRzID0gb2xkSW1wb3J0UGF0aHMuZ2V0KHZhbHVlKVxuICAgICAgICAgIGltcG9ydHMuZGVsZXRlKGtleSlcblxuICAgICAgICAgIGNvbnN0IGV4cG9ydHMgPSBleHBvcnRMaXN0LmdldCh2YWx1ZSlcbiAgICAgICAgICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RXhwb3J0ID0gZXhwb3J0cy5nZXQoa2V5KVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjdXJyZW50RXhwb3J0ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICBjdXJyZW50RXhwb3J0LndoZXJlVXNlZC5kZWxldGUoZmlsZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICdQcm9ncmFtOmV4aXQnOiBub2RlID0+IHtcbiAgICAgICAgdXBkYXRlRXhwb3J0VXNhZ2Uobm9kZSlcbiAgICAgICAgdXBkYXRlSW1wb3J0VXNhZ2Uobm9kZSlcbiAgICAgICAgY2hlY2tFeHBvcnRQcmVzZW5jZShub2RlKVxuICAgICAgfSxcbiAgICAgICdFeHBvcnREZWZhdWx0RGVjbGFyYXRpb24nOiBub2RlID0+IHtcbiAgICAgICAgY2hlY2tVc2FnZShub2RlLCBJTVBPUlRfREVGQVVMVF9TUEVDSUZJRVIpXG4gICAgICB9LFxuICAgICAgJ0V4cG9ydE5hbWVkRGVjbGFyYXRpb24nOiBub2RlID0+IHtcbiAgICAgICAgbm9kZS5zcGVjaWZpZXJzLmZvckVhY2goc3BlY2lmaWVyID0+IHtcbiAgICAgICAgICAgIGNoZWNrVXNhZ2Uobm9kZSwgc3BlY2lmaWVyLmV4cG9ydGVkLm5hbWUpXG4gICAgICAgIH0pXG4gICAgICAgIGlmIChub2RlLmRlY2xhcmF0aW9uKSB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgbm9kZS5kZWNsYXJhdGlvbi50eXBlID09PSBGVU5DVElPTl9ERUNMQVJBVElPTiB8fFxuICAgICAgICAgICAgbm9kZS5kZWNsYXJhdGlvbi50eXBlID09PSBDTEFTU19ERUNMQVJBVElPTlxuICAgICAgICAgICkge1xuICAgICAgICAgICAgY2hlY2tVc2FnZShub2RlLCBub2RlLmRlY2xhcmF0aW9uLmlkLm5hbWUpXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChub2RlLmRlY2xhcmF0aW9uLnR5cGUgPT09IFZBUklBQkxFX0RFQ0xBUkFUSU9OKSB7XG4gICAgICAgICAgICBub2RlLmRlY2xhcmF0aW9uLmRlY2xhcmF0aW9ucy5mb3JFYWNoKGRlY2xhcmF0aW9uID0+IHtcbiAgICAgICAgICAgICAgY2hlY2tVc2FnZShub2RlLCBkZWNsYXJhdGlvbi5pZC5uYW1lKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfVxuICB9LFxufVxuIl19