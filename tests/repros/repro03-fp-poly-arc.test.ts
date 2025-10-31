import { test, expect } from "bun:test"
import { parseKicadModToCircuitJson } from "src"
import fs from "node:fs"
import { join } from "node:path"

const isFinitePoint = (point: { x: number; y: number }) =>
  Number.isFinite(point.x) && Number.isFinite(point.y)

test("fp_poly with arc segments loads without error", async () => {
  const fixturePath = join(
    import.meta.dirname,
    "../data/viaGrid-pacman-1.kicad_mod",
  )
  const fileContent = fs.readFileSync(fixturePath, "utf8")

  const circuitJson = await parseKicadModToCircuitJson(fileContent)

  const copperTraces = circuitJson.filter(
    (element: any) => element.type === "pcb_trace" && element.layer === "top",
  )

  expect(copperTraces.length).toBeGreaterThan(0)

  const arcTrace = copperTraces.find((trace: any) => trace.route.length > 5)
  expect(arcTrace).toBeDefined()

  for (const point of arcTrace!.route) {
    expect(isFinitePoint(point)).toBe(true)
  }
})
