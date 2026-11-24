import { cn } from "@apihub/utils/common/cn"
import { DiffsClassesBuilder } from "@netcracker/qubership-apihub-next-data-model/building-service/abstract/tree-with-diffs/node-diffs-data/utilities"
import { HighlightVariant } from "@netcracker/qubership-apihub-next-data-model/model/abstract/tree-with-diffs/tree-node.interface"
import { FC } from "react"

type OptionKeyTextProps = {
  text: string
  /** Text highlighter from the data layer (a renamed media type / response code); none = plain text. */
  highlight: HighlightVariant | undefined
}

/**
 * Title of a media-type / response-code selector option. Unchanged options keep the bare text, so
 * their markup does not change. A highlighted title carries `openapi-option-key-text`, the hook of its
 * text color in `shared-styles/colors/openapi.css` (other selectors keep the button's text color).
 */
export const OptionKeyText: FC<OptionKeyTextProps> = ({ text, highlight }) => (
  highlight
    ? <span className={cn(`openapi-option-key-text ${DiffsClassesBuilder.highlighter(highlight)}`)}>{text}</span>
    : <>{text}</>
)
