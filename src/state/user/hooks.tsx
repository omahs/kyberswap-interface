import { ChainId, Token } from '@kyberswap/ks-sdk-core'
import { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useGetParticipantInfoQuery } from 'services/kyberAISubscription'

import { SUGGESTED_BASES } from 'constants/bases'
import { TERM_FILES_PATH } from 'constants/index'
import { SupportedLocale } from 'constants/locales'
import { PINNED_PAIRS } from 'constants/tokens'
import { useActiveWeb3React } from 'hooks'
import { useAllTokens } from 'hooks/Tokens'
import {
  useDynamicFeeFactoryContract,
  useOldStaticFeeFactoryContract,
  useStaticFeeFactoryContract,
} from 'hooks/useContract'
import useDebounce from 'hooks/useDebounce'
import { ParticipantInfo, ParticipantStatus } from 'pages/TrueSightV2/types'
import { AppDispatch, AppState } from 'state'
import { useKyberSwapConfig } from 'state/application/hooks'
import { useIsConnectingWallet, useSessionInfo } from 'state/authen/hooks'
import { useAppDispatch, useAppSelector } from 'state/hooks'
import { WrappedTokenInfo } from 'state/lists/wrappedTokenInfo'
import { useSingleContractMultipleData } from 'state/multicall/hooks'
import { useUserLiquidityPositions } from 'state/pools/hooks'
import { useCheckStablePairSwap } from 'state/swap/hooks'
import {
  SerializedToken,
  ToggleFavoriteTokenPayload,
  addSerializedPair,
  addSerializedToken,
  changeViewMode,
  pinSlippageControl,
  removeSerializedToken,
  setCrossChainSetting,
  toggleFavoriteToken as toggleFavoriteTokenAction,
  toggleHolidayMode,
  toggleKyberAIBanner,
  toggleKyberAIWidget,
  toggleLiveChart,
  toggleMyEarningChart,
  toggleTopTrendingTokens,
  toggleTradeRoutes,
  updateAcceptedTermVersion,
  updateTokenAnalysisSettings,
  updateUserDarkMode,
  updateUserDeadline,
  updateUserDegenMode,
  updateUserLocale,
  updateUserSlippageTolerance,
} from 'state/user/actions'
import { CROSS_CHAIN_SETTING_DEFAULT, CrossChainSetting, VIEW_MODE } from 'state/user/reducer'
import { isAddress, isChristmasTime } from 'utils'

const MAX_FAVORITE_LIMIT = 12

function serializeToken(token: Token | WrappedTokenInfo): SerializedToken {
  return {
    chainId: token.chainId,
    address: token.address,
    decimals: token.decimals,
    symbol: token.symbol,
    name: token.name,
    logoURI: token instanceof WrappedTokenInfo ? token.logoURI : undefined,
  }
}

function deserializeToken(serializedToken: SerializedToken): Token {
  return serializedToken?.logoURI
    ? new WrappedTokenInfo({
        chainId: serializedToken.chainId,
        address: serializedToken.address,
        name: serializedToken.name ?? '',
        symbol: serializedToken.symbol ?? '',
        decimals: serializedToken.decimals,
        logoURI: serializedToken.logoURI,
      })
    : new Token(
        serializedToken.chainId,
        serializedToken.address,
        serializedToken.decimals,
        serializedToken.symbol,
        serializedToken.name,
      )
}

export function useIsDarkMode(): boolean {
  const userDarkMode = useSelector<AppState, boolean | null>(state => state.user.userDarkMode)
  const matchesDarkMode = useSelector<AppState, boolean>(state => state.user.matchesDarkMode)

  return typeof userDarkMode !== 'boolean' ? matchesDarkMode : userDarkMode
}

export function useDarkModeManager(): [boolean, () => void] {
  const dispatch = useDispatch<AppDispatch>()
  const darkMode = useIsDarkMode()

  const toggleSetDarkMode = useCallback(() => {
    dispatch(updateUserDarkMode({ userDarkMode: !darkMode }))
  }, [darkMode, dispatch])

  return [darkMode, toggleSetDarkMode]
}

export function useUserLocale(): SupportedLocale | null {
  return useAppSelector(state => state.user.userLocale)
}

