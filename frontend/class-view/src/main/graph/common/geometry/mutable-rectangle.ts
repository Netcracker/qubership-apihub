// i look at all library from https://www.akselipalen.com/2021/06/10/2d-geometry-libraries-for-javascript/ and no one contains mutable geometries
import { Length, Point, Size } from 'main/domain/base'
import { ImmutableRectangle } from 'main/graph/common/geometry/immutable-rectangle'

export class MutableRectangle {
  private minX: Length
  private minY: Length
  private maxX: Length
  private maxY: Length

  constructor() {
    this.minX = NaN
    this.minY = NaN
    this.maxX = NaN
    this.maxY = NaN
  }

  public addPoint(point: Point<Length>): this {
    if (!this.isFinite()) {
      this.minX = point.x
      this.minY = point.y
      this.maxX = point.x
      this.maxY = point.y
    } else {
      this.minX = Math.min(this.minX, point.x)
      this.minY = Math.min(this.minY, point.y)
      this.maxX = Math.max(this.maxX, point.x)
      this.maxY = Math.max(this.maxY, point.y)
    }
    return this
  }

  public addRectangle(center: Point<Length>, size: Size<Length>): this {
    if (!this.isFinite()) {
      this.minX = center.x - size.width / 2.0
      this.minY = center.y - size.height / 2.0
      this.maxX = center.x + size.width / 2.0
      this.maxY = center.y + size.height / 2.0
    } else {
      this.minX = Math.min(this.minX, center.x - size.width / 2.0)
      this.minY = Math.min(this.minY, center.y - size.height / 2.0)
      this.maxX = Math.max(this.maxX, center.x + size.width / 2.0)
      this.maxY = Math.max(this.maxY, center.y + size.height / 2.0)
    }
    return this
  }

  public isFinite(): boolean {
    return isFinite(this.minX) && isFinite(this.minY) && isFinite(this.maxX) && isFinite(this.maxY)
  }

  public toImmutable(): ImmutableRectangle {
    return new ImmutableRectangle({
      x: (this.maxX + this.minX) / 2.0,
      y: (this.maxY + this.minY) / 2.0,
    }, { width: this.maxX - this.minX, height: this.maxY - this.minY })
  }
}