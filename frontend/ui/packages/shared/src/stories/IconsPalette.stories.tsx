import { Box, Grid, Paper, type SvgIconProps, Typography, useTheme } from '@mui/material'
import type { Meta, StoryObj } from '@storybook/react'
import React, { memo, useMemo } from 'react'
import { SECONDARY_TEXT_COLOR } from '../themes/colors'
import { createVariantStory } from './commons/utils'

import { AddIcon } from '../icons/AddIcon'
import { AddSquareIcon } from '../icons/AddSquareIcon'
import { ApiIcon } from '../icons/ApiIcon'
import { ArrowDown } from '../icons/ArrowDown'
import { ArrowUp } from '../icons/ArrowUp'
import { AutomationIcon } from '../icons/AutomationIcon'
import { CalendarIcon } from '../icons/CalendarIcon'
import { CertifiedFileIcon } from '../icons/CertifiedFileIcon'
import { CheckboxCheckedIcon } from '../icons/CheckboxCheckedIcon'
import { CheckboxDisabledCheckedIcon } from '../icons/CheckboxDisabledCheckedIcon'
import { CheckboxDisabledIcon } from '../icons/CheckboxDisabledIcon'
import { CheckboxIcon } from '../icons/CheckboxIcon'
import { CheckIcon } from '../icons/CheckIcon'
import { ClockBackwardIcon } from '../icons/ClockBackwardIcon'
import { CloseIcon } from '../icons/CloseIcon'
import { CloudIcon } from '../icons/CloudIcon'
import { CloudSettingsIcon } from '../icons/CloudSettingsIcon'
import { CloudUploadIcon } from '../icons/CloudUploadIcon'
import { ComparisonIcon } from '../icons/ComparisonIcon'
import { ComponentIcon } from '../icons/ComponentIcon'
import { ConfigureIcon } from '../icons/ConfigureIcon'
import { DashboardIcon } from '../icons/DashboardIcon'
import { DefaultSideBarIcon } from '../icons/DefaultSideBarIcon'
import { DeleteIcon } from '../icons/DeleteIcon'
import { DeleteIconMui } from '../icons/DeleteIconMui'
import { DoneIcon } from '../icons/DoneIcon'
import { DownloadIcon } from '../icons/DownloadIcon'
import { DownloadIconMui } from '../icons/DownloadIconMui'
import { DragIcon } from '../icons/DragIcon'
import { EditIcon } from '../icons/EditIcon'
import { EmptyUserIcon } from '../icons/EmptyUserIcon'
import { ErrorIcon } from '../icons/ErrorIcon'
import { ExitIcon } from '../icons/ExitIcon'
import { FileIcon } from '../icons/FileIcon'
import { FilterIcon } from '../icons/FilterIcon'
import { FolderIcon } from '../icons/FolderIcon'
import { GraphqlIcon } from '../icons/GraphqlIcon'
import { GroupIcon } from '../icons/GroupIcon'
import { HomeIcon } from '../icons/HomeIcon'
import { InfoContextIcon } from '../icons/InfoContextIcon'
import { JsonSchemaIcon } from '../icons/JsonSchemaIcon'
import { KeyboardDoubleArrowLeftIcon } from '../icons/KeyboardDoubleArrowLeftIcon'
import { KeyboardDoubleArrowRightIcon } from '../icons/KeyboardDoubleArrowRightIcon'
import { KeyIcon } from '../icons/KeyIcon'
import { LayersIcon } from '../icons/LayersIcon'
import { LinkIcon } from '../icons/LinkIcon'
import { LockIcon } from '../icons/LockIcon'
import { LockOpenIcon } from '../icons/LockOpenIcon'
import { LogoIcon } from '../icons/LogoIcon'
import { MarkdownIcon } from '../icons/MarkdownIcon'
import { MergeIcon } from '../icons/MergeIcon'
import { MinusIcon } from '../icons/MinusIcon'
import { OpenapiIcon } from '../icons/OpenapiIcon'
import { OverviewIcon } from '../icons/OverviewIcon'
import { PackageIcon } from '../icons/PackageIcon'
import { PlayIcon } from '../icons/PlayIcon'
import { PlusIcon } from '../icons/PlusIcon'
import { PortalSettingsIcon } from '../icons/PortalSettingsIcon'
import { ProtobufIcon } from '../icons/ProtobufIcon'
import { PublishIcon } from '../icons/PublishIcon'
import { RestApiIcon } from '../icons/RestApiIcon'
import { RobotIcon } from '../icons/RobotIcon'
import { SegmentItemIcon } from '../icons/SegmentItemIcon'
import { ServicesIcon } from '../icons/ServicesIcon'
import { SettingIcon } from '../icons/SettingIcon'
import { ShareIcon } from '../icons/ShareIcon'
import { SliderIcon } from '../icons/SliderIcon'
import { SnapshotsIcon } from '../icons/SnapshotsIcon'
import { SwaggerIcon } from '../icons/SwaggerIcon'
import { ToLeftIcon } from '../icons/ToLeftIcon'
import { ToRightIcon } from '../icons/ToRightIcon'
import { TreeIcon } from '../icons/TreeIcon'
import { UploadIcon } from '../icons/UploadIcon'
import { UploadImageIcon } from '../icons/UploadImageIcon'
import { VersionIcon } from '../icons/VersionIcon'
import { RedWarningCircleIcon, YellowWarningCircleIcon } from '../icons/WarningCircleIcon'
import { DefaultWarningIcon, RedWarningIcon, YellowWarningIcon } from '../icons/WarningIcon'

