import { type EffectsObj, effects_def } from "./kicad-zod"

const ARC_SEGMENT_LENGTH_MM = 0.1
const POINT_EPSILON = 1e-6

type Point2 = [number, number]

const toNumber = (value: any): number => {
  const raw = value?.valueOf?.() ?? value
  return typeof raw === "number" ? raw : Number.parseFloat(raw)
}

const parsePoint = (node: any[]): Point2 | undefined => {
  if (!Array.isArray(node)) return undefined
  const [, x, y] = node
  if (x == null || y == null) return undefined
  return [toNumber(x), toNumber(y)]
}

const findArcComponent = (entry: any[], key: string) => {
  return entry.find(
    (candidate: any) =>
      Array.isArray(candidate) && candidate[0]?.valueOf?.() === key,
  )
}

const arePointsClose = (a: Point2, b: Point2): boolean => {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < POINT_EPSILON
}

const normalizeAngle = (angle: number): number => {
  const twoPi = Math.PI * 2
  return ((angle % twoPi) + twoPi) % twoPi
}

const computeCircleCenter = (
  start: Point2,
  mid: Point2,
  end: Point2,
): Point2 | undefined => {
  const [x1, y1] = start
  const [x2, y2] = mid
  const [x3, y3] = end

  const temp = x2 * x2 + y2 * y2
  const bc = (x1 * x1 + y1 * y1 - temp) / 2
  const cd = (temp - x3 * x3 - y3 * y3) / 2
  const det = (x1 - x2) * (y2 - y3) - (x2 - x3) * (y1 - y2)

  if (Math.abs(det) < 1e-9) {
    return undefined
  }

  const cx = (bc * (y2 - y3) - cd * (y1 - y2)) / det
  const cy = ((x1 - x2) * cd - (x2 - x3) * bc) / det
  return [cx, cy]
}

const approximateArc = (
  start: Point2,
  mid: Point2,
  end: Point2,
): Point2[] => {
  const center = computeCircleCenter(start, mid, end)
  if (!center) {
    return [start, end]
  }

  const [cx, cy] = center
  const radius = Math.hypot(start[0] - cx, start[1] - cy)
  if (radius < POINT_EPSILON) {
    return [start, end]
  }

  const startAngle = Math.atan2(start[1] - cy, start[0] - cx)
  const midAngle = Math.atan2(mid[1] - cy, mid[0] - cx)
  const endAngle = Math.atan2(end[1] - cy, end[0] - cx)

  const ccwStartMid = normalizeAngle(midAngle - startAngle)
  const ccwMidEnd = normalizeAngle(endAngle - midAngle)
  const ccwStartEnd = normalizeAngle(endAngle - startAngle)

  const isCcw = Math.abs(ccwStartMid + ccwMidEnd - ccwStartEnd) < 1e-6

  const totalAngle = isCcw
    ? ccwStartEnd
    : -normalizeAngle(startAngle - endAngle)

  if (Math.abs(totalAngle) < 1e-9) {
    return [start, end]
  }

  const arcLength = Math.abs(totalAngle) * radius
  const segments = Math.max(1, Math.ceil(arcLength / ARC_SEGMENT_LENGTH_MM))

  const points: Point2[] = [start]
  for (let i = 1; i <= segments; i++) {
    const angle = startAngle + (totalAngle * i) / segments
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    points.push([x, y])
  }

  // Ensure the final point matches the declared arc end point exactly
  points[points.length - 1] = end

  return points
}

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
    const points: Point2[] = []

    const pushPoint = (point: Point2 | undefined) => {
      if (!point) return
      const lastPoint = points[points.length - 1]
      if (lastPoint && arePointsClose(lastPoint, point)) {
        return
      }
      points.push(point)
    }

    for (const entry of val) {
      const entryType = entry?.[0]?.valueOf?.() ?? entry?.[0]
      if (entryType === "xy") {
        pushPoint(parsePoint(entry))
        continue
      }

      if (entryType === "arc") {
        const start = parsePoint(findArcComponent(entry, "start"))
        const mid = parsePoint(findArcComponent(entry, "mid"))
        const end = parsePoint(findArcComponent(entry, "end"))

        if (!start || !mid || !end) {
          continue
        }

        const arcPoints = approximateArc(start, mid, end)
        for (const arcPoint of arcPoints) {
          pushPoint(arcPoint)
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
