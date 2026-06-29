import { memo, useCallback, useMemo } from 'react'
import {
  Button,
  Container,
  Group,
  Paper,
  Slider,
  Stack,
  Text,
} from '@mantine/core'
import {
  IconBolt,
  IconChartLine,
  IconDownload,
  IconPlayerPlay,
  IconPlayerStop,
  IconTrash,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

import { GraphChannelCard } from '../graphs/GraphChannelCard'
import {
  BUFFER_SAMPLE_COUNTS,
  bufferSampleCountFromIndex,
  bufferSampleCountIndex,
  bufferTimeSpanMs,
  formatBufferSampleCount,
  formatBufferMarkCompact,
} from '../graphs/buffer-size'
import { channelSeriesKey, combinedDataExtent, dataExtentFromSeries } from '../graphs/channel-series'
import { useGraphStore } from '../graphs/graph_store'
import {
  formatSamplingRate,
  formatSamplingRateMark,
  SAMPLING_RATES_HZ,
  samplingRateFromIndex,
  samplingRateIndex,
} from '../graphs/sampling-rates'
import { TimelineNavigator } from '../graphs/TimelineNavigator'
import { useGraphTimeNavigation } from '../graphs/use-graph-time-navigation'
import { downloadAllChannelsCsv } from '../graphs/utils'
import { useDeviceStore } from '../devices/device_store'
import { useLabView } from '../lab_view'
import classes from './graphs.module.css'

const GraphSettingsPanel = memo(function GraphSettingsPanel({
  isRecording,
  sampleRateHz,
  bufferSampleCount,
  onSampleRateChange,
  onBufferSampleCountChange,
  onStart,
  onStop,
  onClear,
  onDownload,
  channelCount,
  dataExtent,
  window,
  followLive,
  fitRunWidth,
  onViewportChange,
  onPanBy,
  onZoomBy,
  onScrollToStart,
  onScrollToEnd,
  onFitRunWidthChange,
  onFollowLiveChange,
  isEngineering,
}: {
  isRecording: boolean
  sampleRateHz: number
  bufferSampleCount: number
  onSampleRateChange: (index: number) => void
  onBufferSampleCountChange: (index: number) => void
  onStart: () => void
  onStop: () => void
  onClear: () => void
  onDownload: () => void
  channelCount: number
  dataExtent: { start: number; end: number }
  window: { start: number; end: number }
  followLive: boolean
  fitRunWidth: boolean
  onViewportChange: ReturnType<typeof useGraphTimeNavigation>['setViewport']
  onPanBy: ReturnType<typeof useGraphTimeNavigation>['panBy']
  onZoomBy: ReturnType<typeof useGraphTimeNavigation>['zoomBy']
  onScrollToStart: ReturnType<typeof useGraphTimeNavigation>['scrollToStart']
  onScrollToEnd: ReturnType<typeof useGraphTimeNavigation>['scrollToEnd']
  onFitRunWidthChange: ReturnType<typeof useGraphTimeNavigation>['setFitRunWidth']
  onFollowLiveChange: ReturnType<typeof useGraphTimeNavigation>['setFollowLive']
  isEngineering: boolean
}) {
  const rateIndex = samplingRateIndex(sampleRateHz)
  const bufferIndex = bufferSampleCountIndex(bufferSampleCount)

  const rateMarks = SAMPLING_RATES_HZ.map((rate, index) => ({
    value: index,
    label:
      index === 0 || index === SAMPLING_RATES_HZ.length - 1
        ? formatSamplingRateMark(rate)
        : undefined,
  }))

  const bufferMarks = BUFFER_SAMPLE_COUNTS.map((count, index) => ({
    value: index,
    label:
      index === 0 || index === BUFFER_SAMPLE_COUNTS.length - 1
        ? formatBufferMarkCompact(count)
        : undefined,
  }))

  return (
    <Paper withBorder radius="md" p="md" className={classes.ratePanel}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <Stack gap="md" className={classes.controlsColumn}>
            <Stack gap={4}>
              <Text size="sm" fw={600}>
                Sampling rate
              </Text>
              <Text size="xs" c="dimmed">
                {isRecording ? 'Recording' : 'Stopped'} at {formatSamplingRate(sampleRateHz)}
              </Text>
              <Text className={classes.rateValue}>{formatSamplingRate(sampleRateHz)}</Text>
              <Slider
                classNames={{ root: classes.settingsSlider }}
                value={rateIndex}
                onChange={onSampleRateChange}
                min={0}
                max={SAMPLING_RATES_HZ.length - 1}
                step={1}
                marks={rateMarks}
                label={null}
                disabled={isRecording}
              />
            </Stack>

            {isEngineering ? (
              <Stack gap={4}>
                <Text size="sm" fw={600}>
                  Buffer size
                </Text>
                <Text size="xs" c="dimmed">
                  Keep the most recent {formatBufferSampleCount(bufferSampleCount)} (
                  {(bufferTimeSpanMs(bufferSampleCount, sampleRateHz) / 1000).toFixed(0)} s at{' '}
                  {formatSamplingRate(sampleRateHz)})
                </Text>
                <Text className={classes.rateValue}>{formatBufferSampleCount(bufferSampleCount)}</Text>
                <Slider
                  classNames={{ root: classes.settingsSlider }}
                  value={bufferIndex}
                  onChange={onBufferSampleCountChange}
                  min={0}
                  max={BUFFER_SAMPLE_COUNTS.length - 1}
                  step={1}
                  marks={bufferMarks}
                  label={null}
                />
              </Stack>
            ) : null}
          </Stack>

          <Stack gap="sm" className={classes.recordingColumn}>
            <Text size="sm" fw={600}>
              Recording
            </Text>
            <Group gap="xs">
              <Button
                size="xs"
                variant={isRecording ? 'light' : 'filled'}
                color="green"
                leftSection={<IconPlayerPlay size={14} />}
                onClick={onStart}
                disabled={isRecording}
              >
                Run
              </Button>
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<IconPlayerStop size={14} />}
                onClick={onStop}
                disabled={!isRecording}
              >
                Stop
              </Button>
              <Button
                size="xs"
                variant="light"
                color="gray"
                leftSection={<IconTrash size={14} />}
                onClick={onClear}
              >
                Clear
              </Button>
              <Button
                size="xs"
                variant="light"
                color="gray"
                leftSection={<IconDownload size={14} />}
                onClick={onDownload}
              >
                Download
              </Button>
            </Group>
          </Stack>
        </Group>

        <Stack gap="xs">
          <Text className={classes.timeHint}>
            {channelCount} {channelCount === 1 ? 'channel' : 'channels'}
            {isEngineering
              ? ` · buffer ${formatBufferSampleCount(bufferSampleCount)}`
              : ''}
          </Text>
          <TimelineNavigator
            dataStart={dataExtent.start}
            dataEnd={dataExtent.end}
            window={window}
            followLive={followLive}
            fitRunWidth={fitRunWidth}
            isRecording={isRecording}
            onViewportChange={onViewportChange}
            onPanBy={onPanBy}
            onZoomBy={onZoomBy}
            onScrollToStart={onScrollToStart}
            onScrollToEnd={onScrollToEnd}
            onFitRunWidthChange={onFitRunWidthChange}
            onFollowLiveChange={onFollowLiveChange}
          />
        </Stack>
      </Stack>
    </Paper>
  )
})

