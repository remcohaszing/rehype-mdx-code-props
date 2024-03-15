import { stringify as commas } from 'comma-separated-tokens'
import { type Root } from 'hast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { mdxFromMarkdown } from 'mdast-util-mdx'
import { type MdxJsxFlowElementHast } from 'mdast-util-mdx-jsx'
import { mdxjs } from 'micromark-extension-mdxjs'
import { find, hastToReact, html } from 'property-information'
import { stringify as spaces } from 'space-separated-tokens'
import { type Plugin } from 'unified'
import { visitParents } from 'unist-util-visit-parents'

/**
 * @internal
 */
declare module 'hast' {
  interface ElementData {
    /**
     * Code meta defined by the mdast.
     */
    meta?: string
  }
}

export interface RehypeMdxCodePropsOptions {
  /**
   * The tag name to add the attributes to.
   *
   * @default 'pre'
   */
  tagName?: 'code' | 'pre'
}

/**
 * An MDX rehype plugin for transforming markdown code meta into JSX props.
 */
const rehypeMdxCodeProps: Plugin<[RehypeMdxCodePropsOptions?], Root> = ({
  tagName = 'pre'
} = {}) => {
  if (tagName !== 'code' && tagName !== 'pre') {
    throw new Error(`Expected tagName to be 'code' or 'pre', got: ${tagName}`)
  }

  return (ast) => {
    visitParents(ast, 'element', (node, ancestors) => {
      if (node.tagName !== 'code') {
        return
      }

      const meta = node.data?.meta
      if (typeof meta !== 'string') {
        return
      }

      if (!meta) {
        return
      }

      let child = node
      let parent = ancestors.at(-1)!

      if (tagName === 'pre') {
        if (parent.type !== 'element') {
          return
        }

        if (parent.tagName !== 'pre') {
          return
        }

        if (parent.children.length !== 1) {
          return
        }

        child = parent
        parent = ancestors.at(-2)!
      }

      const replacement = fromMarkdown(`<${child.tagName} ${meta} />`, {
        extensions: [mdxjs()],
        mdastExtensions: [mdxFromMarkdown()]
      }).children[0] as MdxJsxFlowElementHast
      replacement.children = child.children
      replacement.data = child.data
      replacement.position = child.position

      // Processing attributes is strongly based on
      // https://github.com/syntax-tree/hast-util-to-estree/blob/3.1.0/lib/handlers/element.js
      for (let [name, value] of Object.entries(child.properties)) {
        const info = find(html, name)

        if (value == null || value === false || Number.isNaN(value) || (!value && info.boolean)) {
          continue
        }

        name = hastToReact[info.property] || info.property

        if (Array.isArray(value)) {
          value = info.commaSeparated ? commas(value) : spaces(value)
        } else if (typeof value === 'number') {
          value = String(value)
        }

        replacement.attributes.unshift({
          type: 'mdxJsxAttribute',
          name,
          value: value === true ? null : value
        })
      }

      parent.children[parent.children.indexOf(child)] = replacement
    })
  }
}

export default rehypeMdxCodeProps
