import { TransactionResponse } from '@ethersproject/providers'
import { ONE } from '@kyberswap/ks-sdk-classic'
import { Currency, CurrencyAmount, WETH } from '@kyberswap/ks-sdk-core'
import {
  FeeAmount,
  NonfungiblePositionManager,
  Position,
  TICK_SPACINGS,
  TickMath,
  tickToPrice,
} from '@kyberswap/ks-sdk-elastic'
import { Trans, t } from '@lingui/macro'
import { BigNumber } from 'ethers'
import JSBI from 'jsbi'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Repeat } from 'react-feather'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMedia } from 'react-use'
import { Box, Flex, Text } from 'rebass'
import styled from 'styled-components'

import { NotificationType } from 'components/Announcement/type'
import { ButtonError, ButtonLight, ButtonPrimary } from 'components/Button'
import { OutlineCard, SubTextCard, WarningCard } from 'components/Card'
import { AutoColumn } from 'components/Column'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import FeeSelector from 'components/FeeSelector'
import HoverInlineText from 'components/HoverInlineText'
import { Swap as SwapIcon, TwoWayArrow } from 'components/Icons'
import LiquidityChartRangeInput from 'components/LiquidityChartRangeInput'
import { AddRemoveTabs, LiquidityAction } from 'components/NavigationTabs'
import ChartPositions from 'components/ProAmm/ChartPositions'
import ListPositions from 'components/ProAmm/ListPositions'
import PoolPriceChart from 'components/ProAmm/PoolPriceChart'
import ProAmmPoolInfo from 'components/ProAmm/ProAmmPoolInfo'
import ProAmmPoolStat from 'components/ProAmm/ProAmmPoolStat'
import ProAmmPooledTokens from 'components/ProAmm/ProAmmPooledTokens'
import ProAmmPriceRangeConfirm from 'components/ProAmm/ProAmmPriceRangeConfirm'
import Tabs from 'components/ProAmm/Tab'
import RangeSelector from 'components/RangeSelector'
import Rating from 'components/Rating'
import Row, { RowBetween, RowFixed } from 'components/Row'
import ShareModal from 'components/ShareModal'
import { SLIPPAGE_EXPLANATION_URL } from 'components/SlippageWarningNote'
import Tooltip, { MouseoverTooltip } from 'components/Tooltip'
import TransactionConfirmationModal, { ConfirmationModalContent } from 'components/TransactionConfirmationModal'
import { TutorialType } from 'components/Tutorial'
import { Dots } from 'components/swapv2/styleds'
import { APP_PATHS } from 'constants/index'
import { ELASTIC_NOT_SUPPORTED } from 'constants/networks'
import { EVMNetworkInfo } from 'constants/networks/type'
import { NativeCurrencies } from 'constants/tokens'
import { useActiveWeb3React, useWeb3React } from 'hooks'
import { useCurrency } from 'hooks/Tokens'
import { ApprovalState, useApproveCallback } from 'hooks/useApproveCallback'
import { useProAmmNFTPositionManagerContract } from 'hooks/useContract'
import useInterval from 'hooks/useInterval'
import useMixpanel, { MIXPANEL_TYPE } from 'hooks/useMixpanel'
import useProAmmPoolInfo from 'hooks/useProAmmPoolInfo'
import useProAmmPreviousTicks, { useProAmmMultiplePreviousTicks } from 'hooks/useProAmmPreviousTicks'
import useTheme from 'hooks/useTheme'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { convertTickToPrice } from 'pages/Farm/ElasticFarmv2/utils'
import { ApplicationModal } from 'state/application/actions'
import { useNotify, useOpenModal, useOpenNetworkModal, useWalletModalToggle } from 'state/application/hooks'
import { FarmUpdater } from 'state/farms/elastic/hooks'
import { useElasticFarmsV2 } from 'state/farms/elasticv2/hooks'
import ElasticFarmV2Updater from 'state/farms/elasticv2/updater'
import {
  useProAmmDerivedAllMintInfo,
  useProAmmDerivedMintInfo,
  useProAmmMintActionHandlers,
  useProAmmMintState,
  useRangeHopCallbacks,
} from 'state/mint/proamm/hooks'
import { Bound, Field, RANGE } from 'state/mint/proamm/type'
import { useUserProMMPositions } from 'state/prommPools/hooks'
import useGetElasticPools from 'state/prommPools/useGetElasticPools'
import { useTokenPricesWithLoading } from 'state/tokenPrices/hooks'
import { usePairFactor } from 'state/topTokens/hooks'
import { useTransactionAdder } from 'state/transactions/hooks'
import { TRANSACTION_TYPE } from 'state/transactions/type'
import { useDegenModeManager, useUserSlippageTolerance } from 'state/user/hooks'
import { VIEW_MODE } from 'state/user/reducer'
import { ExternalLink, MEDIA_WIDTHS, StyledInternalLink, TYPE } from 'theme'
import { basisPointsToPercent, calculateGasMargin, formattedNum } from 'utils'
import { currencyId } from 'utils/currencyId'
import { friendlyError } from 'utils/errorMessage'
import { maxAmountSpend } from 'utils/maxAmountSpend'
import { formatDisplayNumber, toFixed } from 'utils/numbers'
import { SLIPPAGE_STATUS, checkRangeSlippage } from 'utils/slippage'
import { unwrappedToken } from 'utils/wrappedCurrency'

import DisclaimerERC20 from './components/DisclaimerERC20'
import NewPoolNote from './components/NewPoolNote'
import { RANGE_LIST, rangeData } from './constants'
import {
  ArrowWrapper,
  ChartBody,
  ChartWrapper,
  Container,
  DynamicSection,
  FlexLeft,
  PageWrapper,
  RangeBtn,
  RangeTab,
  RightContainer,
  StackedContainer,
  StackedItem,
  StyledInput,
} from './styled'

const TextUnderlineColor = styled(Text)`
  border-bottom: 1px solid ${({ theme }) => theme.text};
  width: fit-content;
  display: inline;
  cursor: pointer;
  color: ${({ theme }) => theme.text};
  font-weight: 500;
`

const TextUnderlineTransparent = styled(Text)`
  border-bottom: 1px solid transparent;
  width: fit-content;
  display: inline;
`