export function GraphsPage() {
  const navigate = useNavigate()
  const { isEngineering } = useLabView()
  const { devices, toggleChannelOutput } = useDeviceStore()
  const {
    isRecording,
    startRecording,
    stopRecording,
    clearRecording,
    sampleRateHz,
    setSampleRateHz,
    bufferSampleCount,
    setBufferSampleCount,
    getChannelSeries,
    renderGeneration,
    latestSampleTimeMs,
  } = useGraphStore()

  const bufferSpanMs = bufferTimeSpanMs(bufferSampleCount, sampleRateHz)

  const channelEntries = useMemo(
    () =>
      devices.flatMap((device) =>
        device.channels.map((channel) => ({
          deviceId: device.id,
          serialNumber: device.serialNumber,
          channel,
          key: channelSeriesKey(device.id, channel.identifier),
        })),
      ),
    [devices],
  )

  const dataExtent = useMemo(() => {
    const fallbackEnd = latestSampleTimeMs()
    const extents = channelEntries.map(({ deviceId, channel }) =>
      dataExtentFromSeries(
        getChannelSeries(deviceId, channel.identifier),
        bufferSpanMs,
        fallbackEnd,
      ),
    )
    return combinedDataExtent(extents, bufferSpanMs, fallbackEnd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bufferSpanMs, channelEntries, getChannelSeries, latestSampleTimeMs, renderGeneration])

  const {
    window,
    followLive,
    fitRunWidth,
    setViewport,
    setFollowLive,
    setFitRunWidth,
    panBy,
    zoomBy,
    scrollToStart,
    scrollToEnd,
    resetNavigation,
  } = useGraphTimeNavigation({
    dataExtent,
    maxSpanMs: bufferSpanMs,
    isRecording,
    renderGeneration,
  })

  const handleDownloadAll = useCallback(() => {
    downloadAllChannelsCsv(
      channelEntries.map(({ serialNumber, channel, deviceId }) => {
        const channelSeries = getChannelSeries(deviceId, channel.identifier)
        return {
          serialNumber,
          channelIdentifier: channel.identifier,
          series: {
            voltage: channelSeries.voltage.points,
            current: channelSeries.current.points,
            power: channelSeries.power.points,
          },
        }
      }),
    )
  }, [channelEntries, getChannelSeries])

  const handleToggleOutput = useCallback(
    (deviceId: string, channelIdentifier: string) => {
      void toggleChannelOutput(deviceId, channelIdentifier)
    },
    [toggleChannelOutput],
  )

  const handleStartRecording = useCallback(() => {
    startRecording()
  }, [startRecording])

  const handleClearRecording = useCallback(() => {
    clearRecording()
    resetNavigation()
  }, [clearRecording, resetNavigation])

  if (channelEntries.length === 0) {
    return (
      <Container size="sm">
        <Stack align="center" gap="md" py="xl">
          <IconChartLine size={40} stroke={1.5} />
          <Stack align="center" gap={4}>
            <Text fw={600}>No devices connected</Text>
            <Text size="sm" c="dimmed" ta="center">
              Connect a ProtoV MINI on the Devices page to stream live voltage, current, and power
              graphs here.
            </Text>
          </Stack>
          <Button
            leftSection={<IconBolt size={16} />}
            onClick={() => {
              navigate('/lab/devices')
            }}
          >
            Go to Devices
          </Button>
        </Stack>
      </Container>
    )
  }

  return (
    <Container>
      <Stack gap="md">
        <GraphSettingsPanel
          isRecording={isRecording}
          sampleRateHz={sampleRateHz}
          bufferSampleCount={bufferSampleCount}
          onSampleRateChange={(index) => setSampleRateHz(samplingRateFromIndex(index))}
          onBufferSampleCountChange={(index) =>
            setBufferSampleCount(bufferSampleCountFromIndex(index))
          }
          onStart={handleStartRecording}
          onStop={stopRecording}
          onClear={handleClearRecording}
          onDownload={handleDownloadAll}
          channelCount={channelEntries.length}
          dataExtent={dataExtent}
          window={window}
          followLive={followLive}
          fitRunWidth={fitRunWidth}
          onViewportChange={setViewport}
          onPanBy={panBy}
          onZoomBy={zoomBy}
          onScrollToStart={scrollToStart}
          onScrollToEnd={scrollToEnd}
          onFitRunWidthChange={setFitRunWidth}
          onFollowLiveChange={setFollowLive}
          isEngineering={isEngineering}
        />

        <Stack gap="md">
          {channelEntries.map((entry) => (
            <GraphChannelCard
              key={entry.key}
              entry={entry}
              window={window}
              chartRevision={renderGeneration}
              getChannelSeries={getChannelSeries}
              onToggleOutput={handleToggleOutput}
            />
          ))}
        </Stack>
      </Stack>
    </Container>
  )
}
