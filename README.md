# rehype-mdx-code-props

[![github actions](https://github.com/remcohaszing/rehype-mdx-code-props/actions/workflows/ci.yaml/badge.svg)](https://github.com/remcohaszing/rehype-mdx-code-props/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/remcohaszing/rehype-mdx-code-props/branch/main/graph/badge.svg)](https://codecov.io/gh/remcohaszing/rehype-mdx-code-props)
[![npm version](https://img.shields.io/npm/v/rehype-mdx-code-props)](https://www.npmjs.com/package/rehype-mdx-code-props)
[![npm downloads](https://img.shields.io/npm/dm/rehype-mdx-code-props)](https://www.npmjs.com/package/rehype-mdx-code-props)

A [rehype](https://github.com/rehypejs/rehype) [MDX](https://mdxjs.com) plugin for interpreting
markdown code meta as props.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - [`rehypeMdxCodeProps`](#rehypemdxcodeprops)
    - [Options](#options)
- [Compatibility](#compatibility)
- [License](#license)

## Installation

```sh
npm install rehype-mdx-code-props
```

## Usage

This plugin interprets markdown code block metadata as JSX props.

For example, given a file named `example.mdx` with the following content:

````markdown
```js copy filename="awesome.js" onOpen={props.openDemo} {...props}
console.log('Everything is awesome!')
```
````

The following script:

```js
import { readFile } from 'node:fs/promises'

import { compile } from '@mdx-js/mdx'
import rehypeMdxCodeProps from 'rehype-mdx-code-props'

const { value } = await compile(await readFile('example.mdx'), {
  jsx: true,
  rehypePlugins: [rehypeMdxCodeProps]
})
console.log(value)
```

Roughly yields:

```jsx
export default function MDXContent(props) {
  return (
    <pre copy filename="awesome.js" onOpen={props.openDemo} {...props}>
      <code className="language-js">{"console.log('Everything is awesome!');\n"}</code>
    </pre>
  )
}
```

The `<pre />` element doesn’t support those custom props. Use custom
[components](https://mdxjs.com/docs/using-mdx/#components) to give the props meaning.

> **Note** This plugin transforms the [`hast`](https://github.com/syntax-tree/hast) (HTML) nodes
> into JSX. After running this plugin, they can no longer be processed by other plugins. To combine
> it with other plugins, such as syntax highlighting plugins, `rehype-mdx-code-props` must run last.

## API

This package has a default export `rehypeMdxCodeProps`.

### `rehypeMdxCodeProps`

An MDX rehype plugin for transforming markdown code meta into JSX props.

#### Options

- `tagName` (`'code' | 'pre'`): The tag name to add the attributes to. (Default: `'pre'`)

## Compatibility

This plugin works with Node.js 16 or greater and MDX 3.

## License

[MIT](LICENSE.md) © [Remco Haszing](https://github.com/remcohaszing)
