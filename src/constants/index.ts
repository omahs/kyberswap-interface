import { ChainId, Percent } from '@kyberswap/ks-sdk-core'
import { t } from '@lingui/macro'
import JSBI from 'jsbi'
import { v4 as uuid } from 'uuid'

import { TransactionFlowState } from 'types/TransactionFlowState'

import { CAMPAIGN_BASE_URL as CAMPAIGN_BASE_DOMAIN } from './env'
import * as ENV from './env'
import { EVM_NETWORK, NETWORKS_INFO, SUPPORTED_NETWORKS, isEVM } from './networks'

export const EMPTY_OBJECT: any = {}
export const EMPTY_ARRAY: any[] = []
export const EMPTY_FUNCTION = () => {
  // empty
}

export const BAD_RECIPIENT_ADDRESSES: string[] = [
  NETWORKS_INFO[ChainId.MAINNET].classic.static.factory,
  NETWORKS_INFO[ChainId.MAINNET].classic.static.router,
  NETWORKS_INFO[ChainId.MAINNET].classic.static.factory,
  NETWORKS_INFO[ChainId.MAINNET].classic.static.router,
]

export class AbortedError extends Error {}
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export const ZERO_ADDRESS_SOLANA = 'zeroooooooooooooooooooooooooooooooooooooooo'

const DMM_ANALYTICS = 'https://analytics.kyberswap.com/classic'

export const DMM_ANALYTICS_URL: { [chainId in ChainId]: string } = SUPPORTED_NETWORKS.reduce((acc, cur) => {
  if (isEVM(cur))
    return {
      ...acc,
      [cur]: `${DMM_ANALYTICS}/${NETWORKS_INFO[cur].route}`,
    }
  return {
    ...acc,
    [cur]: `${DMM_ANALYTICS}`,
  }
}, {}) as { [chainId in ChainId]: string }

const PROMM_ANALYTICS = 'https://analytics.kyberswap.com/elastic'
export const AGGREGATOR_ANALYTICS_URL = 'https://secure.holistics.io/dashboards/v3/55952?_pl=672a0e4ff266f14541b8f54b'

export const PROMM_ANALYTICS_URL: { [chainId in ChainId]: string } = SUPPORTED_NETWORKS.reduce((acc, cur) => {
  if (isEVM(cur))
    return {
      ...acc,
      [cur]:
        cur === ChainId.AURORA
          ? `${DMM_ANALYTICS}/${NETWORKS_INFO[cur].route}`
          : `${PROMM_ANALYTICS}/${NETWORKS_INFO[cur].route}`,
    }
  return {
    ...acc,
    [cur]: `${PROMM_ANALYTICS}`,
  }
}, {}) as { [chainId in ChainId]: string }

export const BLOCKS_PER_YEAR = (chainId: EVM_NETWORK): number =>
  Math.floor((60 / NETWORKS_INFO[chainId].averageBlockTimeInSeconds) * 60 * 24 * 365)

export const SECONDS_PER_YEAR = 31556926