type CustomIconComponent = React.FC<{ color?: string; size?: number }>
type MuiIconComponent = React.FC<SvgIconProps>

interface IconItem<T> {
  readonly name: string
  readonly component: T
}

type BackgroundColor = 'white' | 'gray' | 'blue'

interface BasePaletteProps {
  backgroundColor: BackgroundColor
}

const CUSTOM_ICONS_REGISTRY: readonly IconItem<CustomIconComponent>[] = [
  { name: 'AddIcon', component: AddIcon },
  { name: 'AddSquareIcon', component: AddSquareIcon },
  { name: 'ApiIcon', component: ApiIcon },
  { name: 'ArrowDown', component: ArrowDown },
  { name: 'ArrowUp', component: ArrowUp },
  { name: 'AutomationIcon', component: AutomationIcon },
  { name: 'CalendarIcon', component: CalendarIcon },
  { name: 'CertifiedFileIcon', component: CertifiedFileIcon },
  { name: 'CheckIcon', component: CheckIcon },
  { name: 'CheckboxCheckedIcon', component: CheckboxCheckedIcon },
  { name: 'CheckboxDisabledCheckedIcon', component: CheckboxDisabledCheckedIcon },
  { name: 'CheckboxDisabledIcon', component: CheckboxDisabledIcon },
  { name: 'CheckboxIcon', component: CheckboxIcon },
  { name: 'CloudIcon', component: CloudIcon },
  { name: 'CloudSettingsIcon', component: CloudSettingsIcon },
  { name: 'ComparisonIcon', component: ComparisonIcon },
  { name: 'ComponentIcon', component: ComponentIcon },
  { name: 'ConfigureIcon', component: ConfigureIcon },
  { name: 'DashboardIcon', component: DashboardIcon },
  { name: 'DefaultSideBarIcon', component: DefaultSideBarIcon },
  { name: 'DeleteIcon', component: DeleteIcon },
  { name: 'DoneIcon', component: DoneIcon },
  { name: 'DownloadIcon', component: DownloadIcon },
  { name: 'DragIcon', component: DragIcon },
  { name: 'EditIcon', component: EditIcon },
  { name: 'EmptyUserIcon', component: EmptyUserIcon },
  { name: 'ExitIcon', component: ExitIcon },
  { name: 'FileIcon', component: FileIcon },
  { name: 'FilterIcon', component: FilterIcon },
  { name: 'FolderIcon', component: FolderIcon },
  { name: 'GraphqlIcon', component: GraphqlIcon },
  { name: 'GroupIcon', component: GroupIcon },
  { name: 'HomeIcon', component: HomeIcon },
  { name: 'JsonSchemaIcon', component: JsonSchemaIcon },
  { name: 'KeyIcon', component: KeyIcon },
  { name: 'KeyboardDoubleArrowLeftIcon', component: KeyboardDoubleArrowLeftIcon },
  { name: 'KeyboardDoubleArrowRightIcon', component: KeyboardDoubleArrowRightIcon },
  { name: 'LayersIcon', component: LayersIcon },
  { name: 'LockIcon', component: LockIcon },
  { name: 'LockOpenIcon', component: LockOpenIcon },
  { name: 'LogoIcon', component: LogoIcon },
  { name: 'MarkdownIcon', component: MarkdownIcon },
  { name: 'MergeIcon', component: MergeIcon },
  { name: 'MinusIcon', component: MinusIcon },
  { name: 'OpenapiIcon', component: OpenapiIcon },
  { name: 'OverviewIcon', component: OverviewIcon },
  { name: 'PackageIcon', component: PackageIcon },
  { name: 'PortalSettingsIcon', component: PortalSettingsIcon },
  { name: 'ProtobufIcon', component: ProtobufIcon },
  { name: 'PublishIcon', component: PublishIcon },
  { name: 'RestApiIcon', component: RestApiIcon },
  { name: 'SegmentItemIcon', component: SegmentItemIcon },
  { name: 'ServicesIcon', component: ServicesIcon },
  { name: 'SettingIcon', component: SettingIcon },
  { name: 'ShareIcon', component: ShareIcon },
  { name: 'SliderIcon', component: SliderIcon },
  { name: 'SnapshotsIcon', component: SnapshotsIcon },
  { name: 'SwaggerIcon', component: SwaggerIcon },
  { name: 'ToLeftIcon', component: ToLeftIcon },
  { name: 'ToRightIcon', component: ToRightIcon },
  { name: 'TreeIcon', component: TreeIcon },
  { name: 'UploadIcon', component: UploadIcon },
  { name: 'UploadImageIcon', component: UploadImageIcon },
  { name: 'VersionIcon', component: VersionIcon },
  { name: 'YellowWarningCircleIcon', component: YellowWarningCircleIcon },
  { name: 'RedWarningCircleIcon', component: RedWarningCircleIcon },
  { name: 'DefaultWarningIcon', component: DefaultWarningIcon },
  { name: 'YellowWarningIcon', component: YellowWarningIcon },
  { name: 'RedWarningIcon', component: RedWarningIcon },
] as const

