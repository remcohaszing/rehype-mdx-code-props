/*@jsxRuntime automatic @jsxImportSource react*/
function _createMdxContent(props) {
  const _components = {
    code: 'code',
    pre: 'pre',
    ...props.components
  }
  return (
    <_components.pre>
      {
        <_components.code className="language-js" onClick={props.onClick}>
          {"console.log('Hello World!')\n"}
        </_components.code>
      }
    </_components.pre>
  )
}
export default function MDXContent(props = {}) {
  const { wrapper: MDXLayout } = props.components || {}
  return MDXLayout ? (
    <MDXLayout {...props}>
      <_createMdxContent {...props} />
    </MDXLayout>
  ) : (
    _createMdxContent(props)
  )
}
