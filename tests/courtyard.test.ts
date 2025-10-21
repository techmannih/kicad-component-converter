import { test, expect } from "bun:test"
import fs from "fs"
import { join } from "path"
import { parseKicadModToKicadJson } from "src/parse-kicad-mod-to-kicad-json"
import { parseKicadModToCircuitJson } from "src"

test("parse captures fp_rect courtyard layers", () => {
  const fixturePath = join(
    import.meta.dirname,
    "data/courtyard-both.kicad_mod",
  )
  const fileContent = fs.readFileSync(fixturePath, "utf-8")

  const kicadJson = parseKicadModToKicadJson(fileContent)

  expect(kicadJson.fp_rects?.length).toBe(2)
  const layers = kicadJson.fp_rects!.map((rect) => rect.layer).sort()
  expect(layers).toEqual(["B.CrtYd", "F.CrtYd"])
})

test("circuit json includes pcb_courtyard_rect elements", async () => {
  const fixturePath = join(
    import.meta.dirname,
    "data/courtyard-both.kicad_mod",
  )
  const fileContent = fs.readFileSync(fixturePath, "utf-8")

  const circuitJson = await parseKicadModToCircuitJson(fileContent)
  const courtyardRects = circuitJson.filter(
    (elm) => elm.type === "pcb_courtyard_rect",
  ) as Array<any>

  expect(courtyardRects.length).toBe(2)

  const topRect = courtyardRects.find((rect) => rect.layer === "top")
  expect(topRect).toBeDefined()
  expect(topRect?.width).toBeCloseTo(2, 5)
  expect(topRect?.height).toBeCloseTo(2, 5)
  expect(topRect?.x).toBeCloseTo(0, 5)
  expect(topRect?.y).toBeCloseTo(0, 5)

  const bottomRect = courtyardRects.find((rect) => rect.layer === "bottom")
  expect(bottomRect).toBeDefined()
  expect(bottomRect?.width).toBeCloseTo(3, 5)
  expect(bottomRect?.height).toBeCloseTo(3, 5)
  expect(bottomRect?.x).toBeCloseTo(0, 5)
  expect(bottomRect?.y).toBeCloseTo(0, 5)
})
