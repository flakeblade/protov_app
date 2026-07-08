import { Collapse, UnstyledButton } from '@mantine/core'
import { IconChevronDown } from '@tabler/icons-react'
import clsx from 'clsx'
import type { ReactNode } from 'react'

import classes from '../../firmware_update_modal.module.css'

export function Disclosure({
  label,
  opened,
  onToggle,
  children,
}: {
  label: string
  opened: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className={classes.disclosure}>
      <UnstyledButton className={classes.disclosureTrigger} onClick={onToggle}>
        <span>{label}</span>
        <IconChevronDown
          size={16}
          className={clsx(classes.disclosureChevron, opened && classes.disclosureChevronOpen)}
        />
      </UnstyledButton>
      <Collapse in={opened}>
        <div className={classes.disclosureBody}>{children}</div>
      </Collapse>
    </div>
  )
}
