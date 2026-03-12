import { AsyncApiTreeNode } from "@netcracker/qubership-apihub-next-data-model/model/async-api/types/aliases"
import { FC } from "react"
import "../styles/styles.css"
import { SizeVariant } from "../types/SizeVariant"

export type SelectorOption = {
  title: string
  node: AsyncApiTreeNode
  testId?: string
}

type SelectorProps = {
  options: SelectorOption[]
  selectedOption: SelectorOption | null
  onSelectOption: (option: SelectorOption) => void
  variant: SizeVariant
}

export const Selector: FC<SelectorProps> = (props) => {
  const { options, selectedOption, onSelectOption, variant } = props

  if (options.length === 0) {
    return null
  }

  return (
    <div className='flex flex-row gap-2'>
      {options.map((option) => {
        return (
          <button
            key={option.node.id}
            data-testid={option.testId}
            className={`button-selector-option button-selector-option_${variant} ${selectedOption === option ? 'selected' : ''}`}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onSelectOption(option)
            }}
          >
            {option.title}
          </button>
        )
      })}
    </div>
  )
}