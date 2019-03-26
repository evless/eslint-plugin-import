import docsUrl from '../docsUrl'

const ERROR_MESSAGE = 'Expected "require()" instead of "import"'

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    docs: {
      url: docsUrl('no-commonjs'),
    },
  },

  create: function (context) {
    return {
      ImportDeclaration: function(node) {
        if (context.getScope().type !== 'module') return

        context.report({
          node,
          message: ERROR_MESSAGE,
        })
      },
    }

  },
}
