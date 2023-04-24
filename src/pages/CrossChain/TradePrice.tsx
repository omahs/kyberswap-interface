import { RouteData } from '@0xsquid/sdk'
import { Trans } from '@lingui/macro'
import { useState } from 'react'
import { Repeat } from 'react-feather'
import { Flex, Text } from 'rebass'

import { TokenLogoWithChain } from 'components/Logo'
import RefreshButton from 'components/SwapForm/RefreshButton'
import { useActiveWeb3React } from 'hooks'
import useTheme from 'hooks/useTheme'
import { getRouInfo } from 'pages/CrossChain/helpers'
import { useCrossChainState } from 'state/crossChain/hooks'

import { StyledBalanceMaxMini } from '../../components/swapv2/styleds'

interface TradePriceProps {
  route: RouteData | undefined
  refresh?: () => void
  showLogo?: boolean
  disabled?: boolean
}

export default function TradePrice({ route, refresh, showLogo = true, disabled = false }: TradePriceProps) {
  const theme = useTheme()
  const [showInverted, setShowInverted] = useState<boolean>(false)
  const { exchangeRate } = getRouInfo(route)
  let formattedPrice
  const price = exchangeRate ? Number(exchangeRate) : undefined
  if (price) formattedPrice = showInverted ? (1 / price).toPrecision(6) : price?.toPrecision(6)
  const [{ currencyIn, currencyOut, chainIdOut }] = useCrossChainState()
  const { chainId } = useActiveWeb3React()

  // todo refactor
  const value = currencyIn && currencyOut && chainId && chainIdOut && (
    <Flex alignItems={'center'} sx={{ gap: '4px' }} color={theme.text}>
      1{' '}
      {showLogo ? (
        <TokenLogoWithChain size={14} currency={showInverted ? currencyOut : currencyIn} />
      ) : showInverted ? (
        currencyIn.symbol
      ) : (
        currencyOut.symbol
      )}{' '}
      = {formattedPrice}{' '}
      {showLogo ? (
        <TokenLogoWithChain size={14} currency={showInverted ? currencyIn : currencyOut} />
      ) : !showInverted ? (
        currencyIn.symbol
      ) : (
        currencyOut.symbol
      )}
    </Flex>
  )

  return (
    <Text
      fontWeight={500}
      fontSize={12}
      color={theme.subText}
      style={{ alignItems: 'center', display: 'flex', cursor: 'pointer' }}
      onClick={() => setShowInverted(!showInverted)}
      height="22px"
    >
      {formattedPrice ? (
        <Flex sx={{ gap: '4px' }} alignItems={'center'}>
          {refresh && <RefreshButton shouldDisable={!route || disabled} skipFirst callback={refresh} />}
          {showLogo && <Trans>Cross-chain rate is</Trans>} {value}
          <StyledBalanceMaxMini>
            <Repeat size={12} />
          </StyledBalanceMaxMini>
        </Flex>
      ) : (
        <div />
      )}
    </Text>
  )
}
