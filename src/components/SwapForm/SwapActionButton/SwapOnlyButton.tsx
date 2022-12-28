import { Currency, CurrencyAmount } from '@kyberswap/ks-sdk-core'
import { Trans, t } from '@lingui/macro'
import { useState } from 'react'
import styled from 'styled-components'

import { ButtonPrimary } from 'components/Button'
import SwapModal from 'components/SwapForm/SwapModal'
import { BuildRouteResult } from 'components/SwapForm/hooks/useBuildRoute'
import { Dots } from 'components/swapv2/styleds'
import { useActiveWeb3React } from 'hooks'
import useMixpanel, { MIXPANEL_TYPE } from 'hooks/useMixpanel'
import useSwapCallbackV3 from 'hooks/useSwapCallbackV3'
import useTheme from 'hooks/useTheme'
import { Field } from 'state/swap/actions'
import { useEncodeSolana } from 'state/swap/hooks'
import { RouteSummary } from 'types/metaAggregator'
import { checkPriceImpact } from 'utils/prices'

const CustomPrimaryButton = styled(ButtonPrimary).attrs({
  id: 'swap-button',
})<{ $minimal?: boolean }>`
  border: none;
  font-weight: 500;

  &:disabled {
    border: none;
  }

  width: ${({ $minimal }) => ($minimal ? '48%' : '100%')};
`

export type Props = {
  minimal?: boolean
  isAdvancedMode: boolean
  routeSummary: RouteSummary | undefined
  isGettingRoute: boolean
  isProcessingSwap: boolean

  currencyIn: Currency | undefined
  currencyOut: Currency | undefined
  balanceIn: CurrencyAmount<Currency> | undefined
  balanceOut: CurrencyAmount<Currency> | undefined
  parsedAmount: CurrencyAmount<Currency> | undefined

  setProcessingSwap: React.Dispatch<React.SetStateAction<boolean>>
  setErrorWhileSwap: (e: string) => void
  buildRoute: () => Promise<BuildRouteResult>
}

const SwapOnlyButton: React.FC<Props> = ({
  minimal,
  isAdvancedMode,
  routeSummary,
  isGettingRoute,
  isProcessingSwap,

  currencyIn,
  currencyOut,
  balanceIn,
  balanceOut,
  parsedAmount,

  setProcessingSwap,
  setErrorWhileSwap,
  buildRoute,
}) => {
  const { isSolana } = useActiveWeb3React()
  const [encodeSolana] = useEncodeSolana()
  const theme = useTheme()
  const { mixpanelHandler } = useMixpanel({
    [Field.INPUT]: currencyIn,
    [Field.OUTPUT]: currencyOut,
  })
  const [buildResult, setBuildResult] = useState<BuildRouteResult>()
  const [isBuildingRoute, setBuildingRoute] = useState(false)
  const { priceImpact } = routeSummary || {}

  // the callback to execute the swap
  const swapCallback = useSwapCallbackV3()
  const priceImpactResult = checkPriceImpact(priceImpact)
  const userHasSpecifiedInputOutput = Boolean(currencyIn && currencyOut && parsedAmount)
  const showLoading = isGettingRoute || isBuildingRoute || ((!balanceIn || !balanceOut) && userHasSpecifiedInputOutput)

  const handleClickSwapForAdvancedMode = async () => {
    if (!swapCallback || isBuildingRoute) {
      return
    }

    setProcessingSwap(true)

    setBuildingRoute(true)
    const result = await buildRoute()
    setBuildingRoute(false)

    if (result.error) {
      setErrorWhileSwap(result.error)
      return
    }

    if (!result.data?.data || !result.data?.routerAddress) {
      setErrorWhileSwap(t`Build failed. Please try again`)
      return
    }

    try {
      await swapCallback(result.data.routerAddress, result.data.data)
    } catch (e) {
      setErrorWhileSwap(e.message)
    }

    setProcessingSwap(false)
  }

  const handleClickSwapForNormalMode = async () => {
    if (!swapCallback || isBuildingRoute) {
      return
    }

    setProcessingSwap(true)
    // dismiss the modal will setProcessingSwap to false

    setBuildingRoute(true)
    setBuildResult(undefined)
    const result = await buildRoute()
    setBuildingRoute(false)
    setBuildResult(result)
  }

  const mixpanelSwapInit = () => {
    mixpanelHandler(MIXPANEL_TYPE.SWAP_INITIATED, {
      gasUsd: routeSummary?.gasUsd,
      inputAmount: routeSummary?.parsedAmountIn,
      priceImpact: routeSummary?.priceImpact,
    })
  }

  const handleClickSwapButton = () => {
    mixpanelSwapInit()

    setErrorWhileSwap('')

    if (isAdvancedMode) {
      handleClickSwapForAdvancedMode()
    } else {
      handleClickSwapForNormalMode()
    }
  }

  const handleClickRetryForNormalMode = () => {
    setErrorWhileSwap('')
    handleClickSwapForNormalMode()
  }

  const renderButton = () => {
    if (isProcessingSwap && isAdvancedMode) {
      return (
        <CustomPrimaryButton disabled $minimal={minimal}>
          <Dots>
            <Trans>Processing</Trans>
          </Dots>
        </CustomPrimaryButton>
      )
    }

    if (isAdvancedMode && isSolana && !encodeSolana) {
      return (
        <CustomPrimaryButton disabled $minimal={minimal}>
          <Dots>
            <Trans>Checking accounts</Trans>
          </Dots>
        </CustomPrimaryButton>
      )
    }

    if (showLoading) {
      return (
        <CustomPrimaryButton disabled $minimal={minimal}>
          <Dots>
            <Trans>Calculating</Trans>
          </Dots>
        </CustomPrimaryButton>
      )
    }

    if (priceImpactResult.isHigh || priceImpactResult.isVeryHigh) {
      return (
        <CustomPrimaryButton
          onClick={handleClickSwapButton}
          disabled={!isAdvancedMode}
          $minimal={minimal}
          style={
            isAdvancedMode
              ? { background: priceImpactResult.isVeryHigh ? theme.red : theme.warning, color: theme.white }
              : undefined
          }
        >
          <Trans>Swap Anyway</Trans>
        </CustomPrimaryButton>
      )
    }

    return (
      <CustomPrimaryButton onClick={handleClickSwapButton} $minimal={minimal}>
        <Trans>Swap</Trans>
      </CustomPrimaryButton>
    )
  }

  return (
    <>
      {renderButton()}
      <SwapModal
        isOpen={isProcessingSwap && !isAdvancedMode}
        tokenAddToMetaMask={currencyOut}
        buildResult={buildResult}
        isBuildingRoute={isBuildingRoute}
        onDismiss={() => {
          setProcessingSwap(false)
        }}
        swapCallback={
          buildResult?.data?.data && buildResult?.data?.routerAddress && swapCallback
            ? () => swapCallback(buildResult.data.routerAddress, buildResult.data.data)
            : undefined
        }
        onRetryBuild={handleClickRetryForNormalMode}
      />
    </>
  )
}

export default SwapOnlyButton
