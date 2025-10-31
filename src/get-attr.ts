import { type EffectsObj, effects_def } from "./kicad-zod"
import { generateArcPath, getArcLength } from "./math/arc-utils"

export const formatAttr = (val: any, attrKey: string) => {
  if (attrKey === "effects" && Array.isArray(val)) {
    // val = [ [ 'font', [ 'size', '1', '1' ], [ 'thickness', '0.2' ] ] ]
    const effectsObj: EffectsObj = {}
    for (const elm of val) {
      if (elm[0] === "font") {
        const fontObj: any = {}
        for (const fontElm of elm.slice(1)) {
          if (fontElm.length === 2) {
            fontObj[fontElm[0].valueOf()] = Number.parseFloat(
              fontElm[1].valueOf(),
            )
          } else {
            fontObj[fontElm[0].valueOf()] = fontElm
              .slice(1)
              .map((n: any) => Number.parseFloat(n.valueOf()))
          }
        }
        effectsObj.font = fontObj
      }
    }
    return effects_def.parse(effectsObj)
  }
  if (attrKey === "pts") {
    // val is like [ [ 'xy', -1.25, -0.625 ], [ 'arc', ... ], ... ]
    if (!Array.isArray(val)) return []

    const points: number[][] = []

    const toNumber = (token: any): number | undefined => {
      const raw = token?.valueOf?.() ?? token
      if (typeof raw === "number") return raw
      if (typeof raw === "string") {
        const parsed = Number.parseFloat(raw)
        if (!Number.isNaN(parsed)) return parsed
      }
      return undefined
    }

    const parsePointTokens = (tokens: any[]): [number, number] | undefined => {
      const coords = tokens
        .map(toNumber)
        .filter((n): n is number => typeof n === "number")
      if (coords.length >= 2) {
        return [coords[0], coords[1]]
      }
      return undefined
    }

    for (const xy_pair of val) {
      if (!Array.isArray(xy_pair) || xy_pair.length === 0) continue

      const token = xy_pair[0]?.valueOf?.() ?? xy_pair[0]

      if (token === "xy") {
        const parsed = parsePointTokens(xy_pair.slice(1))
        if (parsed) points.push(parsed)
        continue
      }

      if (token === "arc") {
        const arcParts = xy_pair.slice(1)
        const findPart = (name: string) =>
          arcParts.find((part: any[]) => {
            const key = part?.[0]?.valueOf?.() ?? part?.[0]
            return key === name
          })

        const startTokens = findPart("start")
        const midTokens = findPart("mid")
        const endTokens = findPart("end")

        const start =
          Array.isArray(startTokens) && startTokens.length > 1
            ? parsePointTokens(startTokens.slice(1))
            : undefined
        const mid =
          Array.isArray(midTokens) && midTokens.length > 1
            ? parsePointTokens(midTokens.slice(1))
            : undefined
        const end =
          Array.isArray(endTokens) && endTokens.length > 1
            ? parsePointTokens(endTokens.slice(1))
            : undefined

        if (start && mid && end) {
          const [sx, sy] = start
          const [mx, my] = mid
          const [ex, ey] = end

          const arcLength = getArcLength(
            { x: sx, y: sy },
            { x: mx, y: my },
            { x: ex, y: ey },
          )
          const segments = Math.max(
            8,
            Math.min(64, Math.ceil(arcLength * 2)),
          )

          const arcPoints = generateArcPath(
            { x: sx, y: sy },
            { x: mx, y: my },
            { x: ex, y: ey },
            segments,
          )

          const shouldSkipFirstPoint =
            points.length > 0 &&
            Math.abs(points[points.length - 1][0] - sx) < 1e-6 &&
            Math.abs(points[points.length - 1][1] - sy) < 1e-6

          for (let i = shouldSkipFirstPoint ? 1 : 0; i < arcPoints.length; i++) {
            const p = arcPoints[i]
            points.push([p.x, p.y])
          }
        }
      }
    }

    return points
  }
  if (attrKey === "stroke") {
    const strokeObj: any = {}
    for (const strokeElm of val) {
      const strokePropKey = strokeElm[0].valueOf()
      strokeObj[strokePropKey] = formatAttr(strokeElm.slice(1), strokePropKey)
    }
    return strokeObj
  }
  if (
    attrKey === "at" ||
    attrKey === "size" ||
    attrKey === "start" ||
    attrKey === "mid" ||
    attrKey === "end"
  ) {
    // Some KiCad versions may include non-numeric flags like "unlocked" in
    // the (at ...) attribute. Filter out any non-numeric tokens before parsing.
    const nums = (Array.isArray(val) ? val : [val])
      .map((n: any) => n?.valueOf?.() ?? n)
      .filter(
        (v: any) =>
          typeof v === "number" ||
          (typeof v === "string" && /^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(v)),
      )
      .map((v: any) => (typeof v === "number" ? v : Number.parseFloat(v)))

    return nums
  }
  if (attrKey === "tags") {
    return val.map((n: any) => n.valueOf())
  }
  if (attrKey === "generator_version" || attrKey === "version") {
    return val[0].valueOf()
  }
  if (val.length === 2) {
    return val.valueOf()
  }
  if (attrKey === "uuid") {
    if (Array.isArray(val)) {
      return val[0].valueOf()
    }
    return val.valueOf()
  }
  if (/^[\d\.]+$/.test(val) && !Number.isNaN(Number.parseFloat(val))) {
    return Number.parseFloat(val)
  }
  if (Array.isArray(val) && val.length === 1) {
    return val[0].valueOf()
  }
  if (Array.isArray(val)) {
    return val.map((s) => s.valueOf())
  }
  return val
}

export const getAttr = (s: Array<any>, key: string) => {
  for (const elm of s) {
    if (Array.isArray(elm) && elm[0] === key) {
      return formatAttr(elm.slice(1), key)
    }
  }
}
