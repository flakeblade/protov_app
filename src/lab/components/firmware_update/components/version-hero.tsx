import { IconArrowRight } from '@tabler/icons-react'
import clsx from 'clsx'

import classes from '../../firmware_update_modal.module.css'

export function VersionHero({
  installedVersion,
  targetVersion,
  checking,
  upToDate,
  blocked,
}: {
  installedVersion: string
  targetVersion: string
  checking: boolean
  upToDate: boolean
  blocked?: boolean
}) {
  if (upToDate || blocked) {
    return (
      <div className={classes.versionHero}>
        <span className={classes.versionLabel}>Installed</span>
        <span className={classes.versionValue}>v{installedVersion}</span>
        {upToDate ? <span className={classes.upToDateBadge}>Up to date</span> : null}
      </div>
    )
  }

  return (
    <div className={classes.versionHero}>
      <span className={classes.versionLabel}>Installed</span>
      <span className={classes.versionValue}>v{installedVersion}</span>
      <IconArrowRight size={16} stroke={1.5} className={classes.versionArrow} />
      <span className={classes.versionLabel}>Latest</span>
      <span
        className={clsx(
          classes.versionValue,
          classes.versionValueLatest,
          checking && classes.versionValueMuted,
        )}
      >
        {checking ? '…' : `v${targetVersion}`}
      </span>
    </div>
  )
}
