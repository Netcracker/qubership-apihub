// i look at all library from https://www.akselipalen.com/2021/06/10/2d-geometry-libraries-for-javascript/ and no one contains mutable geometries
import { Length, Point, Size } from 'main/domain/base'

export class ImmutableRectangle {
  private readonly _center: Point<Length>
  private readonly _size: Size<Length>

  constructor(center: Point<Length>, size: Size<Length>) {
    this._center = { ...center }
    this._size = { ...size }
  }

  get width(): Length {
    return this._size.width
  }

  get height(): Length {
    return this._size.height
  }

  get centerX(): Length {
    return this._center.x
  }

  get centerY(): Length {
    return this._center.y
  }
}