import { Button, Checkbox, Modal, Text } from '@mantine/core'

import classes from '../../firmware_update_modal.module.css'

export function PreflightModal({
  opened,
  checked,
  onCheckedChange,
  onCancel,
  onConfirm,
}: {
  opened: boolean
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal opened={opened} onClose={onCancel} title="Before you update" centered size="sm">
      <div className={classes.preflightBody}>
        <div className={classes.callout}>
          <Text className={classes.bodyText}>
            Device outputs will be turned off or may become unregulated before the software update
            begins.
          </Text>
          <Text className={classes.bodyText}>
            The device will disconnect from the browser during install and reboot. You will need to
            reconnect it to finish the update.
          </Text>
        </div>

        <Checkbox
          checked={checked}
          onChange={(event) => onCheckedChange(event.currentTarget.checked)}
          label="I understand and want to continue with the firmware update."
          classNames={{ label: classes.preflightCheckboxLabel }}
        />

        <div className={classes.cancelActions}>
          <Button variant="subtle" color="gray" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!checked}>
            Continue update
          </Button>
        </div>
      </div>
    </Modal>
  )
}
