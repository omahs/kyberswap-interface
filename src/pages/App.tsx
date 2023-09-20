import { ChainId } from '@kyberswap/ks-sdk-core'
import { Trans } from '@lingui/macro'
import * as Sentry from '@sentry/react'
import { Suspense, lazy, useEffect } from 'react'
import { isMobile } from 'react-device-detect'
import { AlertTriangle } from 'react-feather'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useNetwork, usePrevious } from 'react-use'
import { Flex, Text } from 'rebass'
import styled from 'styled-components'

import snow from 'assets/images/snow.png'
import Popups from 'components/Announcement/Popups'
import TopBanner from 'components/Announcement/Popups/TopBanner'
import AppHaveUpdate from 'components/AppHaveUpdate'
import ModalConfirm from 'components/ConfirmModal'
import ErrorBoundary from 'components/ErrorBoundary'
import Footer from 'components/Footer/Footer'
import Header from 'components/Header'
import Loader from 'components/LocalLoader'
import Modal from 'components/Modal'
import ProtectedRoute, { ProtectedRouteKyberAI } from 'components/ProtectedRoute'
import Snowfall from 'components/Snowflake/Snowfall'
import Web3ReactManager from 'components/Web3ReactManager'
import { ENV_LEVEL } from 'constants/env'
import { APP_PATHS, BLACKLIST_WALLETS, CHAINS_SUPPORT_CROSS_CHAIN } from 'constants/index'
import { CLASSIC_NOT_SUPPORTED, ELASTIC_NOT_SUPPORTED, NETWORKS_INFO, SUPPORTED_NETWORKS } from 'constants/networks'
import { ENV_TYPE } from 'constants/type'
import { useActiveWeb3React } from 'hooks'
import { useAutoLogin } from 'hooks/useLogin'
import { useGlobalMixpanelEvents } from 'hooks/useMixpanel'
import useSessionExpiredGlobal from 'hooks/useSessionExpire'
import useTheme from 'hooks/useTheme'
import { useSyncNetworkParamWithStore } from 'hooks/web3/useSyncNetworkParamWithStore'
import { RedirectPathToSwapV3Network } from 'pages/SwapV3/redirects'
import KyberAIExplore from 'pages/TrueSightV2'
import TruesightFooter from 'pages/TrueSightV2/components/TruesightFooter'
import KyberAILandingPage from 'pages/TrueSightV2/pages/LandingPage'
import { useHolidayMode } from 'state/user/hooks'
import DarkModeQueryParamReader from 'theme/DarkModeQueryParamReader'
import { isAddressString, isSupportLimitOrder, shortenAddress } from 'utils'

import ElasticLegacyNotice from './ElasticLegacy/ElasticLegacyNotice'
import VerifyAuth from './Verify/VerifyAuth'

// test page for swap only through elastic
const ElasticSwap = lazy(() => import('./ElasticSwap'))
const SwapV2 = lazy(() => import('./SwapV2'))
const SwapV3 = lazy(() => import('./SwapV3'))
// const Bridge = lazy(() => import('./Bridge'))
const Pools = lazy(() => import('./Pools'))
const MyPools = lazy(() => import('./Pool'))
const MyEarnings = lazy(() => import('./MyEarnings'))

const Farm = lazy(() => import('./Farm'))

const PoolFinder = lazy(() => import('./PoolFinder'))
const ElasticRemoveLiquidity = lazy(() => import('pages/RemoveLiquidityProAmm'))
const RedirectCreatePool = lazy(() => import('pages/CreatePool/RedirectCreatePool'))

const RedirectElasticCreatePool = lazy(() => import('pages/AddLiquidityV2/RedirectElasticCreatePool'))

const AddLiquidity = lazy(() => import('pages/AddLiquidity'))
const ElasticIncreaseLiquidity = lazy(() => import('pages/IncreaseLiquidity'))

const RemoveLiquidity = lazy(() => import('pages/RemoveLiquidity'))

const KyberDAOStakeKNC = lazy(() => import('pages/KyberDAO/StakeKNC'))
const KyberDAOVote = lazy(() => import('pages/KyberDAO/Vote'))
const KNCUtility = lazy(() => import('pages/KyberDAO/KNCUtility'))
const AboutKyberSwap = lazy(() => import('pages//About/AboutKyberSwap'))
const AboutKNC = lazy(() => import('pages/About/AboutKNC'))
const BuyCrypto = lazy(() => import('pages/BuyCrypto'))

const Campaign = lazy(() => import('pages/Campaign'))
const GrantProgramPage = lazy(() => import('pages/GrantProgram'))
const NotificationCenter = lazy(() => import('pages/NotificationCenter'))
const Icons = lazy(() => import('./Icons'))

