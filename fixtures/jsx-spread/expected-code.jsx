/*@jsxRuntime automatic @jsxImportSource react*/
function _createMdxContent(props) {
  const _components = Object.assign(
    {
      pre: 'pre',
      code: 'code'
    },
    props.components
  )
  return (
    <_components.pre>
      {
        <_components.code className="language-js" {...props}>
          {"console.log('Hello World!')\n"}
        </_components.code>
      }
    </_components.pre>
  )
}
function MDXContent(props = {}) {
  const { wrapper: MDXLayout } = props.components || {}
  return MDXLayout ? (
    <MDXLayout {...props}>
      <_createMdxContent {...props} />
    </MDXLayout>
  ) : (
    _createMdxContent(props)
  )
}
export default MDXContent
