import { SelectableLike } from 'main/domain/like/all'
import { Pixel, Point, Zoom } from 'main/domain/base'

export interface ViewCallback {
  layoutStart(): void;

  layoutFinish(): void;

  selectionChange(selection: SelectableLike[]): void;

  zoomChange(zoom: Zoom): void;

  viewportCenterChange(center: Point<Pixel>): void;
}