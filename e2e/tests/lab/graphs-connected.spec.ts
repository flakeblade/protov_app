/**
 * Graphs page E2E tests with a connected Rust mock backend.
 *
 * Prerequisites:
 *   Terminal 1 — cd /home/tianyi/src/protov && just run-mock
 *   Terminal 2 — npm run dev (Playwright starts this automatically)
 */
import { expect, test } from '../../fixtures/lab-devices'
import type { GraphsPage } from '../../pages/graphs.page'
import type { LabPage } from '../../pages/lab.page'
import type { MockControlClient } from '../../support/mock-control'
import {
  BUFFER_SAMPLE_COUNTS,
} from '../../support/graph-settings'

test.describe.configure({ mode: 'serial', timeout: 90_000 })

async function connectOnGraphs(
  lab: LabPage,
  mockControl: MockControlClient,
  options: { slot?: number; stateFile?: string; deviceCount?: number } = {},
) {
  const { slot = 0, stateFile = 'default.json', deviceCount = 1 } = options

  await lab.gotoDevices()
  await lab.setEngineeringView()
  await mockControl.resetAllSlots()

  for (let index = 0; index < deviceCount; index += 1) {
    if (index === slot) {
      await mockControl.loadStateFile(index, stateFile)
    } else {
      await mockControl.resetSlot(index)
    }
    await lab.clickConnect()
  }

  await lab.openGraphs()
}

async function recordBriefly(graphs: GraphsPage, seconds = 1.5) {
  await graphs.setSamplingRateExtreme('max')
  await graphs.clickRun()
  await graphs.waitForRecordedAtLeast(seconds)
}

test.describe('Lab graphs page (recording lifecycle)', () => {
  test('runs, stops, clears, and downloads CSV data', async ({
    lab,
    graphs,
    mockControl,
    page,
  }) => {
    await connectOnGraphs(lab, mockControl)

    await graphs.expectRecordingState(false)
    await recordBriefly(graphs, 1)
    await graphs.expectRecordingState(true)

    await graphs.clickStop()
    await graphs.expectRecordingState(false)

    const downloadPromise = page.waitForEvent('download')
    await graphs.clickDownload()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('all-channels.csv')
    const stream = await download.createReadStream()
    expect(stream).not.toBeNull()
    const chunks: Buffer[] = []
    for await (const chunk of stream!) {
      chunks.push(Buffer.from(chunk))
    }
    const csvText = Buffer.concat(chunks).toString('utf8').trim()
    const rows = csvText.split('\n')
    expect(rows[0]).toBe('timestamp_ms,device_serial,channel,voltage_V,current_A,power_W')
    expect(rows.length).toBeGreaterThan(1)

    await graphs.clickClear()

    const clearedDownloadPromise = page.waitForEvent('download')
    await graphs.clickDownload()
    const clearedDownload = await clearedDownloadPromise
    const clearedStream = await clearedDownload.createReadStream()
    expect(clearedStream).not.toBeNull()
    const clearedChunks: Buffer[] = []
    for await (const chunk of clearedStream!) {
      clearedChunks.push(Buffer.from(chunk))
    }
    const clearedRows = Buffer.concat(clearedChunks).toString('utf8').trim().split('\n')
    expect(clearedRows).toEqual(['timestamp_ms,device_serial,channel,voltage_V,current_A,power_W'])
  })
})

test.describe('Lab graphs page (settings)', () => {
  test('adjusts sampling rate between min and max while stopped', async ({
    lab,
    graphs,
    mockControl,
  }) => {
    await connectOnGraphs(lab, mockControl)

    await graphs.setSamplingRateExtreme('min')
    await graphs.expectSamplingRateLabel(graphs.minSamplingRateHz())

    await graphs.setSamplingRateExtreme('max')
    await graphs.expectSamplingRateLabel(graphs.maxSamplingRateHz())
  })

  test('adjusts buffer size between min and max in engineering view', async ({
    lab,
    graphs,
    mockControl,
  }) => {
    await connectOnGraphs(lab, mockControl)
    await graphs.expectBufferControlsVisible(true)

    await graphs.setBufferExtreme('min')
    await graphs.expectBufferSizeLabel(BUFFER_SAMPLE_COUNTS[0]!)

    await graphs.setBufferExtreme('max')
    await graphs.expectBufferSizeLabel(BUFFER_SAMPLE_COUNTS[BUFFER_SAMPLE_COUNTS.length - 1]!)
  })

  test('hides the buffer size slider in standard view', async ({ lab, graphs, mockControl }) => {
    await connectOnGraphs(lab, mockControl)
    await graphs.expectBufferControlsVisible(true)

    await lab.setStandardView()
    await graphs.expectBufferControlsVisible(false)
  })
})

