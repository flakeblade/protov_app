import { IconCheck } from '@tabler/icons-react'
import clsx from 'clsx'

import { FIRMWARE_UPDATE_STEPS } from '../constants'
import { StepDetail, type StepDetailProps } from './step-detail'
import classes from '../../firmware_update_modal.module.css'

type StepperProps = Omit<StepDetailProps, 'stepIndex'>

export function FirmwareUpdateStepper(props: StepperProps) {
  return (
    <ol className={classes.stepper}>
      {FIRMWARE_UPDATE_STEPS.map((step, index) => {
        const isComplete = index < props.activeStep
        const isActive = props.activeStep === index

        return (
          <li
            key={step.key}
            data-step={step.key}
            data-active={isActive ? 'true' : 'false'}
            className={clsx(
              classes.stepRow,
              isComplete && classes.stepRowComplete,
              isActive && classes.stepRowActive,
            )}
          >
            <div className={classes.stepRail}>
              <div className={classes.stepDot}>
                {isComplete ? <IconCheck size={11} stroke={2.5} /> : index + 1}
              </div>
              <div className={classes.stepLine} />
            </div>
            <div className={classes.stepMain}>
              <span className={classes.stepTitle}>{step.label}</span>
              <div className={classes.stepDetailSlot}>
                <div className={classes.stepDetailInner}>
                  <StepDetail {...props} stepIndex={index} />
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
