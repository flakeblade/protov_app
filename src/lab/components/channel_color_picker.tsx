import { useState } from 'react'
import { ActionIcon, ColorSwatch, Popover, SimpleGrid } from '@mantine/core'
import { useMantineTheme } from '@mantine/core'
import { IconPalette } from '@tabler/icons-react'

import { CHANNEL_COLORS, type ChannelColor } from '../devices/channel-colors'

interface ChannelColorPickerProps {
  color: ChannelColor
  onChange: (color: ChannelColor) => void
}

export function ChannelColorPicker({ color, onChange }: ChannelColorPickerProps) {
  const theme = useMantineTheme()
  const [opened, setOpened] = useState(false)

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label="Adjust channel color"
          onClick={() => setOpened((value) => !value)}
        >
          <IconPalette size={16} stroke={1.5} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <SimpleGrid cols={4} spacing="xs">
          {CHANNEL_COLORS.map((swatchColor) => (
            <ColorSwatch
              key={swatchColor}
              color={theme.colors[swatchColor][6]}
              aria-label={swatchColor}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                onChange(swatchColor)
                setOpened(false)
              }}
              data-selected={swatchColor === color || undefined}
            />
          ))}
        </SimpleGrid>
      </Popover.Dropdown>
    </Popover>
  )
}
