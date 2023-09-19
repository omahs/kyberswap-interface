import { Trans } from '@lingui/macro'
import { WalletReadyState } from '@solana/wallet-adapter-base'
import { useWallet } from '@solana/wallet-adapter-react'
import dayjs from 'dayjs'
import { rgba, transparentize } from 'polished'
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft } from 'react-feather'
import { useLocation } from 'react-router-dom'
import { usePrevious } from 'react-use'
import { Flex, Text } from 'rebass'
import styled from 'styled-components'

import { ReactComponent as Close } from 'assets/images/x.svg'
import { AutoColumn } from 'components/Column'
import ExpandableBox from 'components/ExpandableBox'
import WarningIcon from 'components/Icons/WarningIcon'
import Modal from 'components/Modal'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'
import WalletPopup from 'components/WalletPopup'
import { APP_PATHS, TERM_FILES_PATH } from 'constants/index'
import { SUPPORTED_WALLET, SUPPORTED_WALLETS, WalletInfo } from 'constants/wallets'
import { useActiveWeb3React, useWeb3React } from 'hooks'
import useMixpanel, { MIXPANEL_TYPE } from 'hooks/useMixpanel'
import useTheme from 'hooks/useTheme'
import { useActivationWallet } from 'hooks/web3/useActivationWallet'
import { ApplicationModal } from 'state/application/actions'
import {
  useCloseModal,
  useModalOpen,
  useOpenModal,
  useOpenNetworkModal,
  useWalletModalToggle,
} from 'state/application/hooks'
import { useIsConnectingWallet } from 'state/authen/hooks'
import { ExternalLink } from 'theme'
import { isEVMWallet, isOverriddenWallet, isSolanaWallet } from 'utils'

import Option from './Option'
import PendingView from './PendingView'

const CloseIcon = styled.div`
  height: 24px;
  align-self: flex-end;
  cursor: pointer;
  color: ${({ theme }) => theme.text};
  &:hover {
    opacity: 0.6;
  }
`

const Wrapper = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  margin: 0;
  padding: 0;
  width: 100%;
`

const ContentWrapper = styled.div`
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
`

const TermAndCondition = styled.div`
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
  background-color: ${({ theme }) => rgba(theme.buttonBlack, 0.35)};
  color: ${props => (props.color === 'blue' ? ({ theme }) => theme.primary : 'inherit')};
  accent-color: ${({ theme }) => theme.primary};
  border-radius: 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  :hover {
    background-color: ${({ theme }) => rgba(theme.buttonBlack, 0.5)};
  }
`

const UpperSection = styled.div`
  position: relative;
  padding: 24px;
  position: relative;
`

const gap = '1rem'
const OptionGrid = styled.div`
  display: flex;
  gap: ${gap};
  align-items: center;
  flex-wrap: wrap;
  margin-top: 16px;
  & > * {
    width: calc(33.33% - ${gap} * 2 / 3);
  }

  ${({ theme }) => theme.mediaWidth.upToSmall`
    & > * {
      width: calc(50% - ${gap} / 2);
    }
  `}
`

const HoverText = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 20px;
  :hover {
    cursor: pointer;
  }
`

const Step = styled(Flex)`
  background-color: ${({ theme }) => transparentize(0.8, theme.primary)};
  color: ${({ theme }) => theme.primary};
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin: 0 8px !important;
  font-size: 12px;
`

enum WALLET_VIEWS {
  CHANGE_WALLET = 'CHANGE_WALLET',
  ACCOUNT = 'account',
  PENDING = 'pending',
}

type WalletInfoExtended = WalletInfo & {
  key: SUPPORTED_WALLET
  readyState: WalletReadyState | undefined
  isSupportCurrentChain: boolean
  isOverridden: boolean
}

