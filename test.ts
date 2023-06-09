import assert from 'node:assert/strict'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { compile } from '@mdx-js/mdx'
import { type Root } from 'hast'
import prettier from 'prettier'
import { read } from 'to-vfile'

import rehypeMdxCodeProps from './index.js'

const fixturesDir = new URL('fixtures/', import.meta.url)

for (const name of await readdir(fixturesDir)) {
  const testFixture = async (tagName: 'code' | 'pre'): Promise<void> => {
    const path = new URL(`${name}/`, fixturesDir)
    const input = await read(new URL('input.md', path))
    const expected = new URL(`expected-${tagName}.jsx`, path)
    const filepath = fileURLToPath(expected)
    const prettierConfig = await prettier.resolveConfig(filepath, { editorconfig: true })

    const result = await compile(input, {
      jsx: true,
      rehypePlugins: [[rehypeMdxCodeProps, { tagName }]]
    })
    const formatted = prettier.format(String(result), { ...prettierConfig, filepath })
    if (process.argv.includes('update')) {
      await writeFile(expected, formatted)
    }
    assert.equal(String(formatted), await readFile(expected, 'utf8'))
  }

  test(`${name} code`, () => testFixture('code'))

  test(`${name} pre`, () => testFixture('pre'))
}

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
    '/*@jsxRuntime automatic @jsxImportSource react*/\n' +
      'function _createMdxContent(props) {\n' +
      '  const _components = Object.assign({\n' +
      '    code: "code"\n' +
      '  }, props.components);\n' +
      '  return <_components.code />;\n' +
      '}\n' +
      'function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n' +
      'export default MDXContent;\n'
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
    '/*@jsxRuntime automatic @jsxImportSource react*/\n' +
      'function _createMdxContent(props) {\n' +
      '  const _components = Object.assign({\n' +
      '    code: "code"\n' +
      '  }, props.components);\n' +
      '  return <_components.code />;\n' +
      '}\n' +
      'function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n' +
      'export default MDXContent;\n'
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
          children: [
            {
              type: 'element',
              tagName: 'code',
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
    '/*@jsxRuntime automatic @jsxImportSource react*/\n' +
      'function _createMdxContent(props) {\n' +
      '  const _components = Object.assign({\n' +
      '    div: "div",\n' +
      '    code: "code"\n' +
      '  }, props.components);\n' +
      '  return <_components.div><_components.code /></_components.div>;\n' +
      '}\n' +
      'function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n' +
      'export default MDXContent;\n'
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
          children: [
            {
              type: 'element',
              tagName: 'code',
              data: { meta: 'meta' },
              children: []
            },
            {
              type: 'element',
              tagName: 'code',
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
    '/*@jsxRuntime automatic @jsxImportSource react*/\n' +
      'function _createMdxContent(props) {\n' +
      '  const _components = Object.assign({\n' +
      '    pre: "pre",\n' +
      '    code: "code"\n' +
      '  }, props.components);\n' +
      '  return <_components.pre><_components.code /><_components.code /></_components.pre>;\n' +
      '}\n' +
      'function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n' +
      'export default MDXContent;\n'
  )
})
