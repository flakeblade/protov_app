declare module '*.mdx' {
  import type { MDXProps } from 'mdx/types'
  import type { FC } from 'react'

  const MDXComponent: FC<MDXProps>
  export default MDXComponent
}
