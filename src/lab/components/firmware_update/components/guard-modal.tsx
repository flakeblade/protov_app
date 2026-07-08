import { Button, Modal, Text } from '@mantine/core'

import type { CancelPrompt } from '../types'
import classes from '../../firmware_update_modal.module.css'

export function GuardModal({
  opened,
  prompt,
  onStay,
  onLeave,
}: {
  opened: boolean
  prompt: CancelPrompt
  onStay: () => void
  onLeave: () => void
}) {
  return (
    <Modal opened={opened} onClose={onStay} title={prompt.title} centered size="sm">
      <div className={classes.cancelBody}>
        <Text className={classes.bodyText}>{prompt.body}</Text>
        {prompt.warn ? (
          <div className={classes.callout}>
            <Text className={classes.bodyText}>
              Prefer waiting until the progress bar completes. Interrupting mid-flash can leave the
              device unresponsive.
            </Text>
          </div>
        ) : null}

        <div className={classes.cancelActions}>
          <Button variant="subtle" color="gray" onClick={onLeave}>
            {prompt.leaveLabel}
          </Button>
          <Button onClick={onStay}>{prompt.stayLabel}</Button>
        </div>
      </div>
    </Modal>
  )
}
