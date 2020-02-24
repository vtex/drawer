import React, {
  ReactElement,
  Suspense,
  useReducer,
  MouseEventHandler,
} from 'react'
import { defineMessages } from 'react-intl'
import { useCssHandles } from 'vtex.css-handles'
import { IconClose, IconMenu } from 'vtex.store-icons'
import { useChildBlock, ExtensionPoint } from 'vtex.render-runtime'

import Overlay from './Overlay'
import Portal from './Portal'
import useLockScroll from './modules/useLockScroll'

const Swipeable = React.lazy(() => import('./Swipeable'))

interface MenuState {
  isOpen: boolean
  hasBeenOpened: boolean
}

interface MenuAction {
  type: 'open' | 'close'
}

const initialMenuState: MenuState = {
  isOpen: false,
  hasBeenOpened: false,
}

function menuReducer(state: MenuState, action: MenuAction) {
  switch (action.type) {
    case 'open':
      return {
        ...state,
        isOpen: true,
        hasBeenOpened: true,
      }
    case 'close':
      return {
        ...state,
        isOpen: false,
      }
    default:
      return state
  }
}

const useMenuState = () => {
  const [state, dispatch] = useReducer(menuReducer, initialMenuState)
  const setLockScroll = useLockScroll()

  const setMenuOpen = (value: boolean) => {
    dispatch({ type: value ? 'open' : 'close' })
    setLockScroll(value)
  }

  const openMenu = () => setMenuOpen(true)
  const closeMenu = () => setMenuOpen(false)

  return {
    state,
    openMenu,
    closeMenu,
  }
}

const CSS_HANDLES = [
  'openIconContainer',
  'drawer',
  'closeIconContainer',
  'childrenContainer',
  'closeIconButton',
]

// This is a totally valid use case for any, eslint.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isHTMLElement(x: any): x is HTMLElement {
  return 'tagName' in x
}

function isLink(element: HTMLElement): element is HTMLAnchorElement {
  return String(element.tagName).toUpperCase() === 'A'
}

const isElementInsideLink = (
  node: HTMLElement | null,
  limit?: HTMLElement
): boolean => {
  if (!node || !isHTMLElement(node)) {
    return false
  }

  if (isLink(node)) {
    return true
  }

  const { parentNode } = node

  if (
    !parentNode ||
    !isHTMLElement(parentNode) ||
    parentNode.tagName.toUpperCase() === 'BODY' ||
    (limit && parentNode === limit)
  ) {
    return false
  }

  return isElementInsideLink(parentNode, limit)
}

const Drawer: StorefrontComponent<DrawerSchema & {
  customIcon: ReactElement
}> = ({
  width,
  customIcon,
  maxWidth = 450,
  isFullWidth,
  slideDirection = 'horizontal',
  children,
}) => {
  const handles = useCssHandles(CSS_HANDLES)
  const hasCustomIconBlock = Boolean(
    useChildBlock({ id: 'drawer-open-trigger' })
  )
  const { state: menuState, openMenu, closeMenu } = useMenuState()
  const { isOpen: isMenuOpen, hasBeenOpened: hasMenuBeenOpened } = menuState

  const handleContainerClick: MouseEventHandler<HTMLElement> = event => {
    // target is the clicked element
    // currentTarget is the element which was attached the event (e.g. the container)
    const { target, currentTarget } = event

    if (isElementInsideLink(target as HTMLElement, currentTarget)) {
      closeMenu()
    }
  }

  const direction =
    slideDirection === 'horizontal' || slideDirection === 'leftToRight'
      ? 'left'
      : 'right'

  const swipeHandler = direction === 'left' ? 'onSwipeLeft' : 'onSwipeRight'

  return (
    <>
      <div
        className={`pa4 pointer ${handles.openIconContainer}`}
        onClick={openMenu}
        aria-hidden
      >
        {hasCustomIconBlock ? (
          <ExtensionPoint id="drawer-open-trigger" />
        ) : (
          customIcon || <IconMenu size={20} />
        )}
      </div>
      <Portal>
        <Overlay visible={isMenuOpen} onClick={closeMenu} />
        <Suspense fallback={<React.Fragment />}>
          <Swipeable
            {...{
              [swipeHandler]: closeMenu,
            }}
            enabled={isMenuOpen}
            position={isMenuOpen ? 'center' : direction}
            allowOutsideDrag
            className={`${handles.drawer} ${
              direction === 'right' ? 'right-0' : 'left-0'
            } fixed top-0 bottom-0 bg-base z-999 flex flex-column`}
            style={{
              width: width || (isFullWidth ? '100%' : '85%'),
              maxWidth,
              minWidth: 280,
              pointerEvents: isMenuOpen ? 'auto' : 'none',
            }}
          >
            <div
              style={{
                WebkitOverflowScrolling: 'touch',
                overflowY: 'scroll',
              }}
            >
              <div className={`flex ${handles.closeIconContainer}`}>
                <button
                  className={`${handles.closeIconButton} pa4 pointer bg-transparent transparent bn pointer`}
                  onClick={closeMenu}
                >
                  <IconClose size={30} type="line" />
                </button>
              </div>
              {/* The onClick handler below is done to fix a bug regarding drawers that wouldn't close when
               * navigating to the same page (e.g. from a search result page to another). It is not an element
               * intended to be clicked directly, so there's probably no need for it to have a role and to
               * handle keyboard events specifically */}
              {/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div
                className={`${handles.childrenContainer} flex flex-grow-1`}
                onClick={handleContainerClick}
              >
                {hasMenuBeenOpened && children}
              </div>
              {/* eslint-enable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            </div>
          </Swipeable>
        </Suspense>
      </Portal>
    </>
  )
}

const messages = defineMessages({
  title: {
    defaultMessage: '',
    id: 'admin/editor.drawer.title',
  },
})

Drawer.getSchema = () => {
  return {
    title: messages.title.id,
  }
}

export default Drawer