export const BLACKLIST_WALLETS: string[] = [
  '0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b',
  '0x7f367cc41522ce07553e823bf3be79a889debe1b',
  '0x076567024aa84D766803EF0128dc7C58C13a6359',
  '0x901bb9583b24d97e995513c6778dc6888ab6870e',
  '0xa7e5d5a720f06526557c513402f2e6b5fa20b00',
  '0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c',
  '0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a',
  '0x7db418b5d567a4e0e8c59ad71be1fce48f3e6107',
  '0x72a5843cc08275c8171e582972aa4fda8c397b2a',
  '0x7f19720a857f834887fc9a7bc0a0fbe7fc7f8102',
  '0x9f4cda013e354b8fc285bf4b9a60460cee7f7ea9',
  // OFAC sanction
  '0x8589427373D6D84E98730D7795D8f6f8731FDA16',
  '0x722122dF12D4e14e13Ac3b6895a86e84145b6967',
  '0xDD4c48C0B24039969fC16D1cdF626eaB821d3384',
  '0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b',
  '0xd96f2B1c14Db8458374d9Aca76E26c3D18364307',
  '0x4736dCf1b7A3d580672CcE6E7c65cd5cc9cFBa9D',
  '0xD4B88Df4D29F5CedD6857912842cff3b20C8Cfa3',
  '0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF',
  '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291',
  '0xFD8610d20aA15b7B2E3Be39B396a1bC3516c7144',
  '0xF60dD140cFf0706bAE9Cd734Ac3ae76AD9eBC32A',
  '0x22aaA7720ddd5388A3c0A3333430953C68f1849b',
  '0xBA214C1c1928a32Bffe790263E38B4Af9bFCD659',
  '0xb1C8094B234DcE6e03f10a5b673c1d8C69739A00',
  '0x527653eA119F3E6a1F5BD18fbF4714081D7B31ce',
  '0x58E8dCC13BE9780fC42E8723D8EaD4CF46943dF2',
  '0xD691F27f38B395864Ea86CfC7253969B409c362d',
  '0xaEaaC358560e11f52454D997AAFF2c5731B6f8a6',
  '0x1356c899D8C9467C7f71C195612F8A395aBf2f0a',
  '0xA60C772958a3eD56c1F15dD055bA37AC8e523a0D',
  '0x169AD27A470D064DEDE56a2D3ff727986b15D52B',
  '0x0836222F2B2B24A3F36f98668Ed8F0B38D1a872f',
  '0xF67721A2D8F736E75a49FdD7FAd2e31D8676542a',
  '0x9AD122c22B14202B4490eDAf288FDb3C7cb3ff5E',
  '0x905b63Fff465B9fFBF41DeA908CEb12478ec7601',
  '0x07687e702b410Fa43f4cB4Af7FA097918ffD2730',
  '0x94A1B5CdB22c43faab4AbEb5c74999895464Ddaf',
  '0xb541fc07bC7619fD4062A54d96268525cBC6FfEF',
  '0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc',
  '0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936',
  '0x23773E65ed146A459791799d01336DB287f25334',
  '0xD21be7248e0197Ee08E0c20D4a96DEBdaC3D20Af',
  '0x610B717796ad172B316836AC95a2ffad065CeaB4',
  '0x178169B423a011fff22B9e3F3abeA13414dDD0F1',
  '0xbB93e510BbCD0B7beb5A853875f9eC60275CF498',
  '0x2717c5e28cf931547B621a5dddb772Ab6A35B701',
  '0x03893a7c7463AE47D46bc7f091665f1893656003',
  '0xCa0840578f57fE71599D29375e16783424023357',
]

export const NetworkContextName = 'NETWORK'

// default allowed slippage, in bips
export const INITIAL_ALLOWED_SLIPPAGE = 50
// 20 minutes, denominated in seconds
export const DEFAULT_DEADLINE_FROM_NOW = 60 * 20
// denominated in seconds
export const TIME_TO_REFRESH_SWAP_RATE = 10

export const BIG_INT_ONE = JSBI.BigInt(1)
export const BIG_INT_MINUS_ONE = JSBI.BigInt(-1)
export const BIG_INT_ZERO = JSBI.BigInt(0)

// one basis point
export const ONE_BIPS = new Percent(JSBI.BigInt(1), JSBI.BigInt(10000))
export const BIPS_BASE = JSBI.BigInt(10000)
// used for warning states
export const ALLOWED_PRICE_IMPACT_LOW: Percent = new Percent(JSBI.BigInt(100), BIPS_BASE) // 1%
export const ALLOWED_PRICE_IMPACT_MEDIUM: Percent = new Percent(JSBI.BigInt(300), BIPS_BASE) // 3%
export const ALLOWED_PRICE_IMPACT_HIGH: Percent = new Percent(JSBI.BigInt(500), BIPS_BASE) // 5%

// for non degen mode disable swaps above this
export const BLOCKED_PRICE_IMPACT_NON_DEGEN: Percent = new Percent(JSBI.BigInt(1500), BIPS_BASE) // 15%

export const BUNDLE_ID = '1'

export const COINGECKO_BFF_API_URL = `${ENV.BFF_API}/v1/coingecko/api/v3`
export const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3'

export const KNC_COINGECKO_ID = 'kyber-network-crystal'

export const ETHER_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
export const ETHER_ADDRESS_SOLANA = 'So11111111111111111111111111111111111111111'

export const KYBER_NETWORK_DISCORD_URL = 'https://discord.com/invite/NB3vc8J9uv'
export const KYBER_NETWORK_TWITTER_URL = 'https://twitter.com/KyberNetwork'

export const DEFAULT_GAS_LIMIT_MARGIN = 20000

// This variable to handle crazy APR which it can be wrong calculations or a bug
// But now, for FOMO of Pagxy, updated this to 10000 (before we set 2000 for it)
export const MAX_ALLOW_APY = 10000
export const RESERVE_USD_DECIMALS = 100
export const DEFAULT_SIGNIFICANT = 6
export const SUBGRAPH_AMP_MULTIPLIER = 10000
export const AMP_LIQUIDITY_HINT = t`AMP factor x Liquidity in the pool. Amplified pools have higher capital efficiency and liquidity.`
export const AMP_HINT = t`Stands for amplification factor. Each pool can have its own AMP. Pools with a higher AMP provide higher capital efficiency within a particular price range`
export const CREATE_POOL_AMP_HINT = t`Stands for amplification factor. Pools with a higher AMP provide higher capital efficiency within a particular price range. We recommend higher AMP for stable token pairs and lower AMP for volatile token pairs`

