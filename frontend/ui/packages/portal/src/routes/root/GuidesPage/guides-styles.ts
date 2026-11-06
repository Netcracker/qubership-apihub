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

/**
 * Visual tokens of the developer portal pages, taken from the dev portal prototype so the guides
 * read as the same product. They stay local to the guides pages: the shared APIHUB theme styles the rest.
 */
export const GUIDES_COLOURS = {
  primary: '#0068FF',
  primaryDark: '#0052EE',
  primaryLight: '#E1F0FE',
  textPrimary: '#24292F',
  textSecondary: '#57606A',
  textMuted: '#8F9EB4',
  border: '#D0D7DE',
  borderLight: '#D5DCE3',
  ground: '#F6F8FA',
} as const

export const GUIDES_CARD_SHADOW = '0 1px 2px rgba(36, 41, 47, 0.06)'
export const GUIDES_CARD_SHADOW_HOVER = '0 12px 28px rgba(0, 104, 255, 0.14)'

export const GUIDES_CONTAINER_MAX_WIDTH = 1200
export const GUIDES_SIDEBAR_WIDTH = 264

/** Bordered white card with the prototype's hover lift. */
export const GUIDES_CARD_SX = {
  bgcolor: '#FFFFFF',
  border: `1px solid ${GUIDES_COLOURS.borderLight}`,
  borderRadius: '10px',
  boxShadow: GUIDES_CARD_SHADOW,
  transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
}

export const GUIDES_CARD_HOVER_SX = {
  '&:hover': { transform: 'translateY(-2px)', boxShadow: GUIDES_CARD_SHADOW_HOVER, borderColor: GUIDES_COLOURS.primary },
}

export const GUIDES_PAGE_TITLE_SX = {
  fontSize: 34,
  fontWeight: 700,
  lineHeight: 1.15,
  letterSpacing: '-0.02em',
  color: GUIDES_COLOURS.textPrimary,
}

export const GUIDES_SECTION_TITLE_SX = {
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1.25,
  letterSpacing: '-0.01em',
  color: GUIDES_COLOURS.textPrimary,
}

export const GUIDES_CARD_TITLE_SX = {
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.4,
  color: GUIDES_COLOURS.textPrimary,
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
}

export const GUIDES_CARD_TEXT_SX = {
  fontSize: 13.5,
  lineHeight: 1.55,
  color: GUIDES_COLOURS.textSecondary,
}

export const GUIDES_SUBTITLE_SX = {
  fontSize: 17,
  lineHeight: 1.55,
  color: GUIDES_COLOURS.textSecondary,
}
