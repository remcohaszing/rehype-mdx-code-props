import { Parser } from 'acorn'
import jsx from 'acorn-jsx'
import {
  type ExpressionStatement,
  type JSXAttribute,
  type JSXElement,
  type JSXSpreadAttribute,
  type Program
} from 'estree-jsx'
import { type Root } from 'hast'
import { toEstree } from 'hast-util-to-estree'
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

type JSXAttributes = (JSXAttribute | JSXSpreadAttribute)[]

const parser = Parser.extend(jsx())

/**
 * Get the JSX attributes for an estree program containing just a single JSX element.
 *
 * @param program
 *   The estree program
 * @returns
 *   The JSX attributes of the JSX element.
 */
function getOpeningAttributes(program: Program): JSXAttributes {
  const { expression } = program.body[0] as ExpressionStatement
  const { openingElement } = expression as JSXElement
  return openingElement.attributes
}

/**
 * Convert code meta to JSX elements.
 *
 * @param meta
 *   The meta to conert
 * @returns
 *   A list of MDX JSX attributes.
 */
function parseMeta(meta: string): JSXAttributes {
  const program = parser.parse(`<c ${meta} />`, {
    ecmaVersion: 'latest'
  }) as Program
  return getOpeningAttributes(program)
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

      const estree = toEstree(child)
      getOpeningAttributes(estree).push(...parseMeta(meta))

      parent.children[parent.children.indexOf(child)] = {
        type: 'mdxFlowExpression',
        value: '',
        data: { estree }
      }
    })
  }
}

export default rehypeMdxCodeProps
