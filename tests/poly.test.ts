import { test, expect } from "bun:test"
import { parseKicadModToCircuitJson } from "src"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import fs from "fs"
import { join } from "path"

test("poly.kicad_mod", async () => {
  const fixturePath = join(import.meta.dirname, "data/poly.kicad_mod")
  const fileContent = fs.readFileSync(fixturePath).toString()

  const circuitJson = await parseKicadModToCircuitJson(fileContent)
  const silkscreenPaths = circuitJson.filter(
    (elm) => elm.type === "pcb_silkscreen_path",
  )
  expect(silkscreenPaths.length).toBe(1)
  expect((silkscreenPaths[0] as any).route.length).toBe(5)
  const result = convertCircuitJsonToPcbSvg(circuitJson as any)
  expect(result).toMatchSvgSnapshot(import.meta.path)
})

test("poly-with-arc.kicad_mod", async () => {
  const fixturePath = join(
    import.meta.dirname,
    "data/poly-with-arc.kicad_mod",
  )
  const fileContent = fs.readFileSync(fixturePath).toString()

  const circuitJson = await parseKicadModToCircuitJson(fileContent)
  const copperTraces = circuitJson.filter(
    (elm) => elm.type === "pcb_trace",
  )

  expect(copperTraces.length).toBeGreaterThan(0)

  const route = (copperTraces[0] as any).route
  expect(route.length).toBeGreaterThan(3)
  for (const point of route) {
    expect(Number.isFinite(point.x)).toBe(true)
    expect(Number.isFinite(point.y)).toBe(true)
  }
})
