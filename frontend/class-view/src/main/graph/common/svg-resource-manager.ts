import { Selection } from 'd3'
import { isDefine } from 'main/core/utils'
import { Pixel, Point } from 'main/domain'
import { MutableRectangle } from 'main/graph/common/geometry/mutable-rectangle'

export interface SvgResourceDefiner {
  addDefinition(name: PropertyKey, newDef: SVGElement | HTMLElement): void //todo maybe async in future. But we should stop render finish to wait it
}

export interface SvgResourceReader {
  resolveDefinition(name: PropertyKey): SVGElement['id']

  resolveAbsoluteJointPointsMask(): SVGElement['id']
}

export class SvgResourceManager implements SvgResourceDefiner, SvgResourceReader {

  private readonly _defs: Selection<SVGDefsElement, undefined, SVGSVGElement, undefined>
  private readonly _idGenerator: () => SVGElement['id']
  private readonly _association: Map<PropertyKey, SVGElement['id']>
  private readonly _absoluteJoinPointsMask: Selection<SVGMaskElement, undefined, SVGDefsElement, undefined>

  constructor(svg: Selection<SVGSVGElement, undefined, HTMLElement, undefined>) {
    this._defs = svg.selectChildren('defs').data<undefined>([undefined]).enter().append('defs')
    this._association = new Map()
    let counter = 0
    this._idGenerator = () => {
      return `generated_defs_id_${counter++}`
    }
    this._absoluteJoinPointsMask = this._defs
      .append('mask')
      .attr('id', this._idGenerator())
      .attr('maskContentUnits', 'userSpaceOnUse')
    this._absoluteJoinPointsMask.append('rect')
      .attr('x', '0%')
      .attr('y', '0%')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'white')
    // .attr('opacity', '0.05')
  }

  addDefinition(name: PropertyKey, newDef: SVGElement): void {
    if (this._association.has(name)) {
      throw new Error(`${name.toString()} already in use`)
    }
    const newId = this._idGenerator()
    this._defs.each(function () {
      newDef.id = newId
      this.appendChild(newDef)
    })
    this._association.set(name, newId)
  }

  resolveDefinition(name: PropertyKey): SVGElement['id'] {
    const id = this._association.get(name)
    if (!isDefine(id)) {
      throw new Error(`Name ${name.toString()} not defined`)
    }
    return id
  }

  resolveAbsoluteJointPointsMask(): SVGElement['id'] {
    return this._absoluteJoinPointsMask.attr('id')
  }

  setAbsoluteJointPointsMask(joinPoints: Point<Pixel>[], radius: Pixel) {
    const mutableRectangle = new MutableRectangle()
    joinPoints.forEach(pt => mutableRectangle.addPoint(pt))

    if (mutableRectangle.isFinite()) {
      const bbox = mutableRectangle.toImmutable()
      this._absoluteJoinPointsMask.select('rect')
        .attr('x', bbox.centerX - bbox.width / 2.0)
        .attr('y', bbox.centerY - bbox.height / 2.0)
        .attr('width', bbox.width)
        .attr('height', bbox.height)
    }

    this._absoluteJoinPointsMask
      .selectChildren<SVGCircleElement, Point<Pixel>>('circle')
      .data(joinPoints)
      .join(elem => elem
        .append('circle')
        .attr('cx', datum => datum.x)
        .attr('cy', datum => datum.y)
        .attr('r', radius)
        .attr('fill', 'black'),
      )
  }
}