import { Center, Loader } from '@mantine/core'
import classes from './HeroScene.module.css'

export function HeroSceneFallback() {
  return (
    <div className={classes.fallback}>
      <Center h="100%">
        <Loader color="gray" type="dots" />
      </Center>
    </div>
  )
}