export function useUserLocaleManager(): [SupportedLocale | null, (newLocale: SupportedLocale) => void] {
  const dispatch = useAppDispatch()
  const locale = useUserLocale()

  const setLocale = useCallback(
    (newLocale: SupportedLocale) => {
      dispatch(updateUserLocale({ userLocale: newLocale }))
    },
    [dispatch],
  )

  return [locale, setLocale]
}

// unused for now, but may be added again in the future. So we should keep it here.
export function useIsAcceptedTerm(): [boolean, (isAcceptedTerm: boolean) => void] {
  const dispatch = useAppDispatch()
  const acceptedTermVersion = useSelector<AppState, AppState['user']['acceptedTermVersion']>(
    state => state.user.acceptedTermVersion,
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isAcceptedTerm = !!acceptedTermVersion && acceptedTermVersion === TERM_FILES_PATH.VERSION

  const setIsAcceptedTerm = useCallback(
    (isAcceptedTerm: boolean) => {
      dispatch(updateAcceptedTermVersion(isAcceptedTerm ? TERM_FILES_PATH.VERSION : null))
    },
    [dispatch],
  )

  // return [isAcceptedTerm, setIsAcceptedTerm]
  return [true, setIsAcceptedTerm]
}

export function useDegenModeManager(): [boolean, () => void] {
  const dispatch = useDispatch<AppDispatch>()
  const degenMode = useSelector<AppState, AppState['user']['userDegenMode']>(state => state.user.userDegenMode)
  const isStablePairSwap = useCheckStablePairSwap()

  const toggleSetDegenMode = useCallback(() => {
    dispatch(updateUserDegenMode({ userDegenMode: !degenMode, isStablePairSwap }))
  }, [degenMode, dispatch, isStablePairSwap])

  return [degenMode, toggleSetDegenMode]
}

export function useUserSlippageTolerance(): [number, (slippage: number) => void] {
  const dispatch = useDispatch<AppDispatch>()
  const userSlippageTolerance = useSelector<AppState, AppState['user']['userSlippageTolerance']>(state => {
    return state.user.userSlippageTolerance
  })

  const setUserSlippageTolerance = useCallback(
    (userSlippageTolerance: number) => {
      dispatch(updateUserSlippageTolerance({ userSlippageTolerance }))
    },
    [dispatch],
  )

  return [userSlippageTolerance, setUserSlippageTolerance]
}

export function useUserTransactionTTL(): [number, (slippage: number) => void] {
  const dispatch = useDispatch<AppDispatch>()
  const userDeadline = useSelector<AppState, AppState['user']['userDeadline']>(state => {
    return state.user.userDeadline
  })

  const setUserDeadline = useCallback(
    (userDeadline: number) => {
      dispatch(updateUserDeadline({ userDeadline }))
    },
    [dispatch],
  )

  return [userDeadline, setUserDeadline]
}

export function useAddUserToken(): (token: Token) => void {
  const dispatch = useDispatch<AppDispatch>()
  return useCallback(
    (token: Token) => {
      dispatch(addSerializedToken({ serializedToken: serializeToken(token) }))
    },
    [dispatch],
  )
}

export function useRemoveUserAddedToken(): (chainId: number, address: string) => void {
  const dispatch = useDispatch<AppDispatch>()
  return useCallback(
    (chainId: number, address: string) => {
      dispatch(removeSerializedToken({ chainId, address }))
    },
    [dispatch],
  )
}

export function useUserAddedTokens(customChain?: ChainId): Token[] {
  const { chainId: currentChain } = useActiveWeb3React()
  const serializedTokensMap = useSelector<AppState, AppState['user']['tokens']>(({ user: { tokens } }) => tokens)
  const chainId = customChain || currentChain
  return useMemo(() => {
    if (!chainId) return []
    return Object.values(serializedTokensMap[chainId] ?? {})
      .map(deserializeToken)
      .filter(e => !(!e.symbol && !e.decimals && !e.name))
  }, [serializedTokensMap, chainId])
}

export function usePairAdderByTokens(): (token0: Token, token1: Token) => void {
  const dispatch = useDispatch<AppDispatch>()

  return useCallback(
    (token0: Token, token1: Token) => {
      dispatch(
        addSerializedPair({
          serializedPair: {
            token0: serializeToken(token0),
            token1: serializeToken(token1),
          },
        }),
      )
    },
    [dispatch],
  )
}

export function useToV2LiquidityTokens(
  tokenCouples: [Token, Token][],
): { liquidityTokens: []; tokens: [Token, Token] }[] {
  const oldStaticContract = useOldStaticFeeFactoryContract()
  const staticContract = useStaticFeeFactoryContract()
  const dynamicContract = useDynamicFeeFactoryContract()

  const addresses = useMemo(
    () => tokenCouples.map(([tokenA, tokenB]) => [tokenA.address, tokenB.address]),
    [tokenCouples],
  )

  const result1 = useSingleContractMultipleData(staticContract, 'getPools', addresses)
  const result2 = useSingleContractMultipleData(dynamicContract, 'getPools', addresses)
  const result3 = useSingleContractMultipleData(oldStaticContract, 'getPools', addresses)
  const result = useMemo(
    () =>
      result1?.map((call, index) => {
        return {
          ...call,
          result: [
            call.result?.[0].concat(result2?.[index]?.result?.[0] || []).concat(result3?.[index]?.result?.[0] || []),
          ],
        }
      }),
    [result1, result2, result3],
  )
  return useMemo(
    () =>
      result.map((result, index) => {
        return {
          tokens: tokenCouples[index],
          liquidityTokens: result?.result?.[0]
            ? result.result[0].map(
                (address: string) => new Token(tokenCouples[index][0].chainId, address, 18, 'DMM-LP', 'DMM LP'),
              )
            : [],
        }
      }),
    [tokenCouples, result],
  )
}

export function useLiquidityPositionTokenPairs(): [Token, Token][] {
  const { chainId } = useActiveWeb3React()
  const allTokens = useAllTokens()

  // pinned pairs
  const pinnedPairs = useMemo(() => (chainId ? PINNED_PAIRS[chainId] ?? [] : []), [chainId])

  const { data: userLiquidityPositions } = useUserLiquidityPositions()

  // get pairs that has liquidity
  const generatedPairs: [Token, Token][] = useMemo(() => {
    if (userLiquidityPositions?.liquidityPositions) {
      const result: [Token, Token][] = []

      userLiquidityPositions?.liquidityPositions.forEach(position => {
        const token0Address = isAddress(chainId, position.pool.token0.id)
        const token1Address = isAddress(chainId, position.pool.token1.id)

        if (token0Address && token1Address && allTokens[token0Address] && allTokens[token1Address]) {
          result.push([allTokens[token0Address], allTokens[token1Address]])
        }
      })

      return result
    }

    return []
  }, [chainId, allTokens, userLiquidityPositions])

  // pairs saved by users
  const savedSerializedPairs = useSelector<AppState, AppState['user']['pairs']>(({ user: { pairs } }) => pairs)

  const userPairs: [Token, Token][] = useMemo(() => {
    if (!savedSerializedPairs) return []
    const forChain = savedSerializedPairs[chainId]
    if (!forChain) return []

    return Object.keys(forChain).map(pairId => {
      return [deserializeToken(forChain[pairId].token0), deserializeToken(forChain[pairId].token1)]
    })
  }, [savedSerializedPairs, chainId])

  const combinedList = useMemo(
    () => userPairs.concat(generatedPairs).concat(pinnedPairs),
    [generatedPairs, pinnedPairs, userPairs],
  )

  return useMemo(() => {
    // dedupes pairs of tokens in the combined list
    const keyed = combinedList.reduce<{ [key: string]: [Token, Token] }>((memo, [tokenA, tokenB]) => {
      const sorted = tokenA.sortsBefore(tokenB)
      const key = sorted ? `${tokenA.address}:${tokenB.address}` : `${tokenB.address}:${tokenA.address}`
      if (memo[key]) return memo
      memo[key] = sorted ? [tokenA, tokenB] : [tokenB, tokenA]
      return memo
    }, {})

    return Object.keys(keyed).map(key => keyed[key])
  }, [combinedList])
}

export function useShowLiveChart(): boolean {
  const showLiveChart = useSelector((state: AppState) => state.user.showLiveChart)
  return typeof showLiveChart !== 'boolean' || showLiveChart
}

export function useShowTradeRoutes(): boolean {
  const showTradeRoutes = useSelector((state: AppState) => state.user.showTradeRoutes)
  return showTradeRoutes
}

export function useShowKyberAIBanner(): boolean {
  return useSelector((state: AppState) => state.user.showKyberAIBanner) ?? true
}

export function useTokenAnalysisSettings(): { [k: string]: boolean } {
  return useSelector((state: AppState) => state.user.kyberAIDisplaySettings) ?? null
}

export function useUpdateTokenAnalysisSettings(): (payload: string) => void {
  const dispatch = useDispatch<AppDispatch>()
  return useCallback((payload: string) => dispatch(updateTokenAnalysisSettings(payload)), [dispatch])
}

export function useToggleLiveChart(): () => void {
  const dispatch = useDispatch<AppDispatch>()
  return useCallback(() => dispatch(toggleLiveChart()), [dispatch])
}

export function useToggleTradeRoutes(): () => void {
  const dispatch = useDispatch<AppDispatch>()
  return useCallback(() => dispatch(toggleTradeRoutes()), [dispatch])
}

export function useToggleKyberAIBanner(): () => void {
  const dispatch = useDispatch<AppDispatch>()
  return useCallback(() => dispatch(toggleKyberAIBanner()), [dispatch])
}

export function useToggleTopTrendingTokens(): () => void {
  const dispatch = useDispatch<AppDispatch>()
  return useCallback(() => dispatch(toggleTopTrendingTokens()), [dispatch])
}

export const useUserFavoriteTokens = (chainId: ChainId) => {
  const dispatch = useDispatch<AppDispatch>()
  const { favoriteTokensByChainIdv2: favoriteTokensByChainId } = useSelector((state: AppState) => state.user)
  const { commonTokens } = useKyberSwapConfig(chainId)
  const defaultTokens = useMemo(() => {
    return commonTokens || SUGGESTED_BASES[chainId || ChainId.MAINNET].map(e => e.address)
  }, [commonTokens, chainId])

  const favoriteTokens = useMemo(() => {
    if (!chainId) return undefined
    const favoritedTokens = favoriteTokensByChainId?.[chainId] || {}
    const favoritedTokenAddresses = defaultTokens
      .filter(address => favoritedTokens[address.toLowerCase()] !== false)
      .concat(Object.keys(favoritedTokens).filter(address => favoritedTokens[address]))

    return [...new Set(favoritedTokenAddresses.map(a => a.toLowerCase()))]
  }, [chainId, favoriteTokensByChainId, defaultTokens])

  const toggleFavoriteToken = useCallback(
    (payload: ToggleFavoriteTokenPayload) => {
      if (!favoriteTokens) return
      const address = payload.address.toLowerCase()
      // Is adding favorite and reached max limit
      if (favoriteTokens.indexOf(address) < 0 && favoriteTokens.length >= MAX_FAVORITE_LIMIT) {
        return
      }
      const newValue = favoriteTokens.indexOf(address) < 0

      dispatch(toggleFavoriteTokenAction({ ...payload, newValue }))
    },
    [dispatch, favoriteTokens],
  )

  return { favoriteTokens, toggleFavoriteToken }
}

export const useViewMode: () => [VIEW_MODE, (mode: VIEW_MODE) => void] = () => {
  const dispatch = useAppDispatch()
  const viewMode = useAppSelector(state => state.user.viewMode || VIEW_MODE.GRID)

  const setViewMode = useCallback((mode: VIEW_MODE) => dispatch(changeViewMode(mode)), [dispatch])

  return [viewMode, setViewMode]
}

export const useHolidayMode: () => [boolean, () => void] = () => {
  const dispatch = useAppDispatch()
  const holidayMode = useAppSelector(state => (state.user.holidayMode === undefined ? true : state.user.holidayMode))

  const toggle = useCallback(() => {
    dispatch(toggleHolidayMode())
  }, [dispatch])

  return [isChristmasTime() ? holidayMode : false, toggle]
}

export const useCrossChainSetting = () => {
  const dispatch = useAppDispatch()
  const setting = useAppSelector(state => state.user.crossChain) || CROSS_CHAIN_SETTING_DEFAULT
  const setSetting = useCallback(
    (data: CrossChainSetting) => {
      dispatch(setCrossChainSetting(data))
    },
    [dispatch],
  )
  const setExpressExecutionMode = useCallback(
    (enableExpressExecution: boolean) => {
      setSetting({ ...setting, enableExpressExecution })
    },
    [setSetting, setting],
  )

  const setRawSlippage = useCallback(
    (slippageTolerance: number) => {
      setSetting({ ...setting, slippageTolerance })
    },
    [setSetting, setting],
  )

  const toggleSlippageControlPinned = useCallback(() => {
    setSetting({ ...setting, isSlippageControlPinned: !setting.isSlippageControlPinned })
  }, [setSetting, setting])

  return { setting, setExpressExecutionMode, setRawSlippage, toggleSlippageControlPinned }
}

export const useSlippageSettingByPage = (isCrossChain = false) => {
  const dispatch = useDispatch()
  const isPinSlippageSwap = useAppSelector(state => state.user.isSlippageControlPinned)
  const [rawSlippageSwap, setRawSlippageSwap] = useUserSlippageTolerance()
  const togglePinSlippageSwap = () => {
    dispatch(pinSlippageControl(!isSlippageControlPinned))
  }

  const {
    setting: { slippageTolerance: rawSlippageSwapCrossChain, isSlippageControlPinned: isPinSlippageCrossChain },
    setRawSlippage: setRawSlippageCrossChain,
    toggleSlippageControlPinned: togglePinnedSlippageCrossChain,
  } = useCrossChainSetting()

  const isSlippageControlPinned = isCrossChain ? isPinSlippageCrossChain : isPinSlippageSwap
  const rawSlippage = isCrossChain ? rawSlippageSwapCrossChain : rawSlippageSwap
  const setRawSlippage = isCrossChain ? setRawSlippageCrossChain : setRawSlippageSwap
  const togglePinSlippage = isCrossChain ? togglePinnedSlippageCrossChain : togglePinSlippageSwap

  return { setRawSlippage, rawSlippage, isSlippageControlPinned, togglePinSlippage }
}

const participantDefault = {
  rankNo: 0,
  status: ParticipantStatus.UNKNOWN,
  referralCode: '',
  id: 0,
  updatedAt: 0,
  createdAt: 0,
}
export const useGetParticipantKyberAIInfo = (): ParticipantInfo => {
  const { userInfo } = useSessionInfo()
  const { data: data = participantDefault, isError } = useGetParticipantInfoQuery(undefined, {
    skip: !userInfo,
  })
  return isError ? participantDefault : data
}

export const useIsWhiteListKyberAI = () => {
  const { isLogin, pendingAuthentication, userInfo } = useSessionInfo()
  const {
    data: rawData,
    isFetching,
    isError,
    refetch,
  } = useGetParticipantInfoQuery(undefined, {
    skip: !userInfo,
  })

  const { account } = useActiveWeb3React()
  const [connectingWallet] = useIsConnectingWallet()

  const isLoading = isFetching || pendingAuthentication
  const loadingDebounced = useDebounce(isLoading, 500) || connectingWallet

  const participantInfo = isError || loadingDebounced || !account ? participantDefault : rawData
  return {
    loading: loadingDebounced,
    isWhiteList:
      isLogin && (participantInfo?.status === ParticipantStatus.WHITELISTED || userInfo?.data?.hasAccessToKyberAI),
    isWaitList: isLogin && participantInfo?.status === ParticipantStatus.WAITLISTED,
    refetch,
  }
}

export const useKyberAIWidget: () => [boolean, () => void] = () => {
  const dispatch = useAppDispatch()
  const kyberAIWidget = useAppSelector(state =>
    state.user.kyberAIWidget === undefined ? true : state.user.kyberAIWidget,
  )

  const { isWhiteList } = useIsWhiteListKyberAI()

  const toggle = useCallback(() => {
    dispatch(toggleKyberAIWidget())
  }, [dispatch])

  return [kyberAIWidget && !!isWhiteList, toggle]
}

export const usePermitData: (
  address?: string,
) => { rawSignature?: string; deadline?: number; value?: string; errorCount?: number } | null = address => {
  const { chainId, account } = useActiveWeb3React()
  const permitData = useAppSelector(state => state.user.permitData)

  return address && account && permitData ? permitData[account]?.[chainId]?.[address] : null
}

export const useShowMyEarningChart: () => [boolean, () => void] = () => {
  const dispatch = useAppDispatch()

  const isShowMyEarningChart = useAppSelector(state =>
    state.user.myEarningChart === undefined ? true : state.user.myEarningChart,
  )
  const toggle = useCallback(() => {
    dispatch(toggleMyEarningChart())
  }, [dispatch])
  return [isShowMyEarningChart, toggle]
}
