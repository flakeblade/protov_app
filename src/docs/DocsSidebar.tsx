import { Divider, NavLink, Stack, Text } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { getDocPath, getDocsByCategory } from './docsConfig'
import { useDocSlug } from './useDocSlug'

interface DocsSidebarProps {
  onItemClick?: () => void
}

export function DocsSidebar({ onItemClick }: DocsSidebarProps) {
  const navigate = useNavigate()
  const currentSlug = useDocSlug()
  const groupedDocs = getDocsByCategory()

  return (
    <Stack gap="xs">
      {groupedDocs.map((group, index) => (
        <Stack key={group.category} gap={4}>
          {index > 0 && <Divider my="xs" />}
          <Text size="xs" tt="uppercase" fw={600} c="dimmed" px="sm">
            {group.category}
          </Text>
          {group.docs.map((doc) => (
            <NavLink
              key={doc.slug}
              label={doc.title}
              active={currentSlug === doc.slug}
              variant="light"
              onClick={() => {
                navigate(getDocPath(doc.slug))
                onItemClick?.()
              }}
            />
          ))}
        </Stack>
      ))}
    </Stack>
  )
}
