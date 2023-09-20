import { ChainId, Token, WETH } from '@kyberswap/ks-sdk-core'
import { Trans, t } from '@lingui/macro'
import { rgba } from 'polished'
import { BarChart2, Plus, Share2 } from 'react-feather'
import { Link, useNavigate } from 'react-router-dom'
import { Flex, Text } from 'rebass'
import styled from 'styled-components'

import { ReactComponent as ViewPositionIcon } from 'assets/svg/view_positions.svg'
import { ButtonEmpty } from 'components/Button'
import CopyHelper from 'components/Copy'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import { FarmTag } from 'components/FarmTag'
import { MouseoverTooltip } from 'components/Tooltip'
import { FeeTag } from 'components/YieldPools/ElasticFarmGroup/styleds'
import FarmingPoolAPRCell from 'components/YieldPools/FarmingPoolAPRCell'
import { APP_PATHS, ELASTIC_BASE_FEE_UNIT, PROMM_ANALYTICS_URL } from 'constants/index'
import { NativeCurrencies } from 'constants/tokens'
import { VERSION } from 'constants/v2'
import { useActiveWeb3React } from 'hooks'
import { useAllTokens } from 'hooks/Tokens'
import useMixpanel, { MIXPANEL_TYPE } from 'hooks/useMixpanel'
import useTheme from 'hooks/useTheme'
import { ButtonIcon } from 'pages/Pools/styleds'
import { useElasticFarms } from 'state/farms/elastic/hooks'
import { useElasticFarmsV2 } from 'state/farms/elasticv2/hooks'
import { ExternalLink } from 'theme'
import { ElasticPoolDetail } from 'types/pool'
import { isAddressString, shortenAddress } from 'utils'
import { formatDollarAmount } from 'utils/numbers'

interface ListItemProps {
  pool: ElasticPoolDetail
  onShared: (id: string) => void
  userPositions: { [key: string]: number }
}

const getPrommAnalyticLink = (chainId: ChainId, poolAddress: string) => {
  if (!chainId) return ''
  return `${PROMM_ANALYTICS_URL[chainId]}/pool/${poolAddress.toLowerCase()}`
}

const TableRow = styled.div`
  display: grid;
  grid-gap: 1rem;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr;
  padding: 12px 16px;
  font-size: 14px;
  align-items: center;
  height: fit-content;
  background-color: ${({ theme }) => theme.background};

  :not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.border};
  }

  :last-child {
    border-bottom-right-radius: 1rem;
    border-bottom-left-radius: 1rem;
  }

  ${({ theme }) => theme.mediaWidth.upToLarge`
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 1fr;
  `}
`

const DataText = styled(Flex)`
  color: ${({ theme }) => theme.text};
  flex-direction: column;
`

const ButtonWrapper = styled(Flex)`
  justify-content: flex-end;
  gap: 4px;
  align-items: center;
`

