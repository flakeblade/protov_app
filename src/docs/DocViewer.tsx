import { useEffect, useState } from 'react'
import { Alert, Container, Stack, Title } from '@mantine/core'

import { fetchDocMarkdown } from './docsApi'
import { DocLoadingSkeleton } from './DocLoadingSkeleton'
import { DocSourceFooter } from './DocSourceFooter'
import { MarkdownRenderer } from './MarkdownRenderer'
import { stripLeadingTitle } from './markdownLinks'
import { useDocsConfigContext } from './useDocsConfig'

interface DocViewerProps {
  slug: string
}

export function DocViewer({ slug }: DocViewerProps) {
  const { docs, manifest, loading: configLoading, error: configError } = useDocsConfigContext()
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const doc = docs.find((entry) => entry.slug === slug)

  useEffect(() => {
    if (configLoading || !doc || !manifest) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setMarkdown(null)

    void (async () => {
      try {
        const raw = await fetchDocMarkdown(doc.sourceFile)
        if (cancelled) return
        setMarkdown(stripLeadingTitle(raw, doc.title))
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [configLoading, doc, manifest, slug])

  if (configLoading || loading) {
    return (
      <Container size="md" py="xl">
        <DocLoadingSkeleton />
      </Container>
    )
  }

  if (configError || error || !doc || !manifest || markdown === null) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Unable to load documentation">
          {configError ?? error ?? 'Document not found'}
        </Alert>
      </Container>
    )
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="md">
        <Title order={1}>{doc.title}</Title>
        <MarkdownRenderer markdown={markdown} docs={docs} manifest={manifest} />
        <DocSourceFooter doc={doc} manifest={manifest} />
      </Stack>
    </Container>
  )
}