export default function AddLiquidity() {
  const { currencyIdA, currencyIdB, feeAmount: feeAmountFromUrl } = useParams()
  const navigate = useNavigate()
  const [rotate, setRotate] = useState(false)
  const { account, chainId, isEVM, networkInfo } = useActiveWeb3React()
  const { library } = useWeb3React()
  const theme = useTheme()
  const openNetworkModal = useOpenNetworkModal()
  const toggleWalletModal = useWalletModalToggle() // toggle wallet when disconnected
  const [isDegenMode] = useDegenModeManager()
  const addTransactionWithType = useTransactionAdder()
  const positionManager = useProAmmNFTPositionManagerContract()
  const [showChart, setShowChart] = useState(false)
  const [positionIndex, setPositionIndex] = useState(0)
  const { mixpanelHandler } = useMixpanel()
  const notify = useNotify()

  // fee selection from url
  const feeAmount: FeeAmount =
    feeAmountFromUrl && Object.values(FeeAmount).includes(parseFloat(feeAmountFromUrl))
      ? parseFloat(feeAmountFromUrl)
      : FeeAmount.MOST_PAIR
  const baseCurrency = useCurrency(currencyIdA)
  const currencyB = useCurrency(currencyIdB)
  // prevent an error if they input ETH/WETH
  const quoteCurrency =
    baseCurrency && currencyB && baseCurrency.wrapped.equals(currencyB.wrapped) ? undefined : currencyB

  const baseCurrencyIsETHER = Boolean(baseCurrency?.isNative)
  const baseCurrencyIsWETH = Boolean(baseCurrency?.equals(WETH[chainId]))
  const quoteCurrencyIsETHER = Boolean(quoteCurrency?.isNative)
  const quoteCurrencyIsWETH = Boolean(quoteCurrency?.equals(WETH[chainId]))

  const tokenA = baseCurrency?.wrapped
  const tokenB = quoteCurrency?.wrapped
  const isSorted = tokenA && tokenB && tokenA.sortsBefore(tokenB)

  // mint state
  const { positions: positionsState, startPriceTypedValue } = useProAmmMintState()
  const pIndex = positionIndex >= positionsState.length ? positionsState.length - 1 : positionIndex
  const { independentField, typedValue } = positionsState[pIndex]

  const {
    pool,
    ticks,
    dependentField,
    price,
    pricesAtTicks,
    parsedAmounts,
    currencyBalances,
    position,
    noLiquidity,
    currencies,
    invalidPool,
    invalidRange,
    outOfRange,
    depositADisabled,
    depositBDisabled,
    invertPrice,
    ticksAtLimit,
    amount0Unlock,
    amount1Unlock,
    riskPoint,
    profitPoint,
    activeRange,
  } = useProAmmDerivedMintInfo(
    pIndex,
    baseCurrency ?? undefined,
    quoteCurrency ?? undefined,
    feeAmount,
    baseCurrency ?? undefined,
  )
  const { errorMessage, errorLabel, positions, ticksAtLimits, currencyAmountSum } = useProAmmDerivedAllMintInfo(
    pIndex,
    baseCurrency ?? undefined,
    quoteCurrency ?? undefined,
    feeAmount,
    baseCurrency ?? undefined,
  )
  const isMultiplePosition = !noLiquidity && positionsState.length > 1

  const { [Field.CURRENCY_A]: currencies_A, [Field.CURRENCY_B]: currencies_B } = currencies
  const { [Field.CURRENCY_A]: currencyBalanceA, [Field.CURRENCY_B]: currencyBalanceB } = currencyBalances
  const { [Field.CURRENCY_A]: parsedAmounts_A, [Field.CURRENCY_B]: parsedAmounts_B } = parsedAmounts
  const { [Bound.LOWER]: tickLower, [Bound.UPPER]: tickUpper } = ticks
  const { [Bound.LOWER]: priceLower, [Bound.UPPER]: priceUpper } = pricesAtTicks

  // show this for Zohar can get tick to add farm
  useEffect(() => {
    console.groupCollapsed('ticks ------------------')
    console.debug('tickLower: ', tickLower)
    console.debug('tickUpper: ', tickUpper)
    console.groupEnd()
  }, [tickLower, tickUpper])

  const poolAddress = useProAmmPoolInfo(baseCurrency, currencyB, feeAmount)

  const { farms } = useElasticFarmsV2()

  const farmV2S = farms?.filter(
    item =>
      !item.isSettled &&
      item.endTime > Date.now() / 1000 &&
      item.poolAddress.toLowerCase() === poolAddress.toLowerCase(),
  )

  const activeRanges =
    farmV2S?.map(farm => farm.ranges.filter(item => !item.isRemoved).map(item => ({ ...item, farm }))).flat() || []

  const isFarmV2Available = !!farmV2S?.length

  const [showFarmRangeSelect, setShowFarmRangeSelect] = useState(() => isFarmV2Available)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeRangeIndex = Number(searchParams.get('farmRange') || '0')
  const defaultFId = Number(searchParams.get('fId') || '0')
  const range = activeRanges.find(i => i.index === activeRangeIndex && i.farm.fId === defaultFId)

  const canJoinFarm =
    isFarmV2Available &&
    positions.some(pos => activeRanges.some(r => pos && pos.tickLower <= r.tickLower && pos.tickUpper >= r.tickUpper))

  const farmPosWarning = positions.every(Boolean) && isFarmV2Available && !canJoinFarm

  const previousTicks: number[] | undefined = useProAmmPreviousTicks(pool, position)
  const mutiplePreviousTicks: number[][] | undefined = useProAmmMultiplePreviousTicks(pool, positions)
  const {
    onFieldAInput,
    onFieldBInput,
    onLeftRangeInput,
    onRightRangeInput,
    onStartPriceInput,
    onResetMintState,
    onAddPosition,
    onRemovePosition,
  } = useProAmmMintActionHandlers(noLiquidity, pIndex)

  const onAddPositionEvent = useCallback(() => {
    if (tokenA?.symbol && tokenB?.symbol)
      mixpanelHandler(MIXPANEL_TYPE.ELASTIC_ADD_LIQUIDITY_ADD_NEW_POSITION, {
        token_1: tokenA?.symbol,
        token_2: tokenB?.symbol,
      })
    onAddPosition()
  }, [mixpanelHandler, onAddPosition, tokenA?.symbol, tokenB?.symbol])

  const onRemovePositionEvent = useCallback(
    (positionIndex: number) => {
      if (tokenA?.symbol && tokenB?.symbol)
        mixpanelHandler(MIXPANEL_TYPE.ELASTIC_ADD_LIQUIDITY_CLICK_TO_REMOVE_POSITION, {
          token_1: tokenA?.symbol,
          token_2: tokenB?.symbol,
        })
      onRemovePosition(positionIndex)
    },
    [mixpanelHandler, onRemovePosition, tokenA?.symbol, tokenB?.symbol],
  )

  // modal and loading
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm

  // capital efficiency warning
  const [showCapitalEfficiencyWarning, setShowCapitalEfficiencyWarning] = useState(false)

  useEffect(() => setShowCapitalEfficiencyWarning(false), [baseCurrency, quoteCurrency, feeAmount])

  // txn values
  const deadline = useTransactionDeadline() // custom from users settings

  const [txHash, setTxHash] = useState<string>('')

  // get formatted amounts
  const formattedAmounts = {
    [independentField]: typedValue,
    [dependentField]: parsedAmounts[dependentField]?.toExact() ?? '',
  }

  // get the max amounts user can add
  const maxAmounts: { [field in Field]: CurrencyAmount<Currency> } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      let maxAmount = maxAmountSpend(currencyBalances[field])
      let amountUnlock = JSBI.BigInt('0')
      if (maxAmount && currencies[field] && noLiquidity && tokenA && tokenB) {
        if (
          (!invertPrice && tokenA.equals(currencies[field] as Currency)) ||
          (invertPrice && tokenB.equals(currencies[field] as Currency))
        ) {
          amountUnlock = amount0Unlock
        } else {
          amountUnlock = amount1Unlock
        }
        maxAmount = maxAmount?.subtract(CurrencyAmount.fromRawAmount(currencies[field] as Currency, amountUnlock))
        const zero = CurrencyAmount.fromRawAmount(currencies[field] as Currency, 0)
        if (maxAmount.lessThan(zero)) {
          maxAmount = zero
        }
      }

      return {
        ...accumulator,
        [field]: maxAmount,
      }
    },
    {} as { [field in Field]: CurrencyAmount<Currency> },
  )

  const amountUnlocks: { [field in Field]: CurrencyAmount<Currency> } = [Field.CURRENCY_A, Field.CURRENCY_B].reduce(
    (accumulator, field) => {
      let amountUnlock = JSBI.BigInt('0')
      if (currencies[field] && noLiquidity && tokenA && tokenB) {
        if (
          (!invertPrice && tokenA.equals(currencies[field] as Currency)) ||
          (invertPrice && tokenB.equals(currencies[field] as Currency))
        ) {
          amountUnlock = amount0Unlock
        } else {
          amountUnlock = amount1Unlock
        }
      }

      return {
        ...accumulator,
        [field]: currencies[field]
          ? CurrencyAmount.fromRawAmount(currencies[field] as Currency, amountUnlock)
          : undefined,
      }
    },
    {} as { [field in Field]: CurrencyAmount<Currency> },
  )

  // check whether the user has approved the router on the tokens
  const [approvalA, approveACallback] = useApproveCallback(
    !!currencies_A && depositADisabled && noLiquidity
      ? CurrencyAmount.fromFractionalAmount(currencies_A, ONE, ONE)
      : isMultiplePosition
      ? currencyAmountSum[Field.CURRENCY_A]
      : parsedAmounts_A,
    isEVM ? (networkInfo as EVMNetworkInfo).elastic.nonfungiblePositionManager : undefined,
  )

  const [approvalB, approveBCallback] = useApproveCallback(
    !!currencies_B && depositBDisabled && noLiquidity
      ? CurrencyAmount.fromFractionalAmount(currencies_B, ONE, ONE)
      : isMultiplePosition
      ? currencyAmountSum[Field.CURRENCY_B]
      : parsedAmounts_B,
    isEVM ? (networkInfo as EVMNetworkInfo).elastic.nonfungiblePositionManager : undefined,
  )

  const tokens = useMemo(
    () => [currencies_A, currencies_B].map(currency => currency?.wrapped),
    [currencies_A, currencies_B],
  )
  const {
    data: usdPrices,
    loading,
    fetchPrices,
    refetch,
  } = useTokenPricesWithLoading(tokens.map(t => t?.wrapped.address || ''))
  const marketPrice =
    usdPrices[quoteCurrency?.wrapped.address || ''] &&
    usdPrices[baseCurrency?.wrapped.address || ''] &&
    usdPrices[baseCurrency?.wrapped.address || ''] / usdPrices[quoteCurrency?.wrapped.address || '']

  useInterval(refetch, 10_000)

  const amountUnlockUSD =
    Number(amountUnlocks[Field.CURRENCY_A]?.toExact()) *
      usdPrices[amountUnlocks[Field.CURRENCY_A]?.currency.wrapped.address] +
    Number(amountUnlocks[Field.CURRENCY_B]?.toExact()) *
      usdPrices[amountUnlocks[Field.CURRENCY_B]?.currency.wrapped.address]

  const estimatedUsdCurrencyA =
    parsedAmounts_A && usdPrices[tokens[0]?.address || '']
      ? parseFloat(parsedAmounts_A.toExact()) * usdPrices[tokens[0]?.address || '']
      : 0

  const estimatedUsdCurrencyB =
    parsedAmounts_B && usdPrices[tokens[1]?.address || '']
      ? parseFloat(parsedAmounts_B.toExact()) * usdPrices[tokens[1]?.address || '']
      : 0

  const [userSlippageTolerance] = useUserSlippageTolerance()

  const positionsParam = isMultiplePosition
    ? positions.every(Boolean)
      ? (positions as Position[])
      : undefined
    : position

  const previousTicksParam = isMultiplePosition ? mutiplePreviousTicks : previousTicks

  const { data: poolDatas } = useGetElasticPools([poolAddress])

  const onAdd = useCallback(
    async function () {
      if (!isEVM || !library || !account) return

      if (!positionManager || !baseCurrency || !quoteCurrency) {
        return
      }

      // if (!previousTicksParam || previousTicksParam.length !== 2) {
      //   return
      // }
      if (positionsParam && account && deadline && previousTicksParam) {
        const useNative = baseCurrency.isNative ? baseCurrency : quoteCurrency.isNative ? quoteCurrency : undefined

        const { calldata, value } = NonfungiblePositionManager.addCallParameters(positionsParam, previousTicksParam, {
          slippageTolerance: basisPointsToPercent(userSlippageTolerance),
          recipient: account,
          deadline: deadline.toString(),
          useNative,
          createPool: noLiquidity,
        })

        //0.00283161
        const txn: { to: string; data: string; value: string } = {
          to: (networkInfo as EVMNetworkInfo).elastic.nonfungiblePositionManager,
          data: calldata,
          value,
        }

        setAttemptingTxn(true)
        library
          .getSigner()
          .estimateGas(txn)
          .then((estimate: BigNumber) => {
            const newTxn = {
              ...txn,
              gasLimit: calculateGasMargin(estimate),
            }
            //calculateGasMargin = 0x0827f6

            return library
              .getSigner()
              .sendTransaction(newTxn)
              .then((response: TransactionResponse) => {
                onResetMintState()
                navigate(`${APP_PATHS.MY_POOLS}/${networkInfo.route}?tab=elastic`)

                setAttemptingTxn(false)
                if (noLiquidity) {
                  const tokenAmountIn = parsedAmounts_A?.toSignificant(6) ?? '0'
                  const tokenAmountOut = parsedAmounts_B?.toSignificant(6) ?? '0'
                  addTransactionWithType({
                    hash: response.hash,
                    type: TRANSACTION_TYPE.ELASTIC_CREATE_POOL,
                    extraInfo: {
                      tokenSymbolIn: baseCurrency.symbol ?? '',
                      tokenSymbolOut: quoteCurrency.symbol ?? '',
                      tokenAmountIn,
                      tokenAmountOut,
                      tokenAddressIn: baseCurrency.wrapped.address,
                      tokenAddressOut: quoteCurrency.wrapped.address,
                    },
                  })
                } else {
                  let tokenAmountIn, tokenAmountOut
                  if (isMultiplePosition) {
                    tokenAmountIn = currencyAmountSum[Field.CURRENCY_A]?.toSignificant(6) ?? '0'
                    tokenAmountOut = currencyAmountSum[Field.CURRENCY_B]?.toSignificant(6) ?? '0'
                  } else {
                    tokenAmountIn = parsedAmounts_A?.toSignificant(6) ?? '0'
                    tokenAmountOut = parsedAmounts_B?.toSignificant(6) ?? '0'
                  }
                  addTransactionWithType({
                    hash: response.hash,
                    type: TRANSACTION_TYPE.ELASTIC_ADD_LIQUIDITY,
                    extraInfo: {
                      contract: poolAddress,
                      tokenAmountIn,
                      tokenAmountOut,
                      tokenSymbolIn: baseCurrency.symbol,
                      tokenSymbolOut: quoteCurrency.symbol,
                      tokenAddressIn: baseCurrency.wrapped.address,
                      tokenAddressOut: quoteCurrency.wrapped.address,
                    },
                  })
                }
              })
          })
          .catch((error: any) => {
            setAttemptingTxn(false)
            // sending tx error, not tx execute error
            const message = friendlyError(error)
            console.error('Add liquidity error:', { message, error })
            notify(
              {
                title: t`Add liquidity error`,
                summary: message,
                type: NotificationType.ERROR,
              },
              8000,
            )
          })
      } else {
        return
      }
    },
    [
      isEVM,
      library,
      account,
      positionManager,
      baseCurrency,
      quoteCurrency,
      positionsParam,
      deadline,
      previousTicksParam,
      userSlippageTolerance,
      noLiquidity,
      networkInfo,
      onResetMintState,
      navigate,
      parsedAmounts_A,
      parsedAmounts_B,
      addTransactionWithType,
      isMultiplePosition,
      poolAddress,
      currencyAmountSum,
      notify,
    ],
  )

  const handleCurrencySelect = useCallback(
    (currencyNew: Currency, currencyIdOther?: string): (string | undefined)[] => {
      const currencyIdNew = currencyId(currencyNew, chainId)

      if (currencyIdNew === currencyIdOther) {
        // not ideal, but for now clobber the other if the currency ids are equal
        return [currencyIdNew, undefined]
      } else {
        // prevent weth + eth
        const isETHOrWETHNew = currencyNew.isNative || (chainId && currencyIdNew === WETH[chainId]?.address)
        const isETHOrWETHOther =
          !!currencyIdOther &&
          ((chainId && currencyIdOther === NativeCurrencies[chainId].symbol) ||
            (chainId && currencyIdOther === WETH[chainId]?.address))

        if (isETHOrWETHNew && isETHOrWETHOther) {
          return [currencyIdNew, undefined]
        } else {
          return [currencyIdNew, currencyIdOther]
        }
      }
    },
    [chainId],
  )

  const handleCurrencyASelect = useCallback(
    (currencyANew: Currency) => {
      const [idA, idB] = handleCurrencySelect(currencyANew, currencyIdB)
      if (idB === undefined) {
        navigate(`/${networkInfo.route}${APP_PATHS.ELASTIC_CREATE_POOL}/${idA}`)
      } else {
        navigate(`/${networkInfo.route}${APP_PATHS.ELASTIC_CREATE_POOL}/${idA}/${idB}`)
      }
    },
    [handleCurrencySelect, currencyIdB, navigate, networkInfo.route],
  )

  const handleCurrencyBSelect = useCallback(
    (currencyBNew: Currency) => {
      const [idB, idA] = handleCurrencySelect(currencyBNew, currencyIdA)
      if (idA === undefined) {
        navigate(`/${networkInfo.route}${APP_PATHS.ELASTIC_CREATE_POOL}/${idB}`)
      } else {
        navigate(`/${networkInfo.route}${APP_PATHS.ELASTIC_CREATE_POOL}/${idA}/${idB}`)
      }
    },
    [handleCurrencySelect, currencyIdA, navigate, networkInfo.route],
  )

  const handleFeePoolSelect = useCallback(
    (newFeeAmount: FeeAmount) => {
      onLeftRangeInput('')
      onRightRangeInput('')
      navigate(`/${networkInfo.route}${APP_PATHS.ELASTIC_CREATE_POOL}/${currencyIdA}/${currencyIdB}/${newFeeAmount}`)
    },
    [currencyIdA, currencyIdB, navigate, networkInfo.route, onLeftRangeInput, onRightRangeInput],
  )

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onFieldAInput('')
      // dont jump to pool page if creating
      navigate(`${APP_PATHS.MY_POOLS}/${networkInfo.route}?tab=elastic`)
    }
    setTxHash('')
  }, [navigate, networkInfo.route, onFieldAInput, txHash])

  const handleDismissConfirmationRef = useRef(handleDismissConfirmation)

  const [waitForMarketPrice, setWaitForMarketPrice] = useState(false)
  useEffect(() => {
    setPositionIndex(0)
    onResetMintState()
    handleDismissConfirmationRef.current()
    setWaitForMarketPrice(true)
  }, [onResetMintState, baseCurrency?.wrapped.address, quoteCurrency?.wrapped.address, feeAmount, chainId])

  useEffect(() => {
    if (waitForMarketPrice && marketPrice) {
      onStartPriceInput(toFixed(marketPrice))
      setWaitForMarketPrice(false)
    }
  }, [waitForMarketPrice, marketPrice, onStartPriceInput])

  const leftPrice = isSorted ? priceLower : priceUpper?.invert()
  const rightPrice = isSorted ? priceUpper : priceLower?.invert()

  const { getDecrementLower, getIncrementLower, getDecrementUpper, getIncrementUpper, getSetRange } =
    useRangeHopCallbacks(
      baseCurrency ?? undefined,
      quoteCurrency ?? undefined,
      feeAmount,
      tickLower,
      tickUpper,
      pIndex,
      pool,
    )

  const setRange = useCallback(
    (range: RANGE) => {
      if (tokenA?.symbol && tokenB?.symbol)
        mixpanelHandler(MIXPANEL_TYPE.ELASTIC_ADD_LIQUIDITY_SELECT_RANGE_FOR_POOL, {
          token_1: tokenA?.symbol,
          token_2: tokenB?.symbol,
          range,
        })
      getSetRange(range)
    },
    [mixpanelHandler, getSetRange, tokenA?.symbol, tokenB?.symbol],
  )

  // we need an existence check on parsed amounts for single-asset deposits
  const showApprovalA = approvalA !== ApprovalState.APPROVED && (noLiquidity ? true : !!parsedAmounts_A)
  const showApprovalB = approvalB !== ApprovalState.APPROVED && (noLiquidity ? true : !!parsedAmounts_B)

  const pendingText: string = useMemo(() => {
    let amountAText: string, amountBText: string
    if (isMultiplePosition) {
      const amountA = currencyAmountSum[Field.CURRENCY_A]
      const amountB = currencyAmountSum[Field.CURRENCY_B]
      amountAText = amountA ? `${amountA.toSignificant(10)} ${amountA.currency.symbol}` : ''
      amountBText = amountB ? `${amountB.toSignificant(10)} ${amountB.currency.symbol}` : ''
    } else {
      amountAText = !depositADisabled ? `${parsedAmounts_A?.toSignificant(10)} ${currencies_A?.symbol}` : ''
      amountBText = !depositBDisabled ? `${parsedAmounts_B?.toSignificant(10)} ${currencies_B?.symbol}` : ''
    }

    if (amountAText && amountBText) {
      if (positions.length === 1) return t`Supplying ${amountAText} and ${amountBText}`
      return t`Supplying ${amountAText} and ${amountBText} across ${positions.length} positions`
    } else if (amountAText || amountBText) {
      if (positions.length === 1) return t`Supplying ${amountAText || amountBText}`
      return t`Supplying ${amountAText || amountBText} across ${positions.length} positions`
    }
    return ''
  }, [
    currencies_A?.symbol,
    currencies_B?.symbol,
    currencyAmountSum,
    depositADisabled,
    depositBDisabled,
    isMultiplePosition,
    parsedAmounts_A,
    parsedAmounts_B,
    positions.length,
  ])

  const upToXL = useMedia(`(max-width: ${MEDIA_WIDTHS.upToXL}px)`)
  const upToLarge = useMedia(`(max-width: ${MEDIA_WIDTHS.upToLarge}px)`)
  const upToMedium = useMedia(`(max-width: ${MEDIA_WIDTHS.upToMedium}px)`)
  const upToXXSmall = useMedia(`(max-width: ${MEDIA_WIDTHS.upToXXSmall}px)`)

  const isPriceDeviated =
    baseCurrency &&
    quoteCurrency &&
    tokenA &&
    tokenB &&
    price &&
    Math.abs(
      Number((isSorted ? price : price?.invert())?.toSignificant(18)) /
        (usdPrices[tokenA.wrapped.address] / usdPrices[tokenB.wrapped.address]) -
        1,
    ) >= 0.02
  const isFullRange = activeRange === RANGE.FULL_RANGE
  const isValid = !errorMessage && !invalidRange
  const isWarningButton = isPriceDeviated || isFullRange || outOfRange

  const Buttons = () =>
    !account ? (
      <ButtonLight onClick={toggleWalletModal} width={upToMedium ? '100%' : 'fit-content'} minWidth="164px !important">
        <Trans>Connect</Trans>
      </ButtonLight>
    ) : (
      <Flex
        sx={{ gap: '16px' }}
        flexDirection={upToMedium ? 'column' : 'row'}
        width={upToMedium ? '100%' : 'fit-content'}
      >
        {(approvalA === ApprovalState.NOT_APPROVED ||
          approvalA === ApprovalState.PENDING ||
          approvalB === ApprovalState.NOT_APPROVED ||
          approvalB === ApprovalState.PENDING) &&
          isValid && (
            <>
              {showApprovalA && (
                <ButtonPrimary
                  onClick={approveACallback}
                  disabled={approvalA === ApprovalState.PENDING}
                  width={upToMedium ? '100%' : 'fit-content'}
                  minWidth="150px"
                >
                  {approvalA === ApprovalState.PENDING ? (
                    <Dots>
                      <Trans>Approving {currencies_A?.symbol}</Trans>
                    </Dots>
                  ) : (
                    <Trans>Approve {currencies_A?.symbol}</Trans>
                  )}
                </ButtonPrimary>
              )}
              {showApprovalB && (
                <ButtonPrimary
                  onClick={approveBCallback}
                  disabled={approvalB === ApprovalState.PENDING}
                  width={upToMedium ? '100%' : 'fit-content'}
                  minWidth="150px"
                >
                  {approvalB === ApprovalState.PENDING ? (
                    <Dots>
                      <Trans>Approving {currencies_B?.symbol}</Trans>
                    </Dots>
                  ) : (
                    <Trans>Approve {currencies_B?.symbol}</Trans>
                  )}
                </ButtonPrimary>
              )}
            </>
          )}
        <ButtonError
          id="btnSupply"
          onClick={() => {
            isDegenMode ? onAdd() : setShowConfirm(true)
          }}
          disabled={
            !isValid ||
            (approvalA !== ApprovalState.APPROVED && (!depositADisabled || noLiquidity)) ||
            (approvalB !== ApprovalState.APPROVED && (!depositBDisabled || noLiquidity))
          }
          error={!isValid && !!parsedAmounts_A && !!parsedAmounts_B}
          warning={isWarningButton}
          minWidth="164px"
          width={upToMedium ? '100%' : 'fit-content'}
        >
          <Text fontWeight={500}>
            {errorMessage ? errorMessage : isDegenMode ? <Trans>Supply</Trans> : <Trans>Preview</Trans>}
          </Text>
        </ButtonError>
      </Flex>
    )

  const chartRef = useRef<HTMLDivElement>(null)

  const [, reRender] = useState({})
  const isClient = typeof window === 'object'
  useEffect(() => {
    // reset width of warning on screen resize (mobile device rotating, resizing browser window)
    if (!isClient) return

    function handleResize() {
      reRender({})
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isClient])

  const [allowedSlippage] = useUserSlippageTolerance()
  const slippageStatus = checkRangeSlippage(allowedSlippage, false)

  const warnings = (
    <Flex flexDirection="column" sx={{ gap: '12px' }} alignItems="flex-end" maxWidth={chartRef?.current?.clientWidth}>
      {noLiquidity && (
        <SubTextCard padding="10px 16px">
          <Flex alignItems="center">
            <TYPE.black ml="12px" fontSize="12px" flex={1}>
              <Trans>
                Note: A very small amount of your liquidity about{' '}
                {formatDisplayNumber(amountUnlockUSD, { style: 'currency', significantDigits: 6 })}{' '}
                <Text as="span" color={theme.text}>
                  ({formatDisplayNumber(amountUnlocks[Field.CURRENCY_A], { significantDigits: 6 })}{' '}
                  {amountUnlocks[Field.CURRENCY_A].currency.symbol},{' '}
                  {formatDisplayNumber(amountUnlocks[Field.CURRENCY_B], { significantDigits: 6 })}{' '}
                  {amountUnlocks[Field.CURRENCY_B].currency.symbol})
                </Text>{' '}
                will be used to first initialize the pool. Read more{' '}
                <ExternalLink href="https://docs.kyberswap.com/liquidity-solutions/kyberswap-elastic/user-guides/yield-farming-on-static-farms">
                  here↗
                </ExternalLink>
              </Trans>
            </TYPE.black>
          </Flex>
        </SubTextCard>
      )}
      {isPriceDeviated && (
        <WarningCard padding="10px 16px">
          <Flex alignItems="center">
            <AlertTriangle stroke={theme.warning} size="16px" />
            <TYPE.black ml="12px" fontSize="12px" flex={1}>
              {noLiquidity ? (
                <Trans>
                  The pool’s current price of 1 {baseCurrency.symbol} ={' '}
                  {formatDisplayNumber(invertPrice ? price.invert() : price, { significantDigits: 4 })}{' '}
                  {quoteCurrency.symbol} deviates from the market price (1 {baseCurrency.symbol} ={' '}
                  {formatDisplayNumber(usdPrices[tokenA.wrapped.address] / usdPrices[tokenB.wrapped.address], {
                    significantDigits: 4,
                  })}{' '}
                  {quoteCurrency.symbol}). You might have high impermanent loss after the pool is created
                </Trans>
              ) : (
                <Trans>
                  The pool’s current price of 1 {baseCurrency.symbol} ={' '}
                  {formatDisplayNumber(invertPrice ? price.invert() : price, { significantDigits: 4 })}{' '}
                  {quoteCurrency.symbol} deviates from the market price (1 {baseCurrency.symbol} ={' '}
                  {formatDisplayNumber(usdPrices[tokenA.wrapped.address] / usdPrices[tokenB.wrapped.address], {
                    significantDigits: 4,
                  })}{' '}
                  {quoteCurrency.symbol}). You might have high impermanent loss after you add liquidity to this pool
                </Trans>
              )}
            </TYPE.black>
          </Flex>
        </WarningCard>
      )}
      {errorLabel && (
        <WarningCard padding="10px 16px">
          <Flex alignItems="center">
            <AlertTriangle stroke={theme.warning} size="16px" />
            <TYPE.black ml="12px" fontSize="12px" flex={1}>
              {errorLabel}
            </TYPE.black>
          </Flex>
        </WarningCard>
      )}
      {invalidRange ? (
        <WarningCard padding="10px 16px">
          <Flex alignItems="center">
            <AlertTriangle stroke={theme.warning} size="16px" />
            <TYPE.black ml="12px" fontSize="12px" flex={1}>
              <Trans>Invalid range selected. The min price must be lower than the max price</Trans>
            </TYPE.black>
          </Flex>
        </WarningCard>
      ) : isFullRange ? (
        <WarningCard padding="10px 16px">
          <Flex alignItems="center">
            <AlertTriangle stroke={theme.warning} size="16px" />
            <TYPE.black ml="12px" fontSize="12px" flex={1}>
              <Trans>Efficiency Comparison: Full range positions may earn less fees than concentrated positions</Trans>
            </TYPE.black>
          </Flex>
        </WarningCard>
      ) : outOfRange ? (
        <WarningCard padding="10px 16px">
          <Flex alignItems="center">
            <AlertTriangle stroke={theme.warning} size="16px" />
            <TYPE.black ml="12px" fontSize="12px" flex={1}>
              <Trans>
                Your position will not earn fees until the market price of the pool moves into your price range
              </Trans>
            </TYPE.black>
          </Flex>
        </WarningCard>
      ) : null}
      {farmPosWarning && (
        <WarningCard padding="10px 16px">
          <Flex alignItems="center">
            <AlertTriangle stroke={theme.warning} size="16px" />
            <TYPE.black ml="12px" fontSize="12px" flex={1}>
              <Trans>
                Warning: The price range for this liquidity position is not eligible for farming rewards. To become
                eligible for rewards, please match the farm’s active range(s)
              </Trans>
            </TYPE.black>
          </Flex>
        </WarningCard>
      )}

      {slippageStatus === SLIPPAGE_STATUS.HIGH && (
        <WarningCard padding="10px 16px">
          <Flex alignItems="center">
            <AlertTriangle stroke={theme.warning} size="16px" />
            <TYPE.black ml="12px" fontSize="12px" flex={1}>
              <Trans>
                <TextUnderlineColor
                  style={{ minWidth: 'max-content' }}
                  as="a"
                  href={SLIPPAGE_EXPLANATION_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Slippage
                </TextUnderlineColor>
                <TextUnderlineTransparent> is high. Your transaction may be front-run</TextUnderlineTransparent>
              </Trans>
            </TYPE.black>
          </Flex>
        </WarningCard>
      )}
    </Flex>
  )

  const disableFeeSelect = !currencyIdA || !currencyIdB
  const disableRangeSelect = !feeAmount || invalidPool || (noLiquidity && !startPriceTypedValue)
  const hasTab = !noLiquidity && !disableRangeSelect
  const disableAmountSelect = disableRangeSelect || tickLower === undefined || tickUpper === undefined || invalidRange
  const [shownTooltip, setShownTooltip] = useState<RANGE | null>(null)
  const pairFactor = usePairFactor([tokenA, tokenB])

  const isReverseWithFarm = baseCurrency?.wrapped.address !== farmV2S?.[0]?.token0.wrapped.address

  const chart = (
    <ChartWrapper ref={chartRef}>
      {hasTab && (
        <Tabs
          tabsCount={positionsState.length}
          selectedTab={pIndex}
          onChangedTab={index => setPositionIndex(index)}
          onAddTab={onAddPositionEvent}
          onRemoveTab={onRemovePositionEvent}
          showChart={showChart}
          onToggleChart={(newShowChart: boolean | undefined) => {
            const newValue = typeof newShowChart !== 'undefined' ? newShowChart : !showChart
            if (newValue && tokenA?.symbol && tokenB?.symbol) {
              mixpanelHandler(MIXPANEL_TYPE.ELASTIC_ADD_LIQUIDITY_CLICK_PRICE_CHART, {
                token_1: tokenA?.symbol,
                token_2: tokenB?.symbol,
              })
            }
            setShowChart(newValue)
          }}
        />
      )}
      <ChartBody>
        {hasTab && (
          <PoolPriceChart currencyA={baseCurrency} currencyB={quoteCurrency} feeAmount={feeAmount} show={showChart} />
        )}
        {hasTab && showChart ? null : (
          <>
            <DynamicSection gap="md" disabled={disableRangeSelect}>
              <Flex sx={{ gap: '6px' }} alignItems="center" lineHeight={1.5}>
                <MouseoverTooltip
                  text={t`Represents the range where all your liquidity is concentrated. When market price of your token pair is no longer between your selected price range, your liquidity becomes inactive and you stop earning fees`}
                >
                  <RangeTab active={!showFarmRangeSelect} role="button" onClick={() => setShowFarmRangeSelect(false)}>
                    {isFarmV2Available ? <Trans>Custom Ranges</Trans> : <Trans>Select a Range</Trans>}
                  </RangeTab>
                </MouseoverTooltip>

                {isFarmV2Available && (
                  <>
                    <Text fontWeight="500" fontSize="12px" color={theme.subText}>
                      |
                    </Text>

                    <MouseoverTooltip
                      text={
                        <Text>
                          <Trans>
                            Add your liquidity into one of the farming ranges to participate in Elastic Static Farm.
                            Only positions that cover the range of the farm will earn maximum rewards. Learn more{' '}
                            <ExternalLink href="https://docs.kyberswap.com/liquidity-solutions/kyberswap-elastic/user-guides/yield-farming-on-elastic">
                              here ↗
                            </ExternalLink>
                          </Trans>
                        </Text>
                      }
                    >
                      <RangeTab
                        active={showFarmRangeSelect}
                        role="button"
                        onClick={() => {
                          range && onFarmRangeSelected(range.tickLower, range.tickUpper)
                          setShowFarmRangeSelect(true)
                        }}
                      >
                        <Trans>Farming Ranges</Trans>
                      </RangeTab>
                    </MouseoverTooltip>
                  </>
                )}
              </Flex>
              {showFarmRangeSelect && !!activeRanges.length && farmV2S?.[0] && (
                <Flex sx={{ gap: '8px' }} flexWrap="wrap">
                  {activeRanges.map(range => {
                    if (range.isRemoved) return null
                    return (
                      <RangeBtn
                        style={{ width: 'fit-content' }}
                        key={range.farm.fId + '_' + range.index}
                        onClick={() => {
                          searchParams.set('farmRange', range.index.toString())
                          searchParams.set('fId', range.farm.fId.toString())
                          setSearchParams(searchParams)
                          onFarmRangeSelected(+range.tickLower, +range.tickUpper)
                        }}
                        isSelected={activeRangeIndex === range.index && defaultFId === range.farm.fId}
                      >
                        <Flex alignItems="center" sx={{ gap: '2px' }}>
                          {convertTickToPrice(
                            isReverseWithFarm ? farmV2S[0].token1 : farmV2S[0].token0,
                            isReverseWithFarm ? farmV2S[0].token0 : farmV2S[0].token1,
                            isReverseWithFarm ? range.tickUpper : range.tickLower,
                            farmV2S[0].pool.fee,
                          )}
                          <TwoWayArrow />
                          {convertTickToPrice(
                            isReverseWithFarm ? farmV2S[0].token1 : farmV2S[0].token0,
                            isReverseWithFarm ? farmV2S[0].token0 : farmV2S[0].token1,
                            isReverseWithFarm ? range.tickLower : range.tickUpper,
                            farmV2S[0].pool.fee,
                          )}
                        </Flex>
                      </RangeBtn>
                    )
                  })}
                </Flex>
              )}
              {!showFarmRangeSelect &&
                (() => {
                  const gap = '16px'
                  const buttonColumn = upToMedium ? 2 : 4
                  const buttonWidth = `calc((100% - ${gap} * (${buttonColumn} - 1)) / ${buttonColumn})`
                  return (
                    <Row gap={gap} flexWrap="wrap">
                      {RANGE_LIST.map(range => (
                        <Flex key={rangeData[range].title} width={buttonWidth}>
                          <Tooltip
                            text={rangeData[range].tooltip[pairFactor]}
                            containerStyle={{ width: '100%' }}
                            show={shownTooltip === range}
                            placement="bottom"
                          >
                            <RangeBtn
                              onClick={() => setRange(range)}
                              isSelected={range === activeRange}
                              onMouseEnter={() => setShownTooltip(range)}
                              onMouseLeave={() => setShownTooltip(null)}
                            >
                              {rangeData[range].title}
                            </RangeBtn>
                          </Tooltip>
                        </Flex>
                      ))}
                    </Row>
                  )
                })()}

              <Box
                sx={{
                  display: 'grid',
                  gridGap: upToMedium ? '12px' : '24px',
                  gridTemplateColumns: `repeat(${upToMedium ? 1 : 2} , fit-content(100%) fit-content(100%))`,
                }}
              >
                <Text fontSize={12} color={theme.red}>
                  <Trans>Estimated Risk</Trans>
                </Text>
                <Rating point={riskPoint} color={theme.red} />
                <Text fontSize={12} color={theme.primary}>
                  <Trans>Estimated Profit</Trans>
                </Text>
                <Rating point={profitPoint} color={theme.primary} />
              </Box>
              {price && baseCurrency && quoteCurrency && !noLiquidity && (
                <Flex justifyContent="center" marginTop="0.5rem" sx={{ gap: '0.25rem' }}>
                  <Text fontWeight={500} textAlign="center" color={theme.subText} fontSize={12}>
                    <Trans>Current Price</Trans>
                  </Text>
                  <Text fontWeight={500} textAlign="center" fontSize={12}>
                    <HoverInlineText
                      maxCharacters={20}
                      text={formatDisplayNumber(invertPrice ? price.invert() : price, {
                        significantDigits: 6,
                      })}
                    />
                  </Text>
                  <Text fontSize={12}>
                    {quoteCurrency?.symbol} per {baseCurrency.symbol}
                  </Text>
                </Flex>
              )}
              <LiquidityChartRangeInput
                currencyA={baseCurrency ?? undefined}
                currencyB={quoteCurrency ?? undefined}
                feeAmount={feeAmount}
                ticksAtLimit={ticksAtLimit}
                price={price ? parseFloat((invertPrice ? price.invert() : price).toSignificant(8)) : undefined}
                leftPrice={leftPrice}
                rightPrice={rightPrice}
                onLeftRangeInput={onLeftRangeInput}
                onRightRangeInput={onRightRangeInput}
                interactive
                height="233.5px"
              />
              <DynamicSection gap="md" disabled={disableRangeSelect}>
                <StackedContainer>
                  <StackedItem style={{ opacity: showCapitalEfficiencyWarning ? '0.05' : 1 }}>
                    <RangeSelector
                      priceLower={priceLower}
                      priceUpper={priceUpper}
                      getDecrementLower={getDecrementLower}
                      getIncrementLower={getIncrementLower}
                      getDecrementUpper={getDecrementUpper}
                      getIncrementUpper={getIncrementUpper}
                      onLeftRangeInput={onLeftRangeInput}
                      onRightRangeInput={onRightRangeInput}
                      currencyA={baseCurrency}
                      currencyB={quoteCurrency}
                      feeAmount={feeAmount}
                      ticksAtLimit={ticksAtLimit}
                    />
                  </StackedItem>
                </StackedContainer>
              </DynamicSection>
            </DynamicSection>
            <DynamicSection style={{ marginTop: '16px' }} gap="12px" disabled={disableAmountSelect}>
              <Text fontWeight={500} fontSize="12px">
                <Trans>Deposit Amounts</Trans>
              </Text>
              <Flex sx={{ gap: '16px' }} flexDirection={upToMedium ? 'column' : 'row'}>
                <Flex width="100%">
                  <CurrencyInputPanel
                    value={formattedAmounts[Field.CURRENCY_A]}
                    onUserInput={onFieldAInput}
                    onMax={() => {
                      onFieldAInput(maxAmounts[Field.CURRENCY_A]?.toExact() ?? '')
                    }}
                    onHalf={() => {
                      onFieldAInput(currencyBalanceA?.divide(2).toExact() ?? '')
                    }}
                    currency={currencies_A ?? null}
                    id="add-liquidity-input-tokena"
                    showCommonBases
                    positionMax="top"
                    locked={depositADisabled}
                    estimatedUsd={formattedNum(estimatedUsdCurrencyA.toString(), true) || undefined}
                    disableCurrencySelect={!baseCurrencyIsETHER && !baseCurrencyIsWETH}
                    isSwitchMode={baseCurrencyIsETHER || baseCurrencyIsWETH}
                    onSwitchCurrency={() => {
                      chainId &&
                        navigate(
                          `/${networkInfo.route}${APP_PATHS.ELASTIC_CREATE_POOL}/${
                            baseCurrencyIsETHER ? WETH[chainId].address : NativeCurrencies[chainId].symbol
                          }/${currencyIdB}/${feeAmount}`,
                          { replace: true },
                        )
                    }}
                    outline
                  />
                </Flex>
                <Flex width="100%">
                  <CurrencyInputPanel
                    value={formattedAmounts[Field.CURRENCY_B]}
                    onUserInput={onFieldBInput}
                    onMax={() => {
                      onFieldBInput(maxAmounts[Field.CURRENCY_B]?.toExact() ?? '')
                    }}
                    onHalf={() => {
                      onFieldBInput(currencyBalanceB?.divide(2).toExact() ?? '')
                    }}
                    currency={currencies_B ?? null}
                    id="add-liquidity-input-tokenb"
                    showCommonBases
                    positionMax="top"
                    locked={depositBDisabled}
                    estimatedUsd={formattedNum(estimatedUsdCurrencyB.toString(), true) || undefined}
                    disableCurrencySelect={!quoteCurrencyIsETHER && !quoteCurrencyIsWETH}
                    isSwitchMode={quoteCurrencyIsETHER || quoteCurrencyIsWETH}
                    onSwitchCurrency={() => {
                      chainId &&
                        navigate(
                          `/${networkInfo.route}${APP_PATHS.ELASTIC_CREATE_POOL}/${currencyIdA}/${
                            quoteCurrencyIsETHER ? WETH[chainId].address : NativeCurrencies[chainId].symbol
                          }/${feeAmount}`,
                          { replace: true },
                        )
                    }}
                    outline
                  />
                </Flex>
              </Flex>
            </DynamicSection>
          </>
        )}
      </ChartBody>
    </ChartWrapper>
  )

  // const [viewMode] = useViewMode()
  const viewMode = VIEW_MODE.LIST
  const [rotated, setRotated] = useState(false)
  const modalContent = () => {
    if (!isMultiplePosition) {
      return (
        position && (
          <div style={{ marginTop: '1rem' }}>
            <ProAmmPoolInfo position={position} />
            <ProAmmPooledTokens
              liquidityValue0={CurrencyAmount.fromRawAmount(
                unwrappedToken(position.pool.token0),
                position.amount0.quotient,
              )}
              liquidityValue1={CurrencyAmount.fromRawAmount(
                unwrappedToken(position.pool.token1),
                position.amount1.quotient,
              )}
              title={t`New Liquidity Amount`}
            />
            <ProAmmPriceRangeConfirm position={position} ticksAtLimit={ticksAtLimit} />
          </div>
        )
      )
    }
    if (!positions.every(Boolean)) return null
    const positionsValidated: Position[] = positions as Position[]
    return (
      <div style={{ marginTop: '1rem' }}>
        <ProAmmPoolInfo
          position={positionsValidated[0]}
          narrow={true}
          rotatedProp={rotated}
          setRotatedProp={setRotated}
          showRangeInfo={false}
        />
        {viewMode === VIEW_MODE.LIST ? (
          <ListPositions
            positions={positionsValidated}
            usdPrices={usdPrices}
            ticksAtLimits={ticksAtLimits}
            rotated={rotated}
          />
        ) : (
          <ChartPositions
            positions={positionsValidated}
            usdPrices={usdPrices}
            rotated={rotated}
            ticksAtLimits={ticksAtLimits}
          />
        )}
      </div>
    )
  }

  const poolStat = poolDatas?.[poolAddress] || poolDatas?.[poolAddress.toLowerCase()]
  const poolStatRef = useRef(poolStat)
  if (poolStat) {
    poolStatRef.current = poolStat
  }

  const openShareModal = useOpenModal(ApplicationModal.SHARE)
  const userLiquidityPositionsQueryResult = useUserProMMPositions(usdPrices)
  const userPositions = useMemo(
    () => (!account ? {} : userLiquidityPositionsQueryResult.userLiquidityUsdByPool),
    [account, userLiquidityPositionsQueryResult],
  )

  const tightTokenSelect = !upToMedium && upToLarge

  const onFarmRangeSelected = useCallback(
    (tickLower: number, tickUpper: number) => {
      const tickSpacing = TICK_SPACINGS[feeAmount]
      const usableTickLower =
        tickLower % tickSpacing === 0
          ? tickLower
          : Math.max(TickMath.MIN_TICK, Math.floor(tickLower / tickSpacing) * tickSpacing)

      const usableTickUpper =
        tickUpper % tickSpacing === 0
          ? tickUpper
          : Math.min(TickMath.MAX_TICK, Math.ceil(tickUpper / tickSpacing) * tickSpacing)

      if (baseCurrency && quoteCurrency) {
        const leftPrice = tickToPrice(
          baseCurrency.wrapped,
          quoteCurrency.wrapped,
          isReverseWithFarm ? usableTickUpper : usableTickLower,
        ).toSignificant(18)

        const rightPrice = tickToPrice(
          baseCurrency.wrapped,
          quoteCurrency.wrapped,
          isReverseWithFarm ? usableTickLower : usableTickUpper,
        ).toSignificant(18)

        onLeftRangeInput(leftPrice)
        onRightRangeInput(rightPrice)
      }
    },
    [baseCurrency, quoteCurrency, onLeftRangeInput, onRightRangeInput, feeAmount, isReverseWithFarm],
  )

  useEffect(() => {
    if (isFarmV2Available) {
      setShowFarmRangeSelect(true)
    } else setShowFarmRangeSelect(false)
  }, [isFarmV2Available])

  useEffect(() => {
    if (
      isFarmV2Available &&
      range?.tickUpper &&
      range?.tickUpper &&
      !positionsState[pIndex].leftRangeTypedValue &&
      !positionsState[pIndex].rightRangeTypedValue
    ) {
      onFarmRangeSelected(range.tickLower, range.tickUpper)
    }
  }, [isFarmV2Available, range?.tickUpper, range?.tickLower, onFarmRangeSelected, positionsState, pIndex])

  if (!isEVM) return <Navigate to="/" />

  return (
    <>
      <TransactionConfirmationModal
        isOpen={showConfirm}
        onDismiss={handleDismissConfirmation}
        attemptingTxn={attemptingTxn}
        hash={txHash}
        maxWidth={isMultiplePosition ? 'unset' : undefined}
        width={isMultiplePosition ? 'unset' : undefined}
        content={() => (
          <ConfirmationModalContent
            title={!!noLiquidity ? t`Create a new pool` : t`Add Liquidity`}
            onDismiss={handleDismissConfirmation}
            topContent={modalContent}
            showGridListOption={false}
            bottomContent={() => (
              <Flex flexDirection="column" sx={{ gap: '12px' }}>
                {warnings}
                <Row justify={isMultiplePosition ? 'flex-end' : 'flex-start'}>
                  <ButtonError
                    warning={isWarningButton}
                    id="btnSupply"
                    onClick={onAdd}
                    width={isMultiplePosition ? '160px' : '100%'}
                  >
                    <Text fontWeight={500}>
                      <Trans>Supply</Trans>
                    </Text>
                  </ButtonError>
                </Row>
              </Flex>
            )}
          />
        )}
        pendingText={pendingText}
      />
      <PageWrapper>
        <AddRemoveTabs
          hideShare
          alignTitle="left"
          action={!!noLiquidity ? LiquidityAction.CREATE : LiquidityAction.ADD}
          showTooltip={true}
          onCleared={() => {
            onFieldAInput('0')
            onFieldBInput('0')
            navigate(`/${networkInfo.route}${APP_PATHS.ELASTIC_CREATE_POOL}`)
          }}
          tutorialType={TutorialType.ELASTIC_ADD_LIQUIDITY}
        />
        <Container>
          {ELASTIC_NOT_SUPPORTED[chainId] ? (
            <Flex
              height="500px"
              justifyContent="center"
              alignItems="center"
              flexDirection="column"
              sx={{ gap: '16px' }}
            >
              <Text>{ELASTIC_NOT_SUPPORTED[chainId]}</Text>
              <ButtonLight
                onClick={openNetworkModal}
                width={upToMedium ? '100%' : 'fit-content'}
                minWidth="164px !important"
              >
                <Trans>Change network</Trans>
              </ButtonLight>
            </Flex>
          ) : (
            <>
              <Flex sx={{ gap: '24px' }}>
                <FlexLeft>
                  <RowBetween>
                    <Text fontSize={20}>
                      <Trans>Choose pool</Trans>
                    </Text>
                    <div>
                      <ButtonLight
                        padding="2px 8px"
                        as={ExternalLink}
                        href={`${APP_PATHS.SWAP}/${networkInfo.route}?${
                          currencyIdA ? `inputCurrency=${currencyIdA}` : ''
                        }${currencyIdB ? `&outputCurrency=${currencyIdB}` : ''}`}
                        onClick={() => {
                          if (tokenA?.symbol && tokenB?.symbol)
                            mixpanelHandler(MIXPANEL_TYPE.ELASTIC_ADD_LIQUIDITY_CLICK_SWAP, {
                              token_1: tokenA?.symbol,
                              token_2: tokenB?.symbol,
                            })
                        }}
                      >
                        <Repeat size={16} />
                        <Text marginLeft="4px">
                          <Trans>Swap</Trans>
                        </Text>
                      </ButtonLight>
                    </div>
                  </RowBetween>
                  <RowBetween
                    sx={{ gap: upToXL ? (upToMedium ? '8px' : '4px') : '20px' }}
                    flexDirection={upToXXSmall ? 'column' : 'row'}
                  >
                    <CurrencyInputPanel
                      hideBalance
                      value={formattedAmounts[Field.CURRENCY_A]}
                      onUserInput={onFieldAInput}
                      hideInput={true}
                      onMax={null}
                      onHalf={null}
                      onCurrencySelect={handleCurrencyASelect}
                      currency={currencies_A ?? null}
                      id="add-liquidity-input-tokena"
                      showCommonBases
                      estimatedUsd={formattedNum(estimatedUsdCurrencyA.toString(), true) || undefined}
                      maxCurrencySymbolLength={6}
                      tight={tightTokenSelect}
                    />

                    <ArrowWrapper
                      isVertical={!upToXXSmall}
                      rotated={rotate}
                      onClick={() => {
                        if (!!rightPrice) {
                          onLeftRangeInput(rightPrice?.invert().toString())
                        }
                        if (!!leftPrice) {
                          onRightRangeInput(leftPrice?.invert().toString())
                        }
                        setRotate(prev => !prev)
                      }}
                    >
                      {!currencyIdA && !currencyIdB ? (
                        <SwapIcon size={upToMedium ? 12 : 24} color={theme.subText} />
                      ) : (
                        <StyledInternalLink
                          replace
                          to={`/${networkInfo.route}${APP_PATHS.ELASTIC_CREATE_POOL}/${currencyIdB}/${currencyIdA}/${feeAmount}`}
                          style={{ color: 'inherit', display: 'flex' }}
                        >
                          <SwapIcon size={24} color={theme.subText} />
                        </StyledInternalLink>
                      )}
                    </ArrowWrapper>

                    <CurrencyInputPanel
                      hideBalance
                      value={formattedAmounts[Field.CURRENCY_B]}
                      hideInput={true}
                      onUserInput={onFieldBInput}
                      onCurrencySelect={handleCurrencyBSelect}
                      onMax={null}
                      onHalf={null}
                      positionMax="top"
                      currency={currencies_B ?? null}
                      id="add-liquidity-input-tokenb"
                      showCommonBases
                      estimatedUsd={formattedNum(estimatedUsdCurrencyB.toString(), true) || undefined}
                      maxCurrencySymbolLength={6}
                      tight={tightTokenSelect}
                    />
                  </RowBetween>
                  <DynamicSection disabled={disableFeeSelect} gap="md">
                    <Text fontWeight={500} fontSize="12px">
                      <Trans>Select fee tier</Trans>
                    </Text>
                    <FeeSelector
                      feeAmount={feeAmount}
                      onChange={handleFeePoolSelect}
                      currencyA={currencies_A}
                      currencyB={currencies_B}
                    />
                  </DynamicSection>

                  {noLiquidity ? (
                    <AutoColumn gap="1rem">
                      <AutoColumn gap="12px">
                        <RowBetween>
                          <Text fontWeight="500">
                            <Trans>Set Starting Price</Trans>
                          </Text>
                        </RowBetween>
                        <Flex
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <TYPE.body fontSize={12} textAlign="left" color={theme.subText} lineHeight="16px">
                            <Trans>
                              To initialize this pool, select a starting price for the pool then enter your liquidity
                              price range.
                            </Trans>
                          </TYPE.body>
                        </Flex>
                      </AutoColumn>
                      <AutoColumn gap="12px">
                        <OutlineCard
                          padding="12px 16px"
                          style={{ borderRadius: '999px', backgroundColor: theme.buttonBlack, border: 'none' }}
                        >
                          <StyledInput
                            className="start-price-input"
                            value={startPriceTypedValue}
                            onUserInput={onStartPriceInput}
                          />
                        </OutlineCard>

                        <RowBetween>
                          <Text fontWeight="500" color={theme.subText} fontSize="12px">
                            <Trans>Starting Price</Trans>
                          </Text>
                          <TYPE.main>
                            {price ? (
                              <TYPE.main fontSize="14px">
                                <RowFixed>
                                  <HoverInlineText
                                    maxCharacters={24}
                                    text={`1 ${baseCurrency?.symbol} = ${formatDisplayNumber(
                                      invertPrice ? price.invert() : price,
                                      {
                                        significantDigits: 6,
                                      },
                                    )} ${quoteCurrency?.symbol}`}
                                  />
                                </RowFixed>
                              </TYPE.main>
                            ) : (
                              '-'
                            )}
                          </TYPE.main>
                        </RowBetween>
                        <NewPoolNote
                          loading={loading}
                          onRefreshPrice={() => fetchPrices(tokens.map(t => t?.wrapped.address || ''))}
                          marketPrice={marketPrice}
                          baseCurrency={baseCurrency}
                          quoteCurrency={quoteCurrency}
                        />
                      </AutoColumn>
                    </AutoColumn>
                  ) : (
                    poolStatRef.current && (
                      <>
                        <Flex sx={{ flex: 1, gap: '12px', flexDirection: 'column' }}>
                          <Text fontWeight={500} fontSize="12px">
                            <Trans>Pool Stats</Trans>
                          </Text>
                          <ProAmmPoolStat
                            pool={poolStatRef.current}
                            onShared={openShareModal}
                            userPositions={userPositions}
                            onClickPoolAnalytics={() => {
                              if (tokenA?.symbol && tokenB?.symbol)
                                mixpanelHandler(MIXPANEL_TYPE.ELASTIC_ADD_LIQUIDITY_CLICK_POOL_ANALYTIC, {
                                  token_1: tokenA?.symbol,
                                  token_2: tokenB?.symbol,
                                })
                            }}
                          />
                        </Flex>
                        <ShareModal
                          url={`${window.location.origin}/pools/${networkInfo.route}?search=${poolAddress}&tab=elastic`}
                          title={t`Share this pool with your friends!`}
                        />
                      </>
                    )
                  )}
                  {upToMedium && chart}
                </FlexLeft>
                {!upToMedium && <RightContainer gap="lg">{chart}</RightContainer>}
              </Flex>
              <Row flexDirection="column" sx={{ gap: '16px' }}>
                {warnings && (
                  <Row justify="flex-end">
                    <Flex>{warnings}</Flex>
                  </Row>
                )}
                <Flex maxWidth={chartRef?.current?.clientWidth} alignSelf="flex-end">
                  <DisclaimerERC20 />
                </Flex>

                <Row justify="flex-end">
                  <Buttons />
                </Row>
              </Row>
            </>
          )}
        </Container>
      </PageWrapper>
      <FarmUpdater interval={false} />
      <ElasticFarmV2Updater interval={false} />
    </>
  )
}
