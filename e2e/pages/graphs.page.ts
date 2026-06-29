import { expect, type Locator, type Page } from '@playwright/test'

import {
  formatBufferSampleCount,
  formatSamplingRate,
  SAMPLING_RATES_HZ,
} from '../support/graph-settings'

export interface ViewHint {
  viewingSec: number
  recordedSec: number
}

export class GraphsPage {
  constructor(private readonly page: Page) {}

  graphChannelCards() {
    return this.page.locator('[class*="mantine-Card-root"]').filter({
      has: this.page.getByText(/^Channel [AB]$/, { exact: true }),
    })
  }

  graphChannelCard(channelId: 'A' | 'B', index = 0) {
    return this.graphChannelCards()
      .filter({ has: this.page.getByText(`Channel ${channelId}`, { exact: true }) })
      .nth(index)
  }

  private samplingRateSlider() {
    return this.page.locator('[class*="settingsSlider"]').first().getByRole('slider')
  }

  private bufferSlider() {
    return this.page.locator('[class*="settingsSlider"]').nth(1).getByRole('slider')
  }

  private timelineViewport() {
    return this.page.locator('[class*="viewport"]').first()
  }

  async expectGraphChannelCount(count: number) {
    await expect(this.graphChannelCards()).toHaveCount(count)
  }

  async expectChannelSetpoints(card: Locator, voltage: string, current: string) {
    await expect(card.getByText(new RegExp(`${voltage}\\s*V`))).toBeVisible()
    await expect(card.getByText(new RegExp(`${current}\\s*A`))).toBeVisible()
  }

  async clickRun() {
    await this.page.getByRole('button', { name: 'Run', exact: true }).click()
  }

  async clickStop() {
    await this.page.getByRole('button', { name: 'Stop', exact: true }).click()
  }

  async clickClear() {
    await this.page.getByRole('button', { name: 'Clear', exact: true }).click()
  }

  async clickDownload() {
    await this.page.getByRole('button', { name: 'Download', exact: true }).click()
  }

  async expectRecordingState(recording: boolean) {
    await expect(
      this.page.getByText(new RegExp(recording ? /^Recording at / : /^Stopped at /)),
    ).toBeVisible()
    const run = this.page.getByRole('button', { name: 'Run', exact: true })
    const stop = this.page.getByRole('button', { name: 'Stop', exact: true })
    if (recording) {
      await expect(run).toBeDisabled()
      await expect(stop).toBeEnabled()
    } else {
      await expect(run).toBeEnabled()
      await expect(stop).toBeDisabled()
    }
  }

  async setSamplingRateExtreme(which: 'min' | 'max') {
    const slider = this.samplingRateSlider()
    await slider.focus()
    await this.page.keyboard.press(which === 'min' ? 'Home' : 'End')
  }

  async setBufferExtreme(which: 'min' | 'max') {
    const slider = this.bufferSlider()
    await slider.focus()
    await this.page.keyboard.press(which === 'min' ? 'Home' : 'End')
  }

  async expectSamplingRateLabel(rateHz: number) {
    await expect(this.page.getByText(formatSamplingRate(rateHz), { exact: true }).first()).toBeVisible()
    await expect(this.page.getByText(`Stopped at ${formatSamplingRate(rateHz)}`)).toBeVisible()
  }

