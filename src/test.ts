import assert from 'node:assert/strict'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { compile } from '@mdx-js/mdx'
import { type Root } from 'hast'
import prettier from 'prettier'
import rehypeMdxCodeProps from 'rehype-mdx-code-props'
import { read } from 'to-vfile'
import { visitParents } from 'unist-util-visit-parents'

const fixturesDir = new URL('../fixtures/', import.meta.url)

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
    const formatted = await prettier.format(String(result), { ...prettierConfig, filepath })
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

test('boolean properties true', async () => {
  const { value } = await compile('```js prop={prop}\n```\n', {
    jsx: true,
    rehypePlugins: [
      () => (ast: Root) => {
        visitParents(ast, { type: 'element', tagName: 'pre' }, (element) => {
          element.properties.hidden = true
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
      '  return <_components.pre hidden prop={prop}><_components.code className="language-js" /></_components.pre>;\n' +
      '}\n' +
      'export default function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n'
  )
})

test('boolean properties false', async () => {
  const { value } = await compile('```js prop={prop}\n```\n', {
    jsx: true,
    rehypePlugins: [
      () => (ast: Root) => {
        visitParents(ast, { type: 'element', tagName: 'pre' }, (element) => {
          element.properties.hidden = false
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
      '  return <_components.pre prop={prop}><_components.code className="language-js" /></_components.pre>;\n' +
      '}\n' +
      'export default function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n'
  )
})

test('boolean properties empty', async () => {
  const { value } = await compile('```js prop={prop}\n```\n', {
    jsx: true,
    rehypePlugins: [
      () => (ast: Root) => {
        visitParents(ast, { type: 'element', tagName: 'pre' }, (element) => {
          element.properties.hidden = ''
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
      '  return <_components.pre prop={prop}><_components.code className="language-js" /></_components.pre>;\n' +
      '}\n' +
      'export default function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n'
  )
})

test('numeric properties', async () => {
  const { value } = await compile('```js prop={prop}\n```\n', {
    jsx: true,
    rehypePlugins: [
      () => (ast: Root) => {
        visitParents(ast, { type: 'element', tagName: 'pre' }, (element) => {
          element.properties.height = 42
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
      '  return <_components.pre height="42" prop={prop}><_components.code className="language-js" /></_components.pre>;\n' +
      '}\n' +
      'export default function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n'
  )
})

test('comma separated properties', async () => {
  const { value } = await compile('```js prop={prop}\n```\n', {
    jsx: true,
    rehypePlugins: [
      () => (ast: Root) => {
        visitParents(ast, { type: 'element', tagName: 'pre' }, (element) => {
          element.properties.accept = ['a', 'b']
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
      '  return <_components.pre accept="a, b" prop={prop}><_components.code className="language-js" /></_components.pre>;\n' +
      '}\n' +
      'export default function MDXContent(props = {}) {\n' +
      '  const {wrapper: MDXLayout} = props.components || ({});\n' +
      '  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);\n' +
      '}\n'
  )
})
