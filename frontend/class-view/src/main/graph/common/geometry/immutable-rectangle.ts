/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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