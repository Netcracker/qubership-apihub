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

import { Color, Duration, FontWeight, Insets, OneLineText, Pixel, Point } from 'main/domain/base'
import { Shape, SHAPE_ROUND_RECTANGLE } from 'main/domain'

export const DEFAULT_ZOOM = 1
export const DEFAULT_VIEWPORT_CENTER: Point<Pixel> = { x: 0, y: 0 }
export const DEFAULT_CONTENT_INSETS: Insets<Pixel> = { top: 10, bottom: 10, left: 10, right: 10 }
export const DEFAULT_EDGE_SMOOTH_RADIUS: Pixel = 10
//0.75pt = 1px
export const DEFAULT_CLASS_WIDTH: Pixel = 300
export const DEFAULT_CLASS_MARGIN_TOP: Pixel = 8
export const DEFAULT_CLASS_MARGIN_BOTTOM: Pixel = 8
export const DEFAULT_CLASS_MARGIN_LEFT: Pixel = 12
export const DEFAULT_CLASS_MARGIN_RIGHT: Pixel = 12
export const DEFAULT_CLASS_TITLE_LINE_HEIGHT: Pixel = 20
export const DEFAULT_CLASS_TITLE_FONT_SIZE: Pixel = 13
export const DEFAULT_CLASS_TITLE_FONT_WEIGHT: FontWeight = 600
export const DEFAULT_CLASS_SPLITTER_PADDING_LEFT: Pixel = 8
export const DEFAULT_CLASS_SPLITTER_PADDING_RIGHT: Pixel = 8
export const DEFAULT_CLASS_SPLITTER_PADDING_TOP: Pixel = 8
export const DEFAULT_CLASS_SPLITTER_PADDING_BOTTOM: Pixel = 8
export const DEFAULT_CLASS_SPLITTER_COLOR: Color = '#D5DCE3'
export const DEFAULT_CLASS_SPLITTER_LENGTH: Pixel = 1
export const DEFAULT_CLASS_NAME: OneLineText = 'unknown'
export const DEFAULT_CLASS_DEPRECATION = false
export const DEFAULT_CLASS_SHAPE: Shape = SHAPE_ROUND_RECTANGLE
export const DEFAULT_CLASS_PORT_WIDTH: Pixel = 10
export const DEFAULT_CLASS_ROUND_RECT_RADIUS: Pixel = 10
export const DEFAULT_CLASS_SHAPE_STROKE: Color = '#E7EAED'
export const DEFAULT_CLASS_SHAPE_STROKE_WIDTH: Pixel = 2
export const DEFAULT_CLASS_SHAPE_FILL_COLOR: Color = '#EDF1F5'
export const DEFAULT_CLASS_SHAPE_SELECTION_FILL_COLOR: Color = '#D6EDFF'
export const DEFAULT_CLASS_HEADER_HEIGHT: Pixel = DEFAULT_CLASS_MARGIN_TOP + DEFAULT_CLASS_TITLE_LINE_HEIGHT + DEFAULT_CLASS_SPLITTER_PADDING_TOP

export const DEFAULT_LEAF_PROPERTY_NAME: OneLineText = 'unknown'
export const DEFAULT_LEAF_PROPERTY_TYPE: OneLineText = 'unknown'
export const DEFAULT_LEAF_PROPERTY_TYPE_DEPRECATION = false
export const DEFAULT_LEAF_PROPERTY_REQUIRED = false
export const DEFAULT_LEAF_PROPERTY_DEPRECATION = false
export const DEFAULT_LEAF_PROPERTY_LINE_HEIGHT: Pixel = 14
export const DEFAULT_LEAF_PROPERTY_FONT_SIZE: Pixel = 11
export const DEFAULT_LEAF_PROPERTY_FONT_WEIGHT: FontWeight = 400
export const DEFAULT_LEAF_PROPERTY_PORT_WIDTH: Pixel = 10
export const DEFAULT_LEAF_PROPERTY_NAME_FONT_COLOR: Color = '#000000'
export const DEFAULT_LEAF_PROPERTY_REQUIRED_FONT_COLOR: Color = '#FF5260'
export const DEFAULT_LEAF_PROPERTY_TYPE_FONT_COLOR: Color = '#626D82'
export const DEFAULT_LEAF_PROPERTY_SELECTION_FILL_COLOR: Color = '#D6EDFF'
export const DEFAULT_LEAF_PROPERTY_SEPARATOR_LENGTH: Pixel = 4
export const DEFAULT_LEAF_PROPERTY_REQUIRED_CHARACTER: OneLineText = '*'

export const DEFAULT_PROPERTIES_GROUP_NAME = 'unknown'
export const DEFAULT_PROPERTIES_GROUP_DEPRECATION = false
export const DEFAULT_PROPERTIES_GROUP_TITLE_HEIGHT: Pixel = 20
export const DEFAULT_PROPERTIES_GROUP_FONT_SIZE: Pixel = 12
export const DEFAULT_PROPERTIES_GROUP_FONT_WEIGHT: FontWeight = 600
export const DEFAULT_PROPERTIES_GROUP_FONT_COLOR: Color = '#FFB02E'
export const DEFAULT_PROPERTIES_GROUP_ICON_SIZE: Pixel = 20
export const DEFAULT_PROPERTIES_GROUP_ICON_PADDING_LEFT: Pixel = 8
export const DEFAULT_PROPERTIES_GROUP_ICON_TO_NAME_SEPARATOR_LENGTH: Pixel = 4
export const DEFAULT_PROPERTIES_GROUP_TITLE_TO_CHILDREN_SEPARATOR_LENGTH: Pixel = 4
export const DEFAULT_PROPERTIES_GROUP_TITLE_PADDING_RIGHT: Pixel = 8
export const DEFAULT_PROPERTIES_GROUP_PORT_WIDTH: Pixel = 10
export const DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_LEFT: Pixel = 8
export const DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_RIGHT: Pixel = 8
export const DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_TOP: Pixel = 8
export const DEFAULT_PROPERTIES_GROUP_SPLITTER_PADDING_BOTTOM: Pixel = 8
export const DEFAULT_PROPERTIES_GROUP_SELECTION_FILL_COLOR: Color = '#D6EDFF'

export const DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_PRIMARY = true
export const DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_STROKE_COLOR: Color = '#FFB02E'
export const DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_SELECTION_STROKE_COLOR: Color = '#FF7A00'
export const DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_STROKE_WIDTH: Pixel = 2
export const DEFAULT_INCLUDE_PROPERTIES_GROUP_RELATION_SELECTION_STROKE_WIDTH: Pixel = 4

export const DEFAULT_PROPERTY_TO_CLASS_RELATION_PRIMARY = true
export const DEFAULT_PROPERTY_TO_CLASS_RELATION_STROKE_COLOR: Color = '#B4BFCF'
export const DEFAULT_PROPERTY_TO_CLASS_RELATION_SELECTION_STROKE_COLOR: Color = '#626D82'
export const DEFAULT_PROPERTY_TO_CLASS_RELATION_STROKE_WIDTH: Pixel = 2
export const DEFAULT_PROPERTY_TO_CLASS_RELATION_SELECTION_STROKE_WIDTH: Pixel = 4

export const DEFAULT_ANIMATION_DURATION: Duration = 500
export const DEFAULT_ELLIPSIS_CHARACTER = '…'
export const DEFAULT_FULL_TEXT_LABEL_ROUND_RECT_RADIUS: Pixel = 2