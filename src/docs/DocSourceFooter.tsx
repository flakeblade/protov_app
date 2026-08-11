import { Anchor, Group, Text } from '@mantine/core'

import type { DocConfigEntry, DocsBundleManifest } from './docsConfig'
import { getGitHubSourceUrl } from './docsConfig'
import classes from './docsContent.module.css'

interface DocSourceFooterProps {
  doc: DocConfigEntry
  manifest: DocsBundleManifest
}

export function DocSourceFooter({ doc, manifest }: DocSourceFooterProps) {
  const sourceUrl = getGitHubSourceUrl(manifest, doc.sourceFile)
  const shortCommit = manifest.sourceCommit.slice(0, 7)

  return (
    <Group className={classes.sourceFooter} gap="sm">
      <Anchor href={sourceUrl} target="_blank" rel="noreferrer" size="sm">
        View source on GitHub
      </Anchor>
      <Text size="xs" c="dimmed">
        {shortCommit} on {manifest.sourceRef}
      </Text>
    </Group>
  )
}
