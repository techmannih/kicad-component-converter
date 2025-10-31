import { test, expect } from "bun:test"
import { parseKicadModToKicadJson } from "src"
import fs from "fs"
import { join } from "path"

test("fp_poly with arc loads", async () => {
  const fixturePath = join(
    import.meta.dirname,
    "../data/viaGrid-pacman-1.kicad_mod",
  )
  const fileContent = fs.readFileSync(fixturePath, "utf-8")

  const result = parseKicadModToKicadJson(fileContent)
  const pts = result.fp_polys?.[0]?.pts
  expect(pts?.length).toBeGreaterThan(0)
  expect(pts?.some((pt) => !Array.isArray(pt))).toBe(true)
})
