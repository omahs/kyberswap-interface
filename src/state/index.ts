import { configureStore } from '@reduxjs/toolkit'
import { load, save } from 'redux-localstorage-simple'
import announcementApi, { publicAnnouncementApi } from 'services/announcement'
import blockServiceApi from 'services/blockService'
import campaignApi from 'services/campaign'
import coingeckoApi from 'services/coingecko'
import crosschainApi from 'services/crossChain'
import earningApi from 'services/earning'
import geckoTerminalApi from 'services/geckoTermial'
import identifyApi from 'services/identity'
import knProtocolApi from 'services/knprotocol'
import ksSettingApi from 'services/ksSetting'
import kyberAISubscriptionApi from 'services/kyberAISubscription'
import kyberDAO from 'services/kyberDAO'
import limitOrderApi from 'services/limitOrder'
import priceAlertApi from 'services/priceAlert'
import routeApi from 'services/route'
import socialApi from 'services/social'
import tokenApi from 'services/token'

import { ENV_LEVEL } from 'constants/env'
import { ENV_TYPE } from 'constants/type'
import kyberAIApi from 'pages/TrueSightV2/hooks/useKyberAIData'

import application from './application/reducer'
import authen from './authen/reducer'
import burnProAmm from './burn/proamm/reducer'
import burn from './burn/reducer'
import campaigns from './campaigns/reducer'
import crossChain from './crossChain/reducer'
import customizeDexes from './customizeDexes'
import farms from './farms/classic/reducer'
import elasticFarm from './farms/elastic'
import elasticFarmV2 from './farms/elasticv2'
import { updateVersion } from './global/actions'
import limit from './limit/reducer'
import lists from './lists/reducer'
import mintV2 from './mint/proamm/reducer'
import mint from './mint/reducer'
import multicall from './multicall/reducer'
import myEarnings from './myEarnings/reducer'
import pair from './pair/reducer'
import pools from './pools/reducer'
import profile from './profile/reducer'
import swap from './swap/reducer'
import tokenPrices from './tokenPrices'
import topTokens from './topTokens'
import transactions from './transactions/reducer'
import tutorial from './tutorial/reducer'
import user, { UserState } from './user/reducer'
import vesting from './vesting/reducer'

const PERSISTED_KEYS: string[] = ['user', 'transactions', 'profile']
ENV_LEVEL < ENV_TYPE.PROD && PERSISTED_KEYS.push('customizeDexes')

// Migrate from old version to new version, prevent lost favorite tokens of user
const preloadedState: any = load({ states: PERSISTED_KEYS })
if ('user' in preloadedState) {
  const userState: UserState = preloadedState.user
  if (userState.favoriteTokensByChainId) {
    userState.favoriteTokensByChainIdv2 = Object.entries(userState.favoriteTokensByChainId).reduce(
      (acc, [chainId, obj]) => {
        acc[chainId] = {}
        obj.addresses.forEach((address: string) => {
          acc[chainId][address.toLowerCase()] = true
        })
        return acc
      },
      {} as any,
    )
    userState.favoriteTokensByChainId = undefined
  }
}

const store = configureStore({
  devTools: process.env.NODE_ENV !== 'production',
  reducer: {
    application,
    authen,
    profile,
    user,
    transactions,
    swap,
    limit,
    mint,
    mintV2,
    burn,
    burnProAmm,
    multicall,
    lists,
    pair,
    pools,
    farms,
    vesting,
    [announcementApi.reducerPath]: announcementApi.reducer,
    [publicAnnouncementApi.reducerPath]: publicAnnouncementApi.reducer,
    [geckoTerminalApi.reducerPath]: geckoTerminalApi.reducer,
    [coingeckoApi.reducerPath]: coingeckoApi.reducer,
    [limitOrderApi.reducerPath]: limitOrderApi.reducer,

    [campaignApi.reducerPath]: campaignApi.reducer,
    [kyberAIApi.reducerPath]: kyberAIApi.reducer,
    [kyberAISubscriptionApi.reducerPath]: kyberAISubscriptionApi.reducer,
    [kyberDAO.reducerPath]: kyberDAO.reducer,
    [identifyApi.reducerPath]: identifyApi.reducer,
    [ksSettingApi.reducerPath]: ksSettingApi.reducer,
    [crosschainApi.reducerPath]: crosschainApi.reducer,
    [priceAlertApi.reducerPath]: priceAlertApi.reducer,
    [socialApi.reducerPath]: socialApi.reducer,
    campaigns,
    tutorial,
    myEarnings,
    crossChain,
    customizeDexes,
    elasticFarm,
    elasticFarmV2,
    tokenPrices,
    topTokens,
    [routeApi.reducerPath]: routeApi.reducer,
    [earningApi.reducerPath]: earningApi.reducer,
    [tokenApi.reducerPath]: tokenApi.reducer,
    [socialApi.reducerPath]: socialApi.reducer,
    [blockServiceApi.reducerPath]: blockServiceApi.reducer,
    [knProtocolApi.reducerPath]: knProtocolApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({ thunk: true, immutableCheck: false, serializableCheck: false })
      .concat(save({ states: PERSISTED_KEYS, debounce: 100 }))
      .concat(geckoTerminalApi.middleware)
      .concat(coingeckoApi.middleware)
      .concat(limitOrderApi.middleware)
      .concat(kyberAIApi.middleware)
      .concat(campaignApi.middleware)
      .concat(kyberAISubscriptionApi.middleware)
      .concat(announcementApi.middleware)
      .concat(publicAnnouncementApi.middleware)
      .concat(kyberDAO.middleware)
      .concat(identifyApi.middleware)
      .concat(ksSettingApi.middleware)
      .concat(crosschainApi.middleware)
      .concat(priceAlertApi.middleware)
      .concat(routeApi.middleware)
      .concat(earningApi.middleware)
      .concat(socialApi.middleware)
      .concat(tokenApi.middleware)
      .concat(blockServiceApi.middleware)
      .concat(knProtocolApi.middleware),
  preloadedState,
})

const PREFIX_REDUX_PERSIST = 'redux_localstorage_simple_'
// remove unused redux keys in local storage
try {
  Object.keys(localStorage).forEach(key => {
    if (!key.startsWith(PREFIX_REDUX_PERSIST)) return
    const name = key.replace(PREFIX_REDUX_PERSIST, '')
    if (!PERSISTED_KEYS.includes(name)) {
      localStorage.removeItem(key)
    }
  })
} catch (error) {}

// remove all redux keys in local storage
export const removeAllReduxPersist = () => {
  try {
    Object.keys(localStorage).forEach(key => {
      const name = key.replace(PREFIX_REDUX_PERSIST, '')
      if (PERSISTED_KEYS.includes(name)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {}
}

store.dispatch(updateVersion())

export default store
export type AppState = ReturnType<typeof store.getState>

/**
 * @see https://redux-toolkit.js.org/usage/usage-with-typescript#getting-the-dispatch-type
 */
export type AppDispatch = typeof store.dispatch
