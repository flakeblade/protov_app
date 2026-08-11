import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from 'react'
import { isValidElement } from 'react'
import { Link } from 'react-router-dom'
import { Anchor, Blockquote, Code, Text, Title, TypographyStylesProvider } from '@mantine/core'
import {
  CodeHighlight,
  CodeHighlightAdapterProvider,
  createHighlightJsAdapter,
} from '@mantine/code-highlight'
import hljs from 'highlight.js'
import '@mantine/code-highlight/styles.css'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkAlert } from 'remark-github-blockquote-alert'

import type { DocConfigEntry, DocsBundleManifest } from './docsConfig'
import { buildSourceFileSlugMap } from './docsConfig'
import classes from './docsContent.module.css'
import './markdownAlerts.css'
import { resolveMarkdownHref, resolveMarkdownImageSrc } from './markdownLinks'

const highlightJsAdapter = createHighlightJsAdapter(hljs)

function MarkdownPre({ children }: { children?: ReactNode }) {
  if (!isValidElement(children)) {
    return <pre className={classes.codeBlock}>{children}</pre>
  }

  const codeChild = children as ReactElement<{
    className?: string
    children?: ReactNode
  }>
  const className = codeChild.props.className ?? ''
  const language = className.replace('language-', '') || 'text'
  const code = String(codeChild.props.children ?? '').replace(/\n$/, '')

  return (
    <div className={classes.codeBlock}>
      <CodeHighlight code={code} language={language} />
    </div>
  )
}

export function createMarkdownComponents(options: {
  docs: readonly DocConfigEntry[]
  manifest: DocsBundleManifest
}) {
  const sourceFileSlugMap = buildSourceFileSlugMap(options.docs)
  const { manifest } = options

  const resolveHref = (href?: string) =>
    resolveMarkdownHref(href, sourceFileSlugMap, manifest.sourceCommit, manifest.sourceRepo)

  return {
    h1: (props: ComponentPropsWithoutRef<'h1'>) => (
      <Title order={1} className={classes.h1} {...props} />
    ),
    h2: (props: ComponentPropsWithoutRef<'h2'>) => (
      <Title order={2} className={classes.h2} {...props} />
    ),
    h3: (props: ComponentPropsWithoutRef<'h3'>) => (
      <Title order={3} className={classes.h3} {...props} />
    ),
    h4: (props: ComponentPropsWithoutRef<'h4'>) => (
      <Title order={4} className={classes.h4} {...props} />
    ),
    p: ({ className, children, ...props }: ComponentPropsWithoutRef<'p'>) => {
      if (className?.includes('markdown-alert-title')) {
        return (
          <p className={className} {...props}>
            {children}
          </p>
        )
      }
      return (
        <Text component="p" className={classes.paragraph} {...props}>
          {children}
        </Text>
      )
    },
    hr: () => <hr className={classes.hr} />,
    ul: (props: ComponentPropsWithoutRef<'ul'>) => (
      <ul className={classes.list} {...props} />
    ),
    ol: (props: ComponentPropsWithoutRef<'ol'>) => (
      <ol className={classes.orderedList} {...props} />
    ),
    li: (props: ComponentPropsWithoutRef<'li'>) => (
      <li className={classes.listItem} {...props} />
    ),
    strong: (props: ComponentPropsWithoutRef<'strong'>) => <strong {...props} />,
    em: (props: ComponentPropsWithoutRef<'em'>) => <em {...props} />,
    code: (props: ComponentPropsWithoutRef<'code'>) => {
      if (props.className) {
        return <code {...props} />
      }
      return <Code {...props} />
    },
    pre: MarkdownPre,
    blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
      <Blockquote className={classes.paragraph} {...props} />
    ),
    a: ({ href, children, ...props }: ComponentPropsWithoutRef<'a'>) => {
      const resolved = resolveHref(href)
      if (!resolved) {
        return <Anchor {...props}>{children}</Anchor>
      }
      if (resolved.startsWith('/')) {
        return (
          <Anchor component={Link} to={resolved} {...props}>
            {children}
          </Anchor>
        )
      }
      return (
        <Anchor href={resolved} target="_blank" rel="noreferrer" {...props}>
          {children}
        </Anchor>
      )
    },
    img: ({ src, alt, ...props }: ComponentPropsWithoutRef<'img'>) => (
      <img
        src={resolveMarkdownImageSrc(src)}
        alt={alt}
        className={classes.image}
        {...props}
      />
    ),
    table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
      <div className={classes.tableWrap}>
        <table className={classes.table} {...props}>
          {children}
        </table>
      </div>
    ),
    thead: (props: ComponentPropsWithoutRef<'thead'>) => <thead className={classes.tableHead} {...props} />,
    tbody: (props: ComponentPropsWithoutRef<'tbody'>) => <tbody {...props} />,
    tr: (props: ComponentPropsWithoutRef<'tr'>) => <tr className={classes.tableRow} {...props} />,
    th: (props: ComponentPropsWithoutRef<'th'>) => (
      <th className={classes.tableHeader} {...props} />
    ),
    td: (props: ComponentPropsWithoutRef<'td'>) => (
      <td className={classes.tableCell} {...props} />
    ),
  }
}

interface MarkdownRendererProps {
  markdown: string
  docs: readonly DocConfigEntry[]
  manifest: DocsBundleManifest
}

export function MarkdownRenderer({ markdown, docs, manifest }: MarkdownRendererProps) {
  const components = createMarkdownComponents({ docs, manifest })

  return (
    <CodeHighlightAdapterProvider adapter={highlightJsAdapter}>
      <TypographyStylesProvider>
        <article className={classes.article}>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkAlert]} components={components}>
            {markdown}
          </ReactMarkdown>
        </article>
      </TypographyStylesProvider>
    </CodeHighlightAdapterProvider>
  )
}