export default function ProAmmPoolListItem({ pool, onShared, userPositions }: ListItemProps) {
  const { chainId, networkInfo } = useActiveWeb3React()
  const theme = useTheme()
  const navigate = useNavigate()

  const allTokens = useAllTokens()

  const token0 =
    allTokens[isAddressString(chainId, pool.token0.address)] ||
    new Token(chainId, pool.token0.address, pool.token0.decimals, pool.token0.symbol)
  const token1 =
    allTokens[isAddressString(chainId, pool.token1.address)] ||
    new Token(chainId, pool.token1.address, pool.token1.decimals, pool.token1.symbol)

  const isToken0WETH = pool.token0.address === WETH[chainId].address.toLowerCase()
  const isToken1WETH = pool.token1.address === WETH[chainId].address.toLowerCase()

  const nativeToken = NativeCurrencies[chainId]

  const token0Slug = isToken0WETH ? nativeToken.symbol : pool.token0.address
  const token0Symbol = isToken0WETH ? nativeToken.symbol : token0.symbol

  const token1Slug = isToken1WETH ? nativeToken.symbol : pool.token1.address
  const token1Symbol = isToken1WETH ? nativeToken.symbol : token1.symbol

  const { farms } = useElasticFarms()
  const { farms: elasticFarmV2s } = useElasticFarmsV2()

  const { mixpanelHandler } = useMixpanel()

  const myLiquidity = userPositions[pool.address]
  const hasLiquidity = pool.address in userPositions

  let fairlaunchAddress = ''
  let pid = -1

  farms?.forEach(farm => {
    const p = farm.pools
      .filter(item => item.endTime > Date.now() / 1000)
      .find(item => item.poolAddress.toLowerCase() === pool.address.toLowerCase())

    if (p) {
      fairlaunchAddress = farm.id
      pid = Number(p.pid)
    }
  })

  const isFarmV1 = !!fairlaunchAddress && pid !== -1
  const farmV2 = elasticFarmV2s
    ?.filter(farm => farm.endTime > Date.now() / 1000 && !farm.isSettled)
    .find(farm => farm.poolAddress.toLowerCase() === pool.address.toLowerCase())
  const isFarmV2 = !!farmV2

  const isFarmingPool = isFarmV1 || isFarmV2 || !!pool.farmAPR

  const maxFarmV2Apr = Math.max(...(farmV2?.ranges.map(item => item.apr || 0) || []), 0)

  const renderPoolAPR = () => {
    if (isFarmingPool || isFarmV2) {
      return (
        <FarmingPoolAPRCell
          poolAPR={pool.apr}
          farmV1APR={pool.farmAPR}
          farmV2APR={maxFarmV2Apr}
          fairlaunchAddress={fairlaunchAddress}
          pid={pid}
        />
      )
    }

    return <Flex alignItems="center">{pool.apr.toFixed(2)}%</Flex>
  }

  return (
    <TableRow key={pool.address} data-testid={pool.address}>
      <div>
        <Link
          to={`/${networkInfo.route}${APP_PATHS.ELASTIC_CREATE_POOL}/${token0Slug}/${token1Slug}/${pool.feeTier}`}
          style={{
            textDecoration: 'none',
          }}
        >
          <Flex alignItems="center">
            <DoubleCurrencyLogo
              size={20}
              currency0={isToken0WETH ? nativeToken : token0}
              currency1={isToken1WETH ? nativeToken : token1}
            />
            <Text flex={1} maxWidth="fit-content">
              <MouseoverTooltip
                text={`${token0Symbol} - ${token1Symbol}`}
                width="fit-content"
                containerStyle={{ maxWidth: '100%' }}
                placement="top"
              >
                <Text
                  fontSize={14}
                  fontWeight="500"
                  flex={1}
                  sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {token0Symbol} - {token1Symbol}
                </Text>
              </MouseoverTooltip>
            </Text>
            <FeeTag>Fee {(pool.feeTier * 100) / ELASTIC_BASE_FEE_UNIT}%</FeeTag>

            <Flex alignItems="center" marginLeft="4px" sx={{ gap: '4px' }}>
              {isFarmingPool && <FarmTag address={pool.address} noText />}
            </Flex>
          </Flex>
        </Link>
        <Flex
          marginTop="0.5rem"
          alignItems="center"
          sx={{ gap: '3px' }}
          fontSize="12px"
          color={theme.subText}
          width="max-content"
          fontWeight="500"
        >
          <Flex alignItems="center" sx={{ gap: '4px' }}>
            <CopyHelper toCopy={pool.address} />
            <Text>{shortenAddress(chainId, pool.address, 2)}</Text>
          </Flex>

          <Flex
            marginLeft="12px"
            onClick={() => {
              onShared(pool.address)
            }}
            sx={{
              cursor: 'pointer',
              gap: '4px',
            }}
            role="button"
            color={theme.subText}
          >
            <Share2 size="14px" color={theme.subText} />
            <Trans>Share</Trans>
          </Flex>
        </Flex>
      </div>
      <DataText alignItems="flex-end">{formatDollarAmount(pool.tvlUSD)}</DataText>
      <DataText alignItems="flex-end" color={theme.apr}>
        {renderPoolAPR()}
      </DataText>
      <DataText alignItems="flex-end">{formatDollarAmount(pool.volumeUSDLast24h)}</DataText>
      <DataText alignItems="flex-end">
        {formatDollarAmount(pool.volumeUSDLast24h * (pool.feeTier / ELASTIC_BASE_FEE_UNIT))}
      </DataText>
      <DataText alignItems="flex-end">{myLiquidity ? formatDollarAmount(Number(myLiquidity)) : '-'}</DataText>
      <ButtonWrapper>
        <MouseoverTooltip text={<Trans> Add liquidity </Trans>} placement={'top'} width={'fit-content'}>
          <ButtonEmpty
            padding="0"
            style={{
              background: rgba(theme.primary, 0.2),
              minWidth: '28px',
              minHeight: '28px',
              width: '28px',
              height: '28px',
            }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()

              const url = `/${networkInfo.route}${APP_PATHS.ELASTIC_CREATE_POOL}/${token0Slug}/${token1Slug}/${pool.feeTier}`
              mixpanelHandler(MIXPANEL_TYPE.ELASTIC_ADD_LIQUIDITY_IN_LIST_INITIATED, {
                token_1: token0Symbol,
                token_2: token1Symbol,
                fee_tier: pool.feeTier / ELASTIC_BASE_FEE_UNIT,
              })
              navigate(url)
            }}
          >
            <Plus size={16} color={theme.primary} />
          </ButtonEmpty>
        </MouseoverTooltip>
        {hasLiquidity && (
          <MouseoverTooltip text={t`View positions`} placement={'top'} width={'fit-content'}>
            <ButtonIcon
              as={Link}
              to={`${APP_PATHS.MY_POOLS}/${networkInfo.route}?tab=${VERSION.ELASTIC}&search=${pool.address}`}
            >
              <ViewPositionIcon />
            </ButtonIcon>
          </MouseoverTooltip>
        )}

        <ExternalLink href={getPrommAnalyticLink(chainId, pool.address)}>
          <MouseoverTooltip text={t`View analytics`} placement={'top'} width={'fit-content'}>
            <ButtonIcon
              onClick={e => {
                e.stopPropagation()
              }}
            >
              <BarChart2 size="14px" color={theme.subText} />
            </ButtonIcon>
          </MouseoverTooltip>
        </ExternalLink>
      </ButtonWrapper>
    </TableRow>
  )
}
