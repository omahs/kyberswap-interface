import { ChainId, Currency, NativeCurrency, Token, WETH } from '@kyberswap/ks-sdk-core'

import { ETHER_ADDRESS, ETHER_ADDRESS_SOLANA } from 'constants/index'
import { isEVM } from 'constants/networks'
import { MAP_TOKEN_HAS_MULTI_BY_NETWORK } from 'constants/tokenLists/token-info'
import { WrappedTokenInfo } from 'state/lists/wrappedTokenInfo'

/**
 * hard code: ex: usdt => usdt_e, ... if network has multi symbol same name base on network
 * @param network ex: poylgon, ...
 * @param value symbol name, ex: usdt, ...
 * @returns
 */
export const convertSymbol = (network: string, value: string) => {
  const mapData = MAP_TOKEN_HAS_MULTI_BY_NETWORK[network]
  if (mapData) {
    const newValue = mapData[value]
    if (newValue) return newValue
  }
  return value
}

export const getFormattedAddress = (chainId: ChainId, address?: string, fallback?: string): string => {
  try {
    if (!address) return fallback || ''
    return new Token(chainId, address, 0).address || ''
  } catch (e) {
    return fallback || address || ''
  }
}

export const isTokenNative = (
  currency: Currency | WrappedTokenInfo | undefined,
  chainId: ChainId | undefined,
): currency is NativeCurrency => {
  if (currency?.isNative || currency?.address === ETHER_ADDRESS || currency?.address === ETHER_ADDRESS_SOLANA)
    return true
  // case multichain token
  return chainId
    ? WETH[chainId]?.address === currency?.address &&
        currency instanceof WrappedTokenInfo &&
        currency.multichainInfo?.tokenType === 'NATIVE'
    : false
}

export const getTokenAddress = (currency: Currency) =>
  currency.isNative ? (isEVM(currency.chainId) ? ETHER_ADDRESS : ETHER_ADDRESS_SOLANA) : currency?.wrapped.address ?? ''

export const getTokenSymbolWithHardcode = (
  chainId: ChainId | undefined,
  address: string | undefined,
  defaultSymbol: string | undefined,
) => {
  const formatAddress = address?.toLowerCase()
  if (
    (chainId === ChainId.OPTIMISM && formatAddress === '0x4518231a8fdf6ac553b9bbd51bbb86825b583263'.toLowerCase()) ||
    (chainId === ChainId.ARBITRUM && formatAddress === '0x316772cFEc9A3E976FDE42C3Ba21F5A13aAaFf12'.toLowerCase())
  ) {
    return 'mKNC'
  }
  if (chainId === ChainId.ARBITRUM && formatAddress === '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8') return 'USDC.e'
  if (chainId === ChainId.ARBITRUM && formatAddress === '0x9cfb13e6c11054ac9fcb92ba89644f30775436e4')
    return 'axl.wstETH'
  return defaultSymbol ?? ''
}

export const getProxyTokenLogo = (logoUrl: string | undefined) =>
  logoUrl ? `https://proxy.kyberswap.com/token-logo?url=${logoUrl}` : ''
