import { test, expect } from "bun:test"
import fs from "fs"
import { join } from "path"

import { parseKicadModToCircuitJson } from "src"

test("parses F.CrtYd courtyard into pcb_courtyard_rect", async () => {
  const fixturePath = join(
    import.meta.dirname,
    "data/Crystal_SMD_HC49-US.kicad_mod",
  )
  const fileContent = fs.readFileSync(fixturePath, "utf-8")

  const circuitJson = await parseKicadModToCircuitJson(fileContent)
  const courtyardRects = (circuitJson as any[]).filter(
    (el) => el.type === "pcb_courtyard_rect",
  )

  expect(courtyardRects.length).toBeGreaterThan(0)

  const topCourtyard = courtyardRects.find((rect) => rect.layer === "top")
  expect(topCourtyard).toBeTruthy()
  expect(topCourtyard).toMatchObject({
    x: 0,
    y: 0,
    width: 13.6,
    height: 5.2,
  })
})