const MUI_ICONS_REGISTRY: readonly IconItem<MuiIconComponent>[] = [
  { name: 'InfoContextIcon', component: InfoContextIcon },
  { name: 'ClockBackwardIcon', component: ClockBackwardIcon },
  { name: 'CloseIcon', component: CloseIcon },
  { name: 'CloudUploadIcon', component: CloudUploadIcon },
  { name: 'DeleteIconMui', component: DeleteIconMui },
  { name: 'DownloadIconMui', component: DownloadIconMui },
  { name: 'ErrorIcon', component: ErrorIcon },
  { name: 'LinkIcon', component: LinkIcon },
  { name: 'PlayIcon', component: PlayIcon },
  { name: 'PlusIcon', component: PlusIcon },
  { name: 'RobotIcon', component: RobotIcon },
] as const

const BACKGROUND_COLORS: Record<BackgroundColor, string> = {
  white: '#ffffff',
  gray: '#f5f5f5', // This matches theme.palette.background.default
  blue: '#0068FF', // This matches theme.palette.primary.main
} as const

const MUI_ICON_COLORS = [
  'muted',
  'inherit',
  'primary',
  'secondary',
  'action',
  'disabled',
  'hint',
  'error',
  'info',
  'information',
  'success',
  'warning',
  undefined,
] as const

const MUI_ICON_SIZES = [
  'inherit',
  'extra-small',
  'small',
  'medium',
  'large',
  undefined,
] as const

const ICON_CONTAINER_MIN_HEIGHT = 76
const ICON_CONTAINER_MIN_WIDTH = 76
const ICON_NAME_FONT_SIZE = '0.75rem'
const ICON_NAME_LINE_HEIGHT = 1.2

interface IconCardProps {
  backgroundColor: BackgroundColor
  children: React.ReactNode
}

const IconCard = memo<IconCardProps>(({ backgroundColor, children }) => {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: ICON_CONTAINER_MIN_HEIGHT,
        minWidth: ICON_CONTAINER_MIN_WIDTH,
        backgroundColor: BACKGROUND_COLORS[backgroundColor],
      }}
    >
      {children}
    </Paper>
  )
})

interface IconWithNameProps {
  name: string
  backgroundColor: BackgroundColor
  children: React.ReactNode
}

const IconWithName = memo<IconWithNameProps>(({ name, backgroundColor, children }) => {
  const theme = useTheme()

  return (
    <Grid item xs={6} sm={4} md={3} lg={2}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <IconCard backgroundColor={backgroundColor}>
          {children}
        </IconCard>
        <Typography
          variant="caption"
          sx={{
            fontSize: ICON_NAME_FONT_SIZE,
            lineHeight: ICON_NAME_LINE_HEIGHT,
            color: theme.palette.text.primary,
            wordBreak: 'break-word',
            hyphens: 'auto',
            minWidth: 0,
            flex: '1 1 auto',
          }}
        >
          {name}
        </Typography>
      </Box>
    </Grid>
  )
})

interface IconsPaletteContainerProps {
  title: string
  description: string
  children: React.ReactNode
}

const IconsPaletteContainer: React.FC<IconsPaletteContainerProps> = ({ title, description, children }) => (
  <Box sx={{ p: 2 }}>
    <Typography variant="h4" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body1" color="text.secondary" gutterBottom>
      {description}
    </Typography>
    <Grid container spacing={2} sx={{ mt: 2 }}>
      {children}
    </Grid>
  </Box>
)

