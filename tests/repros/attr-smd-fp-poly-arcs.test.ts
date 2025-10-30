import { test, expect } from "bun:test"
import fs from "fs"
import { join } from "path"
import { parseKicadModToCircuitJson } from "src"

const toFixed = (value: number) => Math.round(value * 1e6) / 1e6

test("fp_poly arcs inside attr smd footprints are approximated", async () => {
  const fixturePath = join(
    import.meta.dirname,
    "../data/attr-smd-fp_poly-arc.kicad_mod",
  )
  const fileContent = fs.readFileSync(fixturePath, "utf8")

  const circuitJson = await parseKicadModToCircuitJson(fileContent)
  const copperTraces = circuitJson.filter(
    (element) => element.type === "pcb_trace" && (element as any).layer === "top",
  )

  expect(copperTraces.length).toBe(1)

  const route = (copperTraces[0] as any).route as Array<{ x: number; y: number }>

  // The arc should be converted into many short segments
  expect(route.length).toBeGreaterThan(10)

  const lastPoint = route[route.length - 1]
  expect(toFixed(lastPoint.x)).toBeCloseTo(2.5, 6)
  expect(toFixed(lastPoint.y)).toBeCloseTo(-0.199999, 6)

  // Ensure there is an intermediate point that follows the curved arc path
  const hasArcPoint = route.some((point) => {
    return point.x < 1 && point.x > -2 && point.y < -0.5 && point.y > -2.5
  })
  expect(hasArcPoint).toBe(true)
})
