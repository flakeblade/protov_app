import { Container, Skeleton, Stack } from '@mantine/core'

export function DocLoadingSkeleton() {
  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <Stack gap="sm">
          <Skeleton height={36} width="68%" radius="sm" />
          <Skeleton height={14} width="92%" radius="sm" />
          <Skeleton height={14} width="88%" radius="sm" />
          <Skeleton height={14} width="64%" radius="sm" />
        </Stack>

        <Stack gap="sm" mt="sm">
          <Skeleton height={26} width="42%" radius="sm" />
          <Skeleton height={12} width="100%" radius="sm" />
          <Skeleton height={12} width="100%" radius="sm" />
          <Skeleton height={12} width="96%" radius="sm" />
          <Skeleton height={12} width="78%" radius="sm" />
        </Stack>

        <Stack gap="sm">
          <Skeleton height={26} width="36%" radius="sm" />
          <Skeleton height={12} width="100%" radius="sm" />
          <Skeleton height={12} width="94%" radius="sm" />
          <Skeleton height={12} width="100%" radius="sm" />
          <Skeleton height={12} width="70%" radius="sm" />
        </Stack>

        <Skeleton height={132} radius="md" />
      </Stack>
    </Container>
  )
}