test.describe('Lab graphs page (timeline navigation)', () => {
  test('starts recording in live follow and fit-to-full-run modes', async ({
    lab,
    graphs,
    mockControl,
  }) => {
    await connectOnGraphs(lab, mockControl, { stateFile: 'ch1-active.json' })

    await graphs.setSamplingRateExtreme('max')
    await graphs.clickRun()
    await graphs.expectRecordingState(true)
    await graphs.expectFitRunWidthActive(true)
    await graphs.expectLiveFollowActive(true)
  })

  test('updates viewing length calculations while recording and zooming', async ({
    lab,
    graphs,
    mockControl,
  }) => {
    await connectOnGraphs(lab, mockControl, { stateFile: 'ch1-active.json' })
    await recordBriefly(graphs, 6)

    const whileRecording = await graphs.parseViewHint()
    expect(whileRecording.recordedSec).toBeGreaterThanOrEqual(5)
    expect(whileRecording.viewingSec).toBeGreaterThan(0)
    expect(whileRecording.viewingSec).toBeCloseTo(whileRecording.recordedSec, 0)

    await graphs.clickStop()
    const beforeZoom = await graphs.parseViewHint()
    await graphs.zoomIn()
    const zoomed = await graphs.parseViewHint()
    expect(zoomed.viewingSec).toBeLessThan(beforeZoom.viewingSec)

    await graphs.zoomOut()
    const zoomedOut = await graphs.parseViewHint()
    expect(zoomedOut.viewingSec).toBeGreaterThan(zoomed.viewingSec)
  })

  test('pans, jumps to start, and follows live data on the timeline', async ({
    lab,
    graphs,
    mockControl,
  }) => {
    await connectOnGraphs(lab, mockControl, { stateFile: 'ch1-active.json' })
    await recordBriefly(graphs, 6)
    await graphs.clickStop()
    await graphs.zoomIn()

    const beforePan = await graphs.getViewportStyle()
    await graphs.panRight()
    const afterPanRight = await graphs.getViewportStyle()
    expect(afterPanRight.left).toBeGreaterThan(beforePan.left)

    await graphs.panLeft()
    const afterPanLeft = await graphs.getViewportStyle()
    expect(afterPanLeft.left).toBeLessThan(afterPanRight.left)

    await graphs.jumpToStart()
    const atStart = await graphs.getViewportStyle()
    expect(atStart.left).toBeLessThan(5)

    await graphs.clickRun()
    await graphs.waitForRecordedAtLeast(1)
    await graphs.followLiveEnd()
    await graphs.expectLiveFollowActive(true)
  })

  test('drags the timeline viewport to scroll the visible window', async ({
    lab,
    graphs,
    mockControl,
  }) => {
    await connectOnGraphs(lab, mockControl, { stateFile: 'ch1-active.json' })
    await recordBriefly(graphs, 6)
    await graphs.clickStop()
    await graphs.zoomIn()
    await graphs.panRight()

    const before = await graphs.getViewportStyle()
    await graphs.dragTimelineViewport(-80)
    const afterPan = await graphs.getViewportStyle()
    expect(afterPan.left).toBeLessThan(before.left)
  })
})

test.describe('Lab graphs page (channel charts)', () => {
  test('shows the correct number of channel cards and setpoint labels', async ({
    lab,
    graphs,
    mockControl,
    page,
  }) => {
    await connectOnGraphs(lab, mockControl, { deviceCount: 2 })

    await graphs.expectGraphChannelCount(4)
    await expect(page.getByText('4 channels')).toBeVisible()

    await graphs.expectChannelSetpoints(graphs.graphChannelCard('A', 0), '3.300', '0.500')
    await graphs.expectChannelSetpoints(graphs.graphChannelCard('B', 0), '5.000', '2.000')
  })

  test('supports Y-axis min/max overrides on the chart', async ({ lab, graphs, mockControl }) => {
    await connectOnGraphs(lab, mockControl, { stateFile: 'ch1-active.json' })
    await recordBriefly(graphs, 1)
    await graphs.clickStop()

    const channelA = graphs.graphChannelCard('A')
    await graphs.setYAxisRange(channelA, '0', '5')
    await graphs.expectYAxisTick(channelA, '2.500')
    await graphs.expectYAxisTick(channelA, '3.750')
  })

  test('selects a plot region and shows selection statistics', async ({
    lab,
    graphs,
    mockControl,
  }) => {
    await connectOnGraphs(lab, mockControl, { stateFile: 'ch1-active.json' })
    await recordBriefly(graphs, 4)
    await graphs.clickStop()

    const channelA = graphs.graphChannelCard('A')
    await graphs.dragChartSelection(channelA)
    await graphs.expectChartSelection(channelA)
  })
})