  async expectBufferSizeLabel(sampleCount: number) {
    const label = formatBufferSampleCount(sampleCount)
    await expect(this.page.getByText(label, { exact: true }).first()).toBeVisible()
    await expect(this.page.getByText(new RegExp(`buffer ${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))).toBeVisible()
  }

  async expectBufferControlsVisible(visible: boolean) {
    const heading = this.page.getByText('Buffer size', { exact: true })
    if (visible) {
      await expect(heading).toBeVisible()
      await expect(this.bufferSlider()).toBeVisible()
    } else {
      await expect(heading).toHaveCount(0)
      await expect(this.bufferSlider()).toHaveCount(0)
    }
  }

  async expectFitRunWidthActive(active: boolean) {
    const button = this.page.getByRole('button', { name: 'Fit to full run width', exact: true })
    await expect(button).toHaveAttribute('aria-pressed', active ? 'true' : 'false')
  }

  async expectLiveFollowActive(active: boolean) {
    const live = this.page.getByRole('button', { name: 'Live', exact: true })
    if (!active) {
      await expect(live).toHaveAttribute('data-variant', 'light')
      return
    }
    await expect(live).toHaveAttribute('data-variant', 'filled')
  }

  async zoomIn() {
    await this.page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  }

  async zoomOut() {
    await this.page.getByRole('button', { name: 'Zoom out', exact: true }).click()
  }

  async panLeft() {
    await this.page.getByRole('button', { name: 'Pan left', exact: true }).click()
  }

  async panRight() {
    await this.page.getByRole('button', { name: 'Pan right', exact: true }).click()
  }

  async jumpToStart() {
    await this.page.getByRole('button', { name: 'Jump to start', exact: true }).click()
  }

  async followLiveEnd() {
    await this.page.getByRole('button', { name: 'Follow live data', exact: true }).click()
  }

  async parseViewHint(): Promise<ViewHint> {
    const text = await this.page.locator('[class*="viewHint"]').textContent()
    const match = text?.match(/Viewing ([\d.]+) s of ([\d.]+) s recorded/)
    if (!match) {
      throw new Error(`Could not parse view hint: ${text ?? '(empty)'}`)
    }
    return {
      viewingSec: Number.parseFloat(match[1]!),
      recordedSec: Number.parseFloat(match[2]!),
    }
  }

  async waitForRecordedAtLeast(seconds: number, timeoutMs = 15_000) {
    await expect
      .poll(async () => (await this.parseViewHint()).recordedSec, { timeout: timeoutMs })
      .toBeGreaterThanOrEqual(seconds)
  }

  async getViewportStyle() {
    const viewport = this.timelineViewport()
    return viewport.evaluate((element) => ({
      left: Number.parseFloat(element.style.left),
      width: Number.parseFloat(element.style.width),
    }))
  }

  async dragTimelineViewport(deltaX: number) {
    const viewport = this.timelineViewport()
    const box = await viewport.boundingBox()
    if (!box) throw new Error('Timeline viewport not visible')
    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2
    await this.page.mouse.move(startX, startY)
    await this.page.mouse.down()
    await this.page.mouse.move(startX + deltaX, startY, { steps: 8 })
    await this.page.mouse.up()
  }

  chartSvg(card: Locator) {
    return card.locator('svg[class*="svg"]').first()
  }

  async dragChartSelection(card: Locator) {
    const svg = this.chartSvg(card)
    await expect(svg.locator('path[class*="seriesLine"]')).toHaveAttribute('d', /L/, {
      timeout: 10_000,
    })
    await svg.dragTo(svg, {
      sourcePosition: { x: 180, y: 240 },
      targetPosition: { x: 420, y: 240 },
      force: true,
    })
  }

  async expectChartSelection(card: Locator) {
    await expect(card.getByText(/μ =/)).toBeVisible({ timeout: 10_000 })
    await expect(card.getByText(/σ =/)).toBeVisible()
    await expect(card.getByText(/n = \d+/)).toBeVisible()
  }

  yMinInput(card: Locator) {
    return card.locator('[class*="axisRow"] input').nth(0)
  }

  yMaxInput(card: Locator) {
    return card.locator('[class*="axisRow"] input').nth(1)
  }

  async setYAxisRange(card: Locator, min: string, max: string) {
    await this.yMinInput(card).fill(min)
    await this.yMaxInput(card).fill(max)
  }

  async expectYAxisTick(card: Locator, value: string) {
    await expect(card.locator('svg text[class*="axisLabel"]').filter({ hasText: value })).toBeVisible()
  }

  minSamplingRateHz() {
    return SAMPLING_RATES_HZ[0]!
  }

  maxSamplingRateHz() {
    return SAMPLING_RATES_HZ[SAMPLING_RATES_HZ.length - 1]!
  }
}
