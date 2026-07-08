import type { FirmwarePackage } from '../../../firmware/releases'
import { Disclosure } from './disclosure'
import classes from '../../firmware_update_modal.module.css'

export function DetailsPanel({
  opened,
  onToggle,
  serialNumber,
  hwLabel,
  buildDate,
  firmwarePackage,
  packageSize,
}: {
  opened: boolean
  onToggle: () => void
  serialNumber: string
  hwLabel: string
  buildDate: string
  firmwarePackage: FirmwarePackage | null
  packageSize: string
}) {
  return (
    <Disclosure label="Details" opened={opened} onToggle={onToggle}>
      <div className={classes.detailsGrid}>
        <div className={classes.detailRow}>
          <span className={classes.detailLabel}>Serial</span>
          <span className={classes.detailValue}>{serialNumber}</span>
        </div>
        <div className={classes.detailRow}>
          <span className={classes.detailLabel}>Hardware</span>
          <span className={classes.detailValue}>{hwLabel}</span>
        </div>
        <div className={classes.detailRow}>
          <span className={classes.detailLabel}>Build date</span>
          <span className={classes.detailValue}>{buildDate}</span>
        </div>
        {firmwarePackage ? (
          <>
            <div className={classes.detailRow}>
              <span className={classes.detailLabel}>Package</span>
              <span className={classes.detailValue}>{firmwarePackage.firmware.name}</span>
            </div>
            <div className={classes.detailRow}>
              <span className={classes.detailLabel}>Size</span>
              <span className={classes.detailValue}>{packageSize}</span>
            </div>
          </>
        ) : null}
      </div>
    </Disclosure>
  )
}
