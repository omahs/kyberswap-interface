import { AnimatePresence, motion } from 'framer-motion'
import { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

import { useOnClickOutside } from 'hooks/useOnClickOutside'

import { DropdownArrowIcon } from './ArrowRotate'

const SelectWrapper = styled.div`
  cursor: pointer;
  border-radius: 12px;
  background: ${({ theme }) => theme.buttonBlack};
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  font-size: 12px;
  color: ${({ theme }) => theme.subText};
  padding: 12px;
  :hover {
    filter: brightness(1.2);
    z-index: 10;
  }
`

const SelectMenu = styled(motion.div)`
  position: absolute;
  top: 40px;
  left: 0;
  right: 0;
  margin: auto;
  border-radius: 16px;
  filter: drop-shadow(0px 4px 12px rgba(0, 0, 0, 0.36));
  z-index: 2;
  background: ${({ theme }) => theme.tabActive};
  padding: 10px 0px;
  width: max-content;
`

const Option = styled.div<{ $selected: boolean }>`
  padding: 10px 18px;
  cursor: pointer;
  font-size: 12px;
  color: ${({ theme }) => theme.subText};
  white-space: nowrap;
  &:hover {
    background-color: ${({ theme }) => theme.background};
  }
  font-weight: ${({ $selected }) => ($selected ? '500' : 'unset')};
`

const SelectedWrap = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`
export type SelectOption = { value?: string | number; label: ReactNode; onSelect?: () => void }

const getOptionValue = (option: SelectOption | undefined) => {
  if (!option) return ''
  return typeof option !== 'object' ? option : option.value ?? ''
}
const getOptionLabel = (option: SelectOption | undefined) => {
  if (!option) return ''
  return typeof option !== 'object' ? option : option.label || option.value
}

function isElementOverflowBottom(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  return rect.bottom >= (window.innerHeight || document?.documentElement?.clientHeight)
}

function Select({
  options = [],
  activeRender,
  optionRender,
  style = {},
  menuStyle = {},
  optionStyle = {},
  onChange,
  value: selectedValue,
  className,
  forceMenuPlacementTop = false,
  arrowColor,
  dropdownRender,
}: {
  value?: string | number
  className?: string
  options: SelectOption[]
  dropdownRender?: (menu: ReactNode) => ReactNode
  activeRender?: (selectedItem: SelectOption | undefined) => ReactNode
  optionRender?: (option: SelectOption | undefined) => ReactNode
  style?: CSSProperties
  menuStyle?: CSSProperties
  optionStyle?: CSSProperties
  onChange?: (value: any) => void
  forceMenuPlacementTop?: boolean
  arrowColor?: string
}) {
  const [selected, setSelected] = useState(getOptionValue(options?.[0]))
  const [showMenu, setShowMenu] = useState(false)
  const [menuPlacementTop, setForceMenuPlacementTop] = useState(forceMenuPlacementTop)

  useEffect(() => {
    const findValue = options.find(item => getOptionValue(item) === selectedValue)?.value
    setSelected(findValue || getOptionValue(options?.[0]))
  }, [selectedValue, options])

  useEffect(() => {
    if (!refMenu?.current) return
    if (!menuPlacementTop) setForceMenuPlacementTop(showMenu && isElementOverflowBottom(refMenu.current))
  }, [showMenu, menuPlacementTop])

  const ref = useRef(null)
  useOnClickOutside(ref, () => {
    setShowMenu(false)
  })
  const selectedInfo = options.find(item => getOptionValue(item) === selected)
  const refMenu = useRef<HTMLDivElement>(null)

  const renderMenu = () => {
    return options.map(item => {
      const value = getOptionValue(item)
      const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()
        e.preventDefault()
        setShowMenu(prev => !prev)
        if (item.onSelect) item.onSelect?.()
        else {
          setSelected(value)
          onChange?.(value)
        }
      }
      return (
        <Option
          key={value}
          role="button"
          $selected={value === selectedValue || value === getOptionValue(selectedInfo)}
          onClick={onClick}
          style={optionStyle}
        >
          {optionRender ? optionRender(item) : getOptionLabel(item)}
        </Option>
      )
    })
  }

  return (
    <SelectWrapper
      ref={ref}
      role="button"
      onClick={() => {
        setShowMenu(!showMenu)
      }}
      style={style}
      className={className}
    >
      <SelectedWrap>{activeRender ? activeRender(selectedInfo) : getOptionLabel(selectedInfo)}</SelectedWrap>
      <DropdownArrowIcon rotate={showMenu} color={arrowColor} />
      <AnimatePresence>
        {showMenu && (
          <SelectMenu
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.1 }}
            style={{ ...menuStyle, ...(menuPlacementTop ? { bottom: 40, top: 'unset' } : {}) }}
            ref={refMenu}
          >
            {dropdownRender ? dropdownRender(renderMenu()) : renderMenu()}
          </SelectMenu>
        )}
      </AnimatePresence>
    </SelectWrapper>
  )
}

export default styled(Select)``