const AppWrapper = styled.div`
  display: flex;
  flex-flow: column;
  align-items: flex-start;
`

const HeaderWrapper = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  width: 100%;
  justify-content: space-between;
  z-index: 3;
`

const BodyWrapper = styled.div`
  display: flex;
  position: relative;
  flex-direction: column;
  width: 100%;
  align-items: center;
  min-height: calc(100vh - 148px);
  flex: 1;
  z-index: 1;
`

const preloadImages = () => {
  const imageList: string[] = SUPPORTED_NETWORKS.map(chainId => [
    NETWORKS_INFO[chainId].icon,
    NETWORKS_INFO[chainId].iconDark,
  ])
    .flat()
    .filter(Boolean) as string[]

  imageList.forEach(image => {
    if (image) {
      new Image().src = image
    }
  })
}

const SwapPage = () => {
  const { chainId } = useActiveWeb3React()
  useSyncNetworkParamWithStore()
  return chainId === ChainId.SOLANA ? <SwapV2 /> : <SwapV3 />
}

const RedirectWithNetworkPrefix = () => {
  const { networkInfo } = useActiveWeb3React()
  const location = useLocation()

  return (
    <Navigate
      to={{
        ...location,
        pathname: `/${networkInfo.route}${location.pathname}`,
      }}
      replace
    />
  )
}

const RedirectWithNetworkSuffix = () => {
  const { networkInfo } = useActiveWeb3React()
  const location = useLocation()

  return (
    <Navigate
      to={{
        ...location,
        pathname: `${location.pathname}/${networkInfo.route}`,
      }}
      replace
    />
  )
}

const RoutesWithNetworkPrefix = () => {
  const { network } = useParams()
  const { networkInfo, chainId } = useActiveWeb3React()
  const location = useLocation()

  useSyncNetworkParamWithStore()

  if (!network) {
    return <Navigate to={`/${networkInfo.route}${location.pathname}`} replace />
  }

  if (network === NETWORKS_INFO[ChainId.SOLANA].route) {
    return <Navigate to="/" />
  }

  const chainInfoFromParam = SUPPORTED_NETWORKS.find(chain => NETWORKS_INFO[chain].route === network)
  if (!chainInfoFromParam) {
    return <Navigate to={'/'} replace />
  }

  return (
    <Routes>
      {!CLASSIC_NOT_SUPPORTED[chainId] && (
        <>
          <Route
            path={`${APP_PATHS.CLASSIC_CREATE_POOL}/:currencyIdA?/:currencyIdB?`}
            element={<RedirectCreatePool />}
          />
          <Route
            path={`${APP_PATHS.CLASSIC_ADD_LIQ}/:currencyIdA/:currencyIdB?/:pairAddress?`}
            element={<AddLiquidity />}
          />
          <Route
            path={`${APP_PATHS.CLASSIC_REMOVE_POOL}/:currencyIdA/:currencyIdB/:pairAddress`}
            element={<RemoveLiquidity />}
          />
        </>
      )}

      {!ELASTIC_NOT_SUPPORTED[chainId] && (
        <>
          <Route
            path={`${APP_PATHS.ELASTIC_CREATE_POOL}/:currencyIdA?/:currencyIdB?/:feeAmount?`}
            element={<RedirectElasticCreatePool />}
          />
          <Route
            path={`${APP_PATHS.ELASTIC_INCREASE_LIQ}/:currencyIdA?/:currencyIdB?/:feeAmount?/:tokenId?`}
            element={<ElasticIncreaseLiquidity />}
          />
          <Route path={`${APP_PATHS.ELASTIC_REMOVE_POOL}/:tokenId`} element={<ElasticRemoveLiquidity />} />
        </>
      )}

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  const { account, chainId, networkInfo } = useActiveWeb3React()
  const { pathname } = useLocation()
  useAutoLogin()
  const { online } = useNetwork()
  const prevOnline = usePrevious(online)
  useSessionExpiredGlobal()

  useEffect(() => {
    if (prevOnline === false && online && account) {
      // refresh page when network back to normal to prevent some issues: ex: stale data, ...
      window.location.reload()
    }
  }, [online, prevOnline, account])

  useEffect(() => {
    preloadImages()
  }, [])

  useEffect(() => {
    if (account) {
      Sentry.setUser({ id: account })
    }
  }, [account])

  useEffect(() => {
    if (chainId) {
      Sentry.setTags({
        chainId: chainId,
        network: networkInfo.name,
      })
    }
  }, [chainId, networkInfo.name])

  const theme = useTheme()

  useGlobalMixpanelEvents()
  const showFooter = !pathname.includes(APP_PATHS.ABOUT)
  const [holidayMode] = useHolidayMode()

  const snowflake = new Image()
  snowflake.src = snow

  return (
    <ErrorBoundary>
      <AppHaveUpdate />
      {(BLACKLIST_WALLETS.includes(isAddressString(chainId, account)) ||
        BLACKLIST_WALLETS.includes(account?.toLowerCase() || '')) && (
        <Modal
          isOpen
          onDismiss={function (): void {
            //
          }}
          maxWidth="600px"
          width="80vw"
        >
          <Flex flexDirection="column" padding="24px" width="100%">
            <Flex alignItems="center">
              <AlertTriangle color={theme.red} />
              <Text fontWeight="500" fontSize={24} color={theme.red} marginLeft="8px">
                <Trans>Warning</Trans>
              </Text>
            </Flex>
            <Text marginTop="24px" fontSize="14px" lineHeight={2}>
              The US Treasury&apos;s OFAC has published a list of addresses associated with Tornado Cash. Your wallet
              address below is flagged as one of the addresses on this list, provided by our compliance vendor. As a
              result, it is blocked from using KyberSwap and all of its related services at this juncture.
            </Text>
            <Flex
              marginTop="24px"
              padding="12px"
              backgroundColor={theme.buttonBlack}
              sx={{ borderRadius: '12px' }}
              flexDirection="column"
            >
              <Text>Your wallet address</Text>
              <Text color={theme.subText} fontSize={20} marginTop="12px" fontWeight="500">
                {isMobile ? shortenAddress(chainId, account || '', 10) : account}
              </Text>
            </Flex>
          </Flex>
        </Modal>
      )}

      {(!account || !BLACKLIST_WALLETS.includes(account)) && (
        <>
          <AppWrapper>
            <ElasticLegacyNotice />
            <TopBanner />
            <HeaderWrapper>
              <Header />
            </HeaderWrapper>
            <Suspense fallback={<Loader />}>
              {holidayMode && (
                <Snowfall
                  speed={[0.5, 1]}
                  wind={[-0.5, 0.25]}
                  snowflakeCount={isMobile ? 13 : 31}
                  images={[snowflake]}
                  radius={[5, 15]}
                />
              )}

              <BodyWrapper>
                <Popups />
                <Web3ReactManager>
                  <Routes>
                    <Route element={<DarkModeQueryParamReader />} />

                    {/* From react-router-dom@6.5.0, :fromCurrency-to-:toCurrency no long works, need to manually parse the params */}
                    <Route path={`${APP_PATHS.SWAP}/:network/:currency?`} element={<SwapPage />} />
                    {CHAINS_SUPPORT_CROSS_CHAIN.includes(chainId) && (
                      <Route path={`${APP_PATHS.CROSS_CHAIN}`} element={<SwapV3 />} />
                    )}

                    {isSupportLimitOrder(chainId) && (
                      <Route path={`${APP_PATHS.LIMIT}/:network/:currency?`} element={<SwapPage />} />
                    )}

                    <Route path={`${APP_PATHS.FIND_POOL}`} element={<PoolFinder />} />

                    <Route path={`${APP_PATHS.MY_EARNINGS}`} element={<MyEarnings />} />

                    <>
                      {/* Pools Routes  */}
                      <Route path={`${APP_PATHS.POOLS}`} element={<RedirectWithNetworkSuffix />} />
                      <Route path={`${APP_PATHS.POOLS}/:network/:currencyIdA?/:currencyIdB?`} element={<Pools />} />
                    </>

                    <>
                      {/* Farms Routes */}
                      <Route path={`${APP_PATHS.FARMS}`} element={<RedirectWithNetworkSuffix />} />
                      <Route path={`${APP_PATHS.FARMS}/:network`} element={<Farm />} />
                    </>

                    <>
                      {/* My Pools Routes */}
                      <Route path={`${APP_PATHS.MY_POOLS}`} element={<RedirectWithNetworkSuffix />} />
                      <Route path={`${APP_PATHS.MY_POOLS}/:network`} element={<MyPools />} />
                    </>

                    <>
                      {/* These are old routes and will soon be deprecated - Check: RoutesWithNetworkParam */}
                      <Route path={`${APP_PATHS.ELASTIC_CREATE_POOL}/*`} element={<RedirectWithNetworkPrefix />} />
                      <Route path={`${APP_PATHS.ELASTIC_INCREASE_LIQ}/*`} element={<RedirectWithNetworkPrefix />} />
                      <Route path={`${APP_PATHS.ELASTIC_REMOVE_POOL}/*`} element={<RedirectWithNetworkPrefix />} />

                      <Route path={`${APP_PATHS.CLASSIC_CREATE_POOL}/*`} element={<RedirectWithNetworkPrefix />} />
                      <Route path={`${APP_PATHS.CLASSIC_ADD_LIQ}/*`} element={<RedirectWithNetworkPrefix />} />
                      <Route path={`${APP_PATHS.CLASSIC_REMOVE_POOL}/*`} element={<RedirectWithNetworkPrefix />} />
                    </>

                    <Route path={`${APP_PATHS.KYBERDAO_STAKE}`} element={<KyberDAOStakeKNC />} />
                    <Route path={`${APP_PATHS.KYBERDAO_VOTE}`} element={<KyberDAOVote />} />
                    <Route path={`${APP_PATHS.KYBERDAO_KNC_UTILITY}`} element={<KNCUtility />} />
                    <Route path={`${APP_PATHS.ABOUT}/kyberswap`} element={<AboutKyberSwap />} />
                    <Route path={`${APP_PATHS.ABOUT}/knc`} element={<AboutKNC />} />
                    <Route path={`${APP_PATHS.KYBERAI}`} element={<Navigate to={APP_PATHS.KYBERAI_ABOUT} replace />} />
                    <Route path={`${APP_PATHS.KYBERAI}`} element={<Navigate to={APP_PATHS.KYBERAI_ABOUT} replace />} />
                    <Route
                      path={`${APP_PATHS.KYBERAI_ABOUT}`}
                      element={
                        <ProtectedRouteKyberAI waitUtilAuthenEndOnly>
                          <KyberAILandingPage />
                        </ProtectedRouteKyberAI>
                      }
                    />
                    <Route
                      path={`${APP_PATHS.KYBERAI_RANKINGS}`}
                      element={
                        <ProtectedRouteKyberAI redirectUrl={APP_PATHS.KYBERAI_ABOUT}>
                          <KyberAIExplore />
                        </ProtectedRouteKyberAI>
                      }
                    />
                    <Route
                      path={`${APP_PATHS.KYBERAI_EXPLORE}`}
                      element={
                        <ProtectedRouteKyberAI redirectUrl={APP_PATHS.KYBERAI_ABOUT}>
                          <KyberAIExplore />
                        </ProtectedRouteKyberAI>
                      }
                    />
                    <Route
                      path={`${APP_PATHS.KYBERAI_EXPLORE}/:chain/:address`}
                      element={
                        <ProtectedRouteKyberAI redirectUrl={APP_PATHS.KYBERAI_ABOUT}>
                          <KyberAIExplore />
                        </ProtectedRouteKyberAI>
                      }
                    />
                    <Route path={`${APP_PATHS.BUY_CRYPTO}`} element={<BuyCrypto />} />
                    <Route path={`${APP_PATHS.CAMPAIGN}`} element={<Campaign />} />
                    <Route path={`${APP_PATHS.CAMPAIGN}/:slug`} element={<Campaign />} />
                    {/* <Route path={`${APP_PATHS.BRIDGE}`} element={<Bridge />} /> */}
                    <Route
                      path={`${APP_PATHS.PROFILE_MANAGE}`}
                      element={
                        <ProtectedRoute>
                          <NotificationCenter />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path={`${APP_PATHS.PROFILE_MANAGE}/*`}
                      element={
                        <ProtectedRoute>
                          <NotificationCenter />
                        </ProtectedRoute>
                      }
                    />
                    <Route path={`${APP_PATHS.GRANT_PROGRAMS}`} element={<GrantProgramPage />} />
                    <Route path={`${APP_PATHS.GRANT_PROGRAMS}/:slug`} element={<GrantProgramPage />} />
                    {ENV_LEVEL === ENV_TYPE.LOCAL && <Route path="/icons" element={<Icons />} />}

                    <Route path={`elastic-swap`} element={<ElasticSwap />} />

                    <Route path={`/:network/*`} element={<RoutesWithNetworkPrefix />} />

                    <Route path={APP_PATHS.VERIFY_AUTH} element={<VerifyAuth />} />

                    <Route path="*" element={<RedirectPathToSwapV3Network />} />
                  </Routes>
                </Web3ReactManager>
              </BodyWrapper>
              {showFooter && <Footer />}

              <TruesightFooter />
            </Suspense>
            <ModalConfirm />
          </AppWrapper>
        </>
      )}
    </ErrorBoundary>
  )
}