interface CustomIconsPaletteProps extends BasePaletteProps {
  color: string
  size?: number
}

const CustomIconsPalette = memo<CustomIconsPaletteProps>(({ backgroundColor, color, size }) => {
  const iconItems = useMemo(
    () =>
      CUSTOM_ICONS_REGISTRY.map(({ name, component: IconComponent }) => (
        <IconWithName key={name} name={name} backgroundColor={backgroundColor}>
          <IconComponent
            color={color}
            size={size}
          />
        </IconWithName>
      )),
    [backgroundColor, color, size],
  )

  return (
    <IconsPaletteContainer
      title="Custom SVG Icons"
      description="Custom SVG icons in the qubership-apihub-ui icon library"
    >
      {iconItems}
    </IconsPaletteContainer>
  )
})

interface MuiIconsPaletteProps extends BasePaletteProps, Partial<SvgIconProps> {}

const MuiIconsPalette = memo<MuiIconsPaletteProps>(({ backgroundColor, ...iconProps }) => {
  const iconItems = useMemo(
    () =>
      MUI_ICONS_REGISTRY.map(({ name, component: IconComponent }) => (
        <IconWithName key={name} name={name} backgroundColor={backgroundColor}>
          <IconComponent {...iconProps} />
        </IconWithName>
      )),
    [backgroundColor, iconProps],
  )

  return (
    <IconsPaletteContainer
      title="MUI Icons"
      description="MUI-based icons in the qubership-apihub-ui icon library"
    >
      {iconItems}
    </IconsPaletteContainer>
  )
})

const meta: Meta = {
  title: 'Design System/Icons',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A comprehensive palette of all available icons in the qubership-apihub-ui design system.',
      },
    },
  },
}

export default meta

export const CustomIcons: StoryObj<typeof CustomIconsPalette> = {
  render: (args) => <CustomIconsPalette {...args} />,
  args: {
    backgroundColor: 'white',
    color: SECONDARY_TEXT_COLOR,
    size: undefined,
  },
  argTypes: {
    backgroundColor: {
      control: { type: 'radio' },
      options: Object.keys(BACKGROUND_COLORS) as BackgroundColor[],
      description: 'Background color for icon cards. Choose from predefined theme colors.',
    },
    color: {
      control: { type: 'color' },
      description: 'Custom color for SVG icons. Accepts any valid CSS color value.',
    },
    size: {
      control: { type: 'number', min: 8, max: 64, step: 2 },
      description: 'Custom size for icons in pixels. Optional control.',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive showcase of all custom SVG icons in the design system. Use the controls to test different color combinations and backgrounds. Icons are optimized for accessibility and include hover effects.',
      },
    },
  },
}

export const MuiIcons: StoryObj<typeof MuiIconsPalette> = {
  render: (args) => <MuiIconsPalette {...args} />,
  args: {
    backgroundColor: 'white',
    color: 'muted',
    fontSize: 'medium',
    htmlColor: undefined,
    titleAccess: undefined,
    viewBox: undefined,
    sx: undefined,
  },
  argTypes: {
    backgroundColor: {
      control: { type: 'radio' },
      options: Object.keys(BACKGROUND_COLORS) as BackgroundColor[],
      description: 'Background color for icon cards. Choose from predefined theme colors.',
    },
    color: {
      control: { type: 'radio' },
      options: MUI_ICON_COLORS,
      description: 'Semantic color for MUI icons. Uses theme palette colors for consistency.',
    },
    fontSize: {
      control: { type: 'radio' },
      options: MUI_ICON_SIZES,
      description: 'Size variant for MUI icons. Follows Material Design size guidelines.',
    },
    htmlColor: {
      control: { type: 'color' },
      description: 'Applies a color attribute to the SVG element. Optional control.',
    },
    titleAccess: {
      control: { type: 'text' },
      description: 'Provides a human-readable title for the element. Optional control.',
    },
    viewBox: {
      control: { type: 'text' },
      description:
        'Allows you to redefine what the coordinates without units mean inside an SVG element. Optional control.',
    },
    sx: {
      control: { type: 'object' },
      description:
        'System prop that allows defining system overrides as well as additional CSS styles. Optional control.',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive showcase of all MUI-based icons in the design system. These icons follow Material Design principles and support theme-aware colors and standardized sizes. Use the controls to explore different combinations.',
      },
    },
  },
}

export const MuiIconColors: StoryObj = createVariantStory(InfoContextIcon, 'color', MUI_ICON_COLORS)

export const MuiIconSizes: StoryObj = createVariantStory(InfoContextIcon, 'fontSize', MUI_ICON_SIZES)
