import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react'
import { isValidElement } from 'react'
import { MDXProvider } from '@mdx-js/react'
import {
  Anchor,
  Blockquote,
  Code,
  Text,
  Title,
  TypographyStylesProvider,
} from '@mantine/core'
import {
  CodeHighlight,
  CodeHighlightAdapterProvider,
  createHighlightJsAdapter,
} from '@mantine/code-highlight'
import hljs from 'highlight.js'
import '@mantine/code-highlight/styles.css'

const highlightJsAdapter = createHighlightJsAdapter(hljs)

function MdxPre({ children }: { children?: ReactNode }) {
  if (!isValidElement(children)) {
    return <pre>{children}</pre>
  }

  const codeChild = children as ReactElement<{
    className?: string
    children?: ReactNode
  }>
  const className = codeChild.props.className ?? ''
  const language = className.replace('language-', '') || 'text'
  const code = String(codeChild.props.children ?? '').replace(/\n$/, '')

  return <CodeHighlight code={code} language={language} />
}

const mdxComponents = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => <Title order={1} {...props} />,
  h2: (props: ComponentPropsWithoutRef<'h2'>) => <Title order={2} {...props} />,
  h3: (props: ComponentPropsWithoutRef<'h3'>) => <Title order={3} {...props} />,
  p: (props: ComponentPropsWithoutRef<'p'>) => <Text {...props} />,
  a: (props: ComponentPropsWithoutRef<'a'>) => <Anchor {...props} />,
  code: (props: ComponentPropsWithoutRef<'code'>) => {
    if (props.className) {
      return <code {...props} />
    }

    return <Code {...props} />
  },
  pre: MdxPre,
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <Blockquote {...props} />
  ),
}

interface DocsMdxProviderProps {
  children: ReactNode
}

export function DocsMdxProvider({ children }: DocsMdxProviderProps) {
  return (
    <CodeHighlightAdapterProvider adapter={highlightJsAdapter}>
      <MDXProvider components={mdxComponents}>
        <TypographyStylesProvider>{children}</TypographyStylesProvider>
      </MDXProvider>
    </CodeHighlightAdapterProvider>
  )
}