export default function WalletModal() {
  const { isWrongNetwork, account, isSolana, isEVM, walletKey } = useActiveWeb3React()
  // important that these are destructed from the account-specific web3-react context
  const { active, connector } = useWeb3React()
  const { connected, connecting, wallet: solanaWallet } = useWallet()
  const { tryActivation } = useActivationWallet()

  const theme = useTheme()

  const [walletView, setWalletView] = useState(WALLET_VIEWS.ACCOUNT)
  const [pendingWalletKey, setPendingWalletKey] = useState<SUPPORTED_WALLET | undefined>()

  const [pendingError, setPendingError] = useState<boolean>()
  const [error, setError] = useState<Error | null>(null)

  const walletModalOpen = useModalOpen(ApplicationModal.WALLET)
  const toggleWalletModal = useWalletModalToggle()
  const closeWalletModal = useCloseModal(ApplicationModal.WALLET)
  const openWalletModal = useOpenModal(ApplicationModal.WALLET)
  const openNetworkModal = useOpenNetworkModal()

  const previousAccount = usePrevious(account)

  const location = useLocation()
  const { mixpanelHandler } = useMixpanel()

  useEffect(() => {
    !account && walletModalOpen && mixpanelHandler(MIXPANEL_TYPE.WALLET_CONNECT_CLICK)
  }, [mixpanelHandler, walletModalOpen, account])

  // close on connection, when logged out before
  useEffect(() => {
    if (account && !previousAccount && walletModalOpen) {
      if (location.pathname.startsWith(APP_PATHS.CAMPAIGN)) {
        mixpanelHandler(MIXPANEL_TYPE.CAMPAIGN_WALLET_CONNECTED)
      }
      toggleWalletModal()
    }
  }, [account, previousAccount, toggleWalletModal, walletModalOpen, location.pathname, mixpanelHandler])

  useEffect(() => {
    if (isWrongNetwork) {
      openNetworkModal()
    }
  }, [isWrongNetwork, openNetworkModal])

  // always reset to account view
  useEffect(() => {
    if (walletModalOpen) {
      setPendingError(false)
      setError(null)
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [walletModalOpen])

  // close modal when a connection is successful
  const activePrevious = usePrevious(active)
  const connectorPrevious = usePrevious(connector)

  useEffect(() => {
    if (walletModalOpen && ((active && !activePrevious) || (connector !== connectorPrevious && !error))) {
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [setWalletView, active, error, connector, walletModalOpen, activePrevious, connectorPrevious])

  useEffect(() => {
    // If is there any issue when connecting wallet, solanaWallet will be cleared and set to null
    // Use it to check is there any error after connecting
    if (!connecting && !connected && !solanaWallet) {
      setPendingError(true)
    }
  }, [connecting, connected, solanaWallet])

  const [, setIsConnectingWallet] = useIsConnectingWallet()
  const handleWalletChange = useCallback(
    async (walletKey: SUPPORTED_WALLET) => {
      mixpanelHandler(MIXPANEL_TYPE.WALLET_CONNECT_WALLET_CLICK, { wallet: walletKey })
      setPendingWalletKey(walletKey)
      setWalletView(WALLET_VIEWS.PENDING)
      setIsConnectingWallet(true)
      try {
        await tryActivation(walletKey)
        setPendingError(false)
        setError(null)
      } catch (error) {
        setPendingError(true)
        setError(error)
      }
      setTimeout(() => {
        setIsConnectingWallet(false)
      }, 1000)
    },
    [tryActivation, setIsConnectingWallet, mixpanelHandler],
  )

  function getOptions() {
    // Generate list of wallets and states of it depend on current network
    const parsedWalletList: WalletInfoExtended[] = (Object.keys(SUPPORTED_WALLETS) as SUPPORTED_WALLET[]).map(k => {
      const wallet = SUPPORTED_WALLETS[k]
      const readyState = (() => {
        const readyStateEVM = isEVMWallet(wallet) ? wallet.readyState() : undefined
        const readyStateSolana = isSolanaWallet(wallet) ? wallet.readyStateSolana() : undefined
        return (isEVM && readyStateEVM) || (isSolana && readyStateSolana) || readyStateEVM || readyStateSolana
      })()
      const isSupportCurrentChain = (isEVMWallet(wallet) && isEVM) || (isSolanaWallet(wallet) && isSolana) || false
      const overridden = isOverriddenWallet(k) || (walletKey === 'COIN98' && !window.ethereum?.isCoin98)

      return {
        ...wallet,
        key: k,
        readyState,
        isSupportCurrentChain,
        isOverridden: overridden,
        installLink: readyState === WalletReadyState.NotDetected ? wallet.installLink : undefined,
      }
    })

    const sortPoint: { [readyState in WalletReadyState]: number } = {
      [WalletReadyState.Installed]: 1000,
      [WalletReadyState.Loadable]: 100,
      [WalletReadyState.NotDetected]: 10,
      [WalletReadyState.Unsupported]: 1,
    }
    const sortWallets = (walletA: WalletInfoExtended, walletB: WalletInfoExtended): number => {
      return (
        sortPoint[walletB.readyState || WalletReadyState.Unsupported] -
        sortPoint[walletA.readyState || WalletReadyState.Unsupported]
      )
    }
    return (
      parsedWalletList
        .sort(sortWallets)
        // Filter Unsupported state wallets
        .filter(wallet => wallet.readyState !== WalletReadyState.Unsupported)
        .map(wallet => (
          <Option
            key={wallet.key}
            walletKey={wallet.key}
            onSelected={handleWalletChange}
            isSupportCurrentChain={wallet.isSupportCurrentChain}
            isOverridden={wallet.isOverridden}
            readyState={wallet.readyState}
            installLink={wallet.installLink}
          />
        ))
    )
  }

  const showAccount = account && walletView === WALLET_VIEWS.ACCOUNT
  const [isPinnedPopupWallet, setPinnedPopupWallet] = useState(false)

  function getModalContent() {
    return (
      <UpperSection>
        <RowBetween marginBottom="26px" gap="20px">
          {walletView === WALLET_VIEWS.PENDING && (
            <HoverText
              onClick={() => {
                setPendingError(false)
                setError(null)
                setWalletView(WALLET_VIEWS.ACCOUNT)
              }}
              style={{ marginRight: '1rem', flex: 1 }}
            >
              <ChevronLeft color={theme.primary} />
            </HoverText>
          )}
          <HoverText>
            {walletView === WALLET_VIEWS.ACCOUNT ? (
              <Trans>Connect your Wallet</Trans>
            ) : (
              <Trans>Connecting Wallet</Trans>
            )}
          </HoverText>
          <CloseIcon onClick={toggleWalletModal}>
            <Close />
          </CloseIcon>
        </RowBetween>
        {(walletView === WALLET_VIEWS.ACCOUNT || walletView === WALLET_VIEWS.CHANGE_WALLET) && (
          <TermAndCondition>
            <Text color={theme.subText}>
              <Trans>
                By connecting a wallet, you accept{' '}
                <ExternalLink href={TERM_FILES_PATH.KYBERSWAP_TERMS} onClick={e => e.stopPropagation()}>
                  KyberSwap&lsquo;s Terms of Use
                </ExternalLink>{' '}
                and consent to its{' '}
                <ExternalLink href={TERM_FILES_PATH.PRIVACY_POLICY} onClick={e => e.stopPropagation()}>
                  Privacy Policy
                </ExternalLink>
                . Last updated: {dayjs(TERM_FILES_PATH.VERSION).format('DD MMM YYYY')}
              </Trans>
            </Text>
          </TermAndCondition>
        )}
        <ContentWrapper>
          {walletView === WALLET_VIEWS.PENDING ? (
            <PendingView
              walletKey={pendingWalletKey}
              hasError={pendingError}
              onClickTryAgain={() => {
                pendingWalletKey && tryActivation(pendingWalletKey)
              }}
              context={
                pendingWalletKey === 'SOLFLARE' ? (
                  <div
                    style={{
                      backgroundColor: theme.background,
                      borderRadius: '16px',
                      color: theme.subText,
                      padding: '12px',
                      marginTop: '24px',
                    }}
                  >
                    <ExpandableBox
                      backgroundColor={theme.buttonBlack}
                      headerContent={
                        <AutoRow>
                          <Flex style={{ padding: '0 8px' }}>
                            <WarningIcon />
                          </Flex>
                          <Text fontSize={12} style={{ flex: 1, padding: '0 2px' }}>
                            <Trans>
                              If you haven&lsquo;t created a Solflare wallet yet, please follow the steps below
                            </Trans>
                          </Text>
                        </AutoRow>
                      }
                      expandContent={
                        <AutoColumn gap="6px" style={{ fontSize: '12px' }}>
                          <RowFixed>
                            <Step alignItems="center" justifyContent="center">
                              1
                            </Step>
                            <Text>
                              <Trans>Create a Solflare wallet</Trans>
                            </Text>
                          </RowFixed>
                          <RowFixed>
                            <Step alignItems="center" justifyContent="center">
                              2
                            </Step>
                            <Text>
                              <Trans>Close the Solflare popup</Trans>
                            </Text>
                          </RowFixed>
                          <RowFixed>
                            <Step alignItems="center" justifyContent="center">
                              3
                            </Step>
                            <Text>
                              <Trans>Try to connect again</Trans>
                            </Text>
                          </RowFixed>
                        </AutoColumn>
                      }
                    />
                  </div>
                ) : undefined
              }
            />
          ) : (
            <OptionGrid>{getOptions()}</OptionGrid>
          )}
        </ContentWrapper>
      </UpperSection>
    )
  }

  if (showAccount) {
    return (
      <WalletPopup
        isPinned={isPinnedPopupWallet}
        setPinned={setPinnedPopupWallet}
        isModalOpen={walletModalOpen}
        onDismissModal={closeWalletModal}
        onOpenModal={openWalletModal}
      />
    )
  }

  return (
    <Modal
      isOpen={walletModalOpen}
      onDismiss={closeWalletModal}
      minHeight={false}
      maxHeight={90}
      maxWidth={600}
      bypassScrollLock={walletView === WALLET_VIEWS.PENDING && ['WALLET_CONNECT'].includes(pendingWalletKey)}
      bypassFocusLock={walletView === WALLET_VIEWS.PENDING && ['WALLET_CONNECT', 'BLOCTO'].includes(pendingWalletKey)}
    >
      <Wrapper>{getModalContent()}</Wrapper>
    </Modal>
  )
}