export const sentryRequestId = uuid()

export const TRENDING_SOON_ITEM_PER_PAGE = 10
export const TRENDING_SOON_MAX_ITEMS = 50
export const TRENDING_ITEM_PER_PAGE = 25
export const CAMPAIGN_LEADERBOARD_ITEM_PER_PAGE = 10
export const CAMPAIGN_YOUR_TRANSACTIONS_ITEM_PER_PAGE = 10000

export const ELASTIC_BASE_FEE_UNIT = 100_000
export const KYBERSWAP_SOURCE = '{"source":"kyberswap"}'

export const CAMPAIGN_BASE_URL = `${CAMPAIGN_BASE_DOMAIN}/api/v1/campaigns`
export const SWR_KEYS = {
  getGrantProgramLeaderBoard: (id: number | string) => `${CAMPAIGN_BASE_DOMAIN}/api/v1/competitions/${id}/leaderboard`,
  getListGrantPrograms: `${CAMPAIGN_BASE_DOMAIN}/api/v1/competitions`,
  getGrantProgram: (id: number | string) => `${CAMPAIGN_BASE_DOMAIN}/api/v1/competitions/${id}`,
  getListCampaign: CAMPAIGN_BASE_URL,
  getLeaderboard: (id: number) => CAMPAIGN_BASE_URL + '/' + id + '/leaderboard',
  getLuckyWinners: (id: number) => CAMPAIGN_BASE_URL + '/' + id + '/lucky-winners',
  getCampaignTransactions: (campaignId: number, limit: number, offset: number, account: string) =>
    `${CAMPAIGN_BASE_URL}/${campaignId}/proofs?limit=${limit}&offset=${offset}&userAddress=${account}`,
}

// Epsilon 0 is absolute permittivity of free space whose value is 8.854×10^-12 and unit is C^2N^-1m–2.
export const EPSILON = 0.000000000008854

// https://www.nasdaq.com/glossary/b/bip
export const MAX_NORMAL_SLIPPAGE_IN_BIPS = 1999
export const MAX_DEGEN_SLIPPAGE_IN_BIPS = 5000
export const DEFAULT_SLIPPAGES = [5, 10, 50, 100]

export const DEFAULT_SLIPPAGE = 50
export const DEFAULT_SLIPPAGE_STABLE_PAIR_SWAP = 5

export const AGGREGATOR_WAITING_TIME = 1700 // 1700 means that we at least show '.' '..' '...' '.' '..' '...'

export const APP_PATHS = {
  ABOUT: '/about',
  SWAP: '/swap',
  CAMPAIGN: '/campaigns',
  FIND_POOL: '/find',
  POOLS: '/pools',
  CLASSIC_CREATE_POOL: '/create',
  CLASSIC_ADD_LIQ: '/add',
  CLASSIC_REMOVE_POOL: '/remove',
  ELASTIC_CREATE_POOL: '/elastic/add',
  ELASTIC_INCREASE_LIQ: '/elastic/increase',
  ELASTIC_REMOVE_POOL: '/elastic/remove',
  FARMS: '/farms',
  MY_POOLS: '/myPools',
  MY_EARNINGS: '/my-earnings',
  DISCOVER: '/discover',
  KYBERAI: '/KyberAI',
  KYBERAI_ABOUT: '/KyberAI/About',
  KYBERAI_RANKINGS: '/KyberAI/Rankings',
  KYBERAI_EXPLORE: '/KyberAI/Explore',
  BUY_CRYPTO: '/buy-crypto',
  BRIDGE: '/bridge',
  CROSS_CHAIN: '/cross-chain',
  KYBERDAO: '/kyberdao',
  KYBERDAO_STAKE: '/kyberdao/stake-knc',
  KYBERDAO_VOTE: '/kyberdao/vote',
  KYBERDAO_KNC_UTILITY: '/kyberdao/knc-utility',
  LIMIT: '/limit',
  GRANT_PROGRAMS: '/inter-project-trading-campaigns',
  PROFILE_MANAGE: '/manage',
  ELASTIC_LEGACY: '/elastic-legacy',
  VERIFY_AUTH: '/auth',
} as const

export const TERM_FILES_PATH = {
  KYBERSWAP_TERMS: '/files/Kyber - Terms of Service - 1 August 2023.pdf',
  PRIVACY_POLICY: '/files/Kyber - Privacy Policy - 23 Aug 2023.pdf',
  // Timestamp of changed date, update this to latest timestamp whenever change any above files. This also used to check on client side for updated to force user to disconnect and re-accept terms.
  VERSION: 1692748800000,
}

export enum FARM_TAB {
  ACTIVE = 'active',
  ENDED = 'ended',
  MY_FARMS = 'my_farms',
  VESTING = 'vesting',
}

