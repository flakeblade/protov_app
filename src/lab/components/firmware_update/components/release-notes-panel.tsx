import { useState, type ReactNode } from 'react'
import { Anchor, Text, UnstyledButton } from '@mantine/core'
import { IconExternalLink } from '@tabler/icons-react'

import { parseInlineMarkdown, parseReleaseNotes } from '../../../firmware/release-notes'
import { NOTES_COLLAPSE_THRESHOLD } from '../constants'
import classes from '../../firmware_update_modal.module.css'

function renderInlineMarkdown(text: string): ReactNode {
  return parseInlineMarkdown(text).map((part, index) =>
    part.type === 'bold' ? (
      <Text span fw={600} key={index}>
        {part.value}
      </Text>
    ) : (
      part.value
    ),
  )
}

export function ReleaseNotesPanel({ body }: { body: string }) {
  const { items, changelogUrl } = parseReleaseNotes(body)
  const [expanded, setExpanded] = useState(items.length <= NOTES_COLLAPSE_THRESHOLD)
  const visibleItems = expanded ? items : items.slice(0, NOTES_COLLAPSE_THRESHOLD)
  const hasHiddenItems = items.length > NOTES_COLLAPSE_THRESHOLD

  if (items.length === 0 && !changelogUrl) {
    return <Text className={classes.mutedText}>No release notes for this build.</Text>
  }

  return (
    <>
      {items.length > 0 ? (
        <>
          <ul className={classes.notesList}>
            {visibleItems.map((note) => (
              <li key={note} className={classes.notesItem}>
                {renderInlineMarkdown(note)}
              </li>
            ))}
          </ul>
          {hasHiddenItems ? (
            <UnstyledButton
              className={classes.changelogLink}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Show fewer notes' : `Show ${items.length - NOTES_COLLAPSE_THRESHOLD} more`}
            </UnstyledButton>
          ) : null}
        </>
      ) : null}
      {changelogUrl ? (
        <Anchor
          href={changelogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={classes.changelogExternalLink}
        >
          See full changelog
          <IconExternalLink size={12} stroke={1.5} />
        </Anchor>
      ) : null}
    </>
  )
}
