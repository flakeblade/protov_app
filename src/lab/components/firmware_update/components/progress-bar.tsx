import classes from '../../firmware_update_modal.module.css'

export function ProgressBar({ value, animated }: { value: number; animated?: boolean }) {
  return (
    <div className={classes.progressTrack}>
      <div
        className={classes.progressFill}
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          ...(animated ? { transition: 'width 240ms ease' } : {}),
        }}
      />
    </div>
  )
}