export enum ELASTIC_FARM_TYPE {
  ALL = 'all',
  DYNAMIC = 'dynamic',
  STATIC = 'static',
}

export const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
]

export const INPUT_DEBOUNCE_TIME = 300

export const ENABLE_CLICK_TO_REFRESH_GET_ROUTE = false

export const TIMES_IN_SECS = {
  ONE_DAY: 86400,
  ONE_HOUR: 3600,
  ONE_MIN: 60,
}

export const RTK_QUERY_TAGS = {
  // announcement
  GET_PRIVATE_ANN_BY_ID: 'GET_PRIVATE_ANN_BY_ID',
  GET_ALL_PRIVATE_ANN: 'GET_ALL_PRIVATE_ANN',
  GET_TOTAL_UNREAD_PRIVATE_ANN: 'GET_TOTAL_UNREAD_PRIVATE_ANN',
  GET_ALL_TOPICS_GROUP: 'GET_ALL_TOPICS_GROUP',

  // price alert
  GET_ALERTS: 'GET_ALERTS',
  GET_ALERTS_HISTORY: 'GET_ALERTS_HISTORY',
  GET_ALERTS_STAT: 'GET_ALERTS_STAT',

  // cross chain
  GET_CROSS_CHAIN_HISTORY: 'GET_CROSS_CHAIN_HISTORY',
  GET_BRIDGE_HISTORY: 'GET_BRIDGE_HISTORY',

  // kyber ai
  GET_PARTICIPANT_INFO_KYBER_AI: 'GET_PARTICIPANT_INFO_KYBER_AI',
}

export const TRANSACTION_STATE_DEFAULT: TransactionFlowState = {
  showConfirm: false,
  attemptingTxn: false,
  errorMessage: '',
  txHash: undefined,
  pendingText: '',
}

export const CHAINS_SUPPORT_FEE_CONFIGS = [ChainId.AURORA, ChainId.CRONOS]
export const CHAINS_SUPPORT_CROSS_CHAIN =
  ENV.ENV_KEY === ENV.EnvKeys.PROD || ENV.ENV_KEY === ENV.EnvKeys.STG
    ? [
        ChainId.MAINNET,
        ChainId.BSCMAINNET,
        ChainId.MATIC,
        ChainId.AVAXMAINNET,
        ChainId.ARBITRUM,
        ChainId.OPTIMISM,
        ChainId.FANTOM,
        ChainId.LINEA,
        ChainId.BASE,
      ]
    : SUPPORTED_NETWORKS

export const TYPE_AND_SWAP_NOT_SUPPORTED_CHAINS: ChainId[] = [
  ChainId.ZKSYNC,
  ChainId.LINEA,
  ChainId.ZKEVM,
  ChainId.BASE,
]

export const SWAP_FEE_RECEIVER_ADDRESS = '0x4f82e73EDb06d29Ff62C91EC8f5Ff06571bdeb29'

export const TOKEN_SCORE_TTL = 86400

export const AGGREGATOR_API_PATHS = {
  BUILD_ROUTE: '/api/v1/route/build',
  GET_ROUTE: '/api/v1/routes',
}

export const ICON_IDS = [
  'truesight-v2',
  'notification-2',
  'bullish',
  'bearish',
  'trending-soon',
  'flame',
  'download',
  'upload',
  'coin-bag',
  'check',
  'pig',
  'speaker',
  'share',
  'liquid-outline',
  'refund',
  'swap',
  'copy',
  'open-link',
  'star',
  'fullscreen',
  'leaderboard',
  'liquid',
  'alarm',
  'on-chain',
  'technical-analysis',
  'news',
  'arrow',
  'chart',
  'lightbulb',
  'info',
  'question',
  'timer',
  'search',
  'devices',
  'eth-mono',
  'ava-mono',
  'bnb-mono',
  'matic-mono',
  'fantom-mono',
  'optimism-mono',
  'arbitrum-mono',
  'telegram',
  'twitter',
  'facebook',
  'discord',
] as const
export type ICON_ID = typeof ICON_IDS[number]

export const FRAX_FARMS: { [chainId in ChainId]?: string[] } = {
  [ChainId.MAINNET]: [
    '0xe5379f5ee90d70a0f9de0ed8b3cdde3b9427524a',
    '0xfd7b111aa83b9b6f547e617c7601efd997f64703',
    '0x36240069ff26cecbde04d9e49a2af8d39146263e',
  ],
  [ChainId.MATIC]: ['0xa5ebdde0f2e657d77bebeda085dd49f6decf8504'],
  [ChainId.ARBITRUM]: ['0x6a7dccf168fba624a81b293c2538d31427b5b4bd'],
  [ChainId.OPTIMISM]: ['0xa837d04a64acf66912d05cfd9b951e4e399ab680'],
}
