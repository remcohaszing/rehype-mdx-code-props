import type { Root } from 'hast'

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { compile } from '@mdx-js/mdx'
import rehypeMdxCodeProps from 'rehype-mdx-code-props'
import { testFixturesDirectory } from 'snapshot-fixtures'

testFixturesDirectory({
  directory: new URL('../fixtures', import.meta.url),
  prettier: true,
  tests: {
    'expected-code.jsx'(file) {
      return compile(file, {
        jsx: true,
        rehypePlugins: [[rehypeMdxCodeProps, { tagName: 'code' }]]
      })
    },

    'expected-pre.jsx'(file) {
      return compile(file, {
        jsx: true,
        rehypePlugins: [rehypeMdxCodeProps]
      })
    }
  }
})

test('invalid tagName', () => {
  assert.throws(
    () => compile('', { rehypePlugins: [[rehypeMdxCodeProps, { tagName: 'invalid' }]] }),
    new Error("Expected tagName to be 'code' or 'pre', got: invalid")
  )
})

test('meta empty string', async () => {
  const { value } = await compile('', {
    jsx: true,
    rehypePlugins: [
      () => (ast) => {
        ast.children.push({
          type: 'element',
          tagName: 'code',
          data: { meta: '' },
          children: []
        })
      },
      [rehypeMdxCodeProps, { tagName: 'code' }]
    ]
  })

  assert.equal(
    value,
    '/*@jsxRuntime automatic*/\n' +
      '/*@jsxImportSource react*/\n' +
      'function _createMdxContent(props) {\n' +
      '  const _components = {\n' +
      '    code: "code",\n' +
      '    ...props.components\n' +
      '  };\n' +
      '  return <_components.code />;\n' +
      '}\n' +
      'export default function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n'
  )
})

test('code without parent', async () => {
  const { value } = await compile('', {
    jsx: true,
    rehypePlugins: [
      () => (ast) => {
        ast.children.push({
          type: 'element',
          tagName: 'code',
          data: { meta: 'meta' },
          children: []
        })
      },
      rehypeMdxCodeProps
    ]
  })

  assert.equal(
    value,
    '/*@jsxRuntime automatic*/\n' +
      '/*@jsxImportSource react*/\n' +
      'function _createMdxContent(props) {\n' +
      '  const _components = {\n' +
      '    code: "code",\n' +
      '    ...props.components\n' +
      '  };\n' +
      '  return <_components.code />;\n' +
      '}\n' +
      'export default function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n'
  )
})

test('code with non-pre parent', async () => {
  const { value } = await compile('', {
    jsx: true,
    rehypePlugins: [
      () => (ast: Root) => {
        ast.children.push({
          type: 'element',
          tagName: 'div',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {},
              data: { meta: 'meta' },
              children: []
            }
          ]
        })
      },
      rehypeMdxCodeProps
    ]
  })

  assert.equal(
    value,
    '/*@jsxRuntime automatic*/\n' +
      '/*@jsxImportSource react*/\n' +
      'function _createMdxContent(props) {\n' +
      '  const _components = {\n' +
      '    code: "code",\n' +
      '    div: "div",\n' +
      '    ...props.components\n' +
      '  };\n' +
      '  return <_components.div><_components.code /></_components.div>;\n' +
      '}\n' +
      'export default function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n'
  )
})

test('code with pre parent and siblings', async () => {
  const { value } = await compile('', {
    jsx: true,
    rehypePlugins: [
      () => (ast: Root) => {
        ast.children.push({
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {},
              data: { meta: 'meta' },
              children: []
            },
            {
              type: 'element',
              tagName: 'code',
              properties: {},
              children: []
            }
          ]
        })
      },
      rehypeMdxCodeProps
    ]
  })

  assert.equal(
    value,
    '/*@jsxRuntime automatic*/\n' +
      '/*@jsxImportSource react*/\n' +
      'function _createMdxContent(props) {\n' +
      '  const _components = {\n' +
      '    code: "code",\n' +
      '    pre: "pre",\n' +
      '    ...props.components\n' +
      '  };\n' +
      '  return <_components.pre><_components.code /><_components.code /></_components.pre>;\n' +
      '}\n' +
      'export default function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n'
  )
})
