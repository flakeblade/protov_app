import { lazy, Suspense, useMemo } from 'react'
import { Container } from '@mantine/core'
import { docModules } from './docModules'
import { DocLoadingSkeleton } from './DocLoadingSkeleton'
import { DocsMdxProvider } from './MdxProvider'

interface DocViewerProps {
  slug: string
}

export function DocViewer({ slug }: DocViewerProps) {
  const DocContent = useMemo(() => lazy(docModules[slug]), [slug])

  return (
    <Suspense key={slug} fallback={<DocLoadingSkeleton />}>
      <Container size="md" py="xl">
        <DocsMdxProvider>
          <DocContent />
        </DocsMdxProvider>
      </Container>
    </Suspense>
  )
}
