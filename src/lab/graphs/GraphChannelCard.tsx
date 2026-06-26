import { memo, useCallback, useMemo } from 'react'

import type { Channel } from '../components/channel_chip'
import { GraphChannelView } from './GraphChannelView'
import type { GraphMetric, TimeSeriesBuffer, TimeWindow } from './types'

export interface ChannelGraphEntry {
  deviceId: string
  serialNumber: string
  channel: Channel
  key: string
}

interface GraphChannelCardProps {
  entry: ChannelGraphEntry
  window: TimeWindow
  chartRevision: number
  getChannelSeries: (deviceId: string, channelIdentifier: string) => Record<GraphMetric, TimeSeriesBuffer>
  onToggleOutput: (deviceId: string, channelIdentifier: string) => void
}

export const GraphChannelCard = memo(function GraphChannelCard({
  entry,
  window,
  chartRevision,
  getChannelSeries,
  onToggleOutput,
}: GraphChannelCardProps) {
  const series = useMemo(() => {
    return getChannelSeries(entry.deviceId, entry.channel.identifier)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- in-place buffer; revision triggers refresh
  }, [chartRevision, entry.channel.identifier, entry.deviceId, getChannelSeries])

  const handleToggleOutput = useCallback(() => {
    onToggleOutput(entry.deviceId, entry.channel.identifier)
  }, [entry.channel.identifier, entry.deviceId, onToggleOutput])

  return (
    <GraphChannelView
      channel={entry.channel}
      series={series}
      window={window}
      chartRevision={chartRevision}
      onToggleOutput={handleToggleOutput}
    />
  )
})
