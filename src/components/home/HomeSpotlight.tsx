import { useMemo, useState } from 'react'
import { Badge, useComputedColorScheme, useMantineColorScheme } from '@mantine/core'
import { Spotlight, spotlight } from '@mantine/spotlight'
import {
  IconBook,
  IconFlask,
  IconHome,
  IconMoon,
  IconSearch,
  IconSun,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useDocsSpotlight } from '../../docs/useDocsSpotlight.tsx'
import {
  buildHomeSpotlightEntries,
  docTypeBadgeColor,
  type HomeSpotlightEntry,
} from './homeSpotlightEntries'
import { filterSpotlightEntries } from './homeSpotlightFilter'

const ICON_SIZE = 22

function SpotlightActionItem({ entry }: { entry: HomeSpotlightEntry }) {
  return (
    <Spotlight.Action
      label={entry.label}
      description={entry.description}
      leftSection={entry.icon}
      rightSection={
        <Badge
          variant="light"
          color={docTypeBadgeColor(entry.docType)}
          size="sm"
          radius="sm"
        >
          {entry.docType}
        </Badge>
      }
      onClick={entry.onClick}
    />
  )
}

export function HomeSpotlight() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const { setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light', {
    getInitialValueInEffect: true,
  })
  const docsSpotlightGroups = useDocsSpotlight()

  const appEntries = useMemo(
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
        },
      }),
    [navigate, computedColorScheme, setColorScheme],
  )

  const docEntries = useMemo(
    () => docsSpotlightGroups.flatMap((group) => group.actions),
    [docsSpotlightGroups],
  )

  const filteredEntries = useMemo(
    () => filterSpotlightEntries(query, [...appEntries, ...docEntries]),
    [query, appEntries, docEntries],
  )

  const isFiltering = query.trim().length > 0

  return (
    <Spotlight.Root query={query} onQueryChange={setQuery} scrollable maxHeight={380}>
      <Spotlight.Search
        placeholder="Search docs and shortcuts..."
        leftSection={<IconSearch size={18} stroke={1.6} />}
      />
      <Spotlight.ActionsList>
        {isFiltering ? (
          filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <SpotlightActionItem key={entry.id} entry={entry} />
            ))
          ) : (
            <Spotlight.Empty>Nothing found...</Spotlight.Empty>
          )
        ) : (
          <>
            <Spotlight.ActionsGroup label="Shortcuts">
              {appEntries.map((entry) => (
                <SpotlightActionItem key={entry.id} entry={entry} />
              ))}
            </Spotlight.ActionsGroup>
            {docsSpotlightGroups.map((group) => (
              <Spotlight.ActionsGroup key={group.group} label={group.group}>
                {group.actions.map((entry) => (
                  <SpotlightActionItem key={entry.id} entry={entry} />
                ))}
              </Spotlight.ActionsGroup>
            ))}
          </>
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  )
}
