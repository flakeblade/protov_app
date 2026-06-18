import { useMemo, useState } from 'react'
import {
  Badge,
  Center,
  Group,
  Text,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core'
import { Spotlight, spotlight } from '@mantine/spotlight'
import {
  IconBook,
  IconFileText,
  IconFlask,
  IconHome,
  IconLifebuoy,
  IconMap,
  IconMoon,
  IconSearch,
  IconSun,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import {
  buildHomeSpotlightEntries,
  docTypeBadgeColor,
} from './homeSpotlightEntries'
import { filterSpotlightEntries } from './homeSpotlightFilter'

const ICON_SIZE = 22

export function HomeSpotlight() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  })

  const entries = useMemo(
    () =>
      buildHomeSpotlightEntries({
        navigate,
        toggleColorScheme: () =>
          setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light'),
        closeSpotlight: spotlight.close,
        icons: {
          lab: <IconFlask size={ICON_SIZE} stroke={1.6} />,
          docs: <IconBook size={ICON_SIZE} stroke={1.6} />,
          home: <IconHome size={ICON_SIZE} stroke={1.6} />,
          theme:
            computedColorScheme === 'dark' ? (
              <IconSun size={ICON_SIZE} stroke={1.6} />
            ) : (
              <IconMoon size={ICON_SIZE} stroke={1.6} />
            ),
          guide: <IconMap size={ICON_SIZE} stroke={1.6} />,
          reference: <IconFileText size={ICON_SIZE} stroke={1.6} />,
          troubleshooting: <IconLifebuoy size={ICON_SIZE} stroke={1.6} />,
        },
      }),
    [navigate, computedColorScheme, setColorScheme],
  )

  const filteredEntries = useMemo(
    () => filterSpotlightEntries(query, entries),
    [query, entries],
  )

  return (
    <Spotlight.Root query={query} onQueryChange={setQuery} scrollable maxHeight={380}>
      <Spotlight.Search
        placeholder="Search docs and shortcuts..."
        leftSection={<IconSearch size={18} stroke={1.6} />}
      />
      <Spotlight.ActionsList>
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <Spotlight.Action key={entry.id} onClick={entry.onClick}>
              <Group wrap="nowrap" justify="space-between" w="100%" gap="sm">
                <Group wrap="nowrap" gap="sm" style={{ flex: 1, minWidth: 0 }}>
                  <Center c="dimmed">{entry.icon}</Center>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>
                      {entry.label}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {entry.description}
                    </Text>
                  </div>
                </Group>
                <Badge
                  variant="light"
                  color={docTypeBadgeColor(entry.docType)}
                  size="sm"
                  radius="sm"
                  style={{ flexShrink: 0 }}
                >
                  {entry.docType}
                </Badge>
              </Group>
            </Spotlight.Action>
          ))
        ) : (
          <Spotlight.Empty>Nothing found...</Spotlight.Empty>
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  )
}
