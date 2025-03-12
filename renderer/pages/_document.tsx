import NextDocument, { Html, Head, Main, NextScript } from 'next/document'

export default class Document extends NextDocument {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta charSet="utf-8" />
          <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        </Head>
        <body style={{ width: '100vw', height: '100vh' }}>
          {/* Make Color mode to persists when you refresh the page. */}
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
