import { expect, test } from "bun:test"
import fs from "node:fs"
import { join } from "node:path"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { parseKicadModToCircuitJson } from "src"

const fixturePath = join(import.meta.dirname, "data/RP2040-Zero.kicad_mod")

const rp2040ZeroContent = fs.readFileSync(fixturePath, "utf-8")

test("RP2040 Zero footprint renders as expected", async () => {
  const circuitJson = await parseKicadModToCircuitJson(rp2040ZeroContent)

  const numericSilkscreenTexts = (circuitJson as any[]).filter(
    (element) =>
      element.type === "pcb_silkscreen_text" &&
      typeof element.text === "string" &&
      /^\d+$/.test(element.text.trim()),
  )

  const uniqueNumericLabels = new Set(
    numericSilkscreenTexts.map((element) => element.text?.trim()),
  )

  expect(numericSilkscreenTexts.length).toBeGreaterThanOrEqual(23)
  expect(uniqueNumericLabels.size).toBeGreaterThanOrEqual(23)

  const expectedLabels = new Set(
    Array.from({ length: 23 }, (_, idx) => `${idx + 1}`),
  )
  for (const label of expectedLabels) {
    expect(uniqueNumericLabels.has(label)).toBe(true)
  }

  const svg = convertCircuitJsonToPcbSvg(circuitJson as any)

  expect(svg).toMatchSvgSnapshot(import.meta.path)
})
