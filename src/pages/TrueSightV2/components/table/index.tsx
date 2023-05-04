import { ChainId } from '@kyberswap/ks-sdk-core'
import { Trans, t } from '@lingui/macro'
import dayjs from 'dayjs'
import { BigNumber } from 'ethers'
import { commify, formatUnits } from 'ethers/lib/utils'
import { useContext, useEffect, useMemo, useState } from 'react'
import { Star } from 'react-feather'
import { useParams } from 'react-router-dom'
// import { useNavigate } from 'react-router-dom'
// import { useMemo } from 'react'
import { Text } from 'rebass'
import styled, { DefaultTheme, css } from 'styled-components'

import { ButtonLight } from 'components/Button'
import Column from 'components/Column'
import CopyHelper from 'components/Copy'
import Icon from 'components/Icons/Icon'
import InfoHelper from 'components/InfoHelper'
import Pagination from 'components/Pagination'
import Row, { RowFit } from 'components/Row'
import { useTokenContractForReading } from 'hooks/useContract'
import useTheme from 'hooks/useTheme'
import {
  useFundingRateQuery,
  useHolderListQuery,
  useLiveDexTradesQuery,
  useTokenDetailQuery,
} from 'pages/TrueSightV2/hooks/useKyberAIData'
import { testParams } from 'pages/TrueSightV2/pages/SingleToken'
import { TechnicalAnalysisContext } from 'pages/TrueSightV2/pages/TechnicalAnalysis'
import { IHolderList, IKyberScoreChart, ILiveTrade, ITokenList, KyberAITimeframe } from 'pages/TrueSightV2/types'
import {
  NETWORK_TO_CHAINID,
  calculateValueToColor,
  formatLocaleStringNum,
  formatTokenPrice,
} from 'pages/TrueSightV2/utils'
import { getEtherscanLink, shortenAddress } from 'utils'

import { ContentWrapper } from '..'
import ChevronIcon from '../ChevronIcon'
import SimpleTooltip from '../SimpleTooltip'
import SmallKyberScoreMeter from '../SmallKyberScoreMeter'
import TokenChart from '../TokenChartSVG'
import { TimeFrameLegend } from '../chart'

// import OHLCData from './../chart/candles.json'

const Table2 = styled.table`
  border-collapse: collapse;
  border-radius: 6px;
  overflow: hidden;
  thead {
    height: 48px;
    font-size: 12px;
    line-height: 16px;
    font-weight: 500;
    color: ${({ theme }) => theme.subText};
    background: ${({ theme }) => theme.buttonGray};
    text-transform: uppercase;
    th {
      text-align: left;
      padding: 16px;
    }
  }

  tr {
    height: 72px;
    border-spacing: 1px;
    background-color: ${({ theme }) => theme.background};
    td {
      padding: 16px;
    }
  }
  tr:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.border};
  }
`
const TableWrapper = styled(ContentWrapper)`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
  padding: 0;
  font-size: 12px;
  border-radius: 6px;
  width: 100%;
`
const TableHeader = styled.div<{ gridTemplateColumns: string }>`
  display: grid;
  grid-template-columns: ${({ gridTemplateColumns }) => gridTemplateColumns};
  align-items: center;
  height: 48px;
  text-transform: uppercase;

  ${({ theme }) => css`
    background-color: ${theme.tableHeader};
    color: ${theme.subText};
  `};

  & > *:last-child {
    align-items: flex-end;
  }
`
const TableRow = styled(TableHeader)<{ height?: number }>`
  height: ${({ height }) => height || 72}px;
  font-size: 14px;
  text-transform: initial;
  ${({ theme }) => css`
    background-color: ${theme.background};
    color: ${theme.text};
    border-bottom: 1px solid ${theme.border};
  `};
`
const TableCell = styled.div`
  display: flex;
  flex-direction: column;
  padding: 6px 16px;
  gap: 4px;
`

const ActionButton = styled.div<{ color: string; hasBg?: boolean }>`
  display: flex;
  align-items: center;
  font-size: 12px;
  line-height: 16px;
  gap: 4px;
  padding: 6px;
  border-radius: 50%;
  background-color: ${({ theme, hasBg }) => (hasBg ? theme.subText + '32' : 'none')};
  cursor: pointer;
  ${({ theme, color }) => css`
    color: ${color || theme.primary};
  `}
  :hover {
    filter: brightness(0.9);
  }
  :active {
    filter: brightness(1.2);
  }
`

export const Top10HoldersTable = () => {
  const theme = useTheme()
  // const navigate = useNavigate()
  const { data } = useHolderListQuery({ address: '0xF9fbe825bfb2bf3e387af0dc18cac8d87f29dea8' })
  const { data: tokenInfo } = useTokenDetailQuery({
    chain: 'ethereum',
    address: '0xF9fbe825bfb2bf3e387af0dc18cac8d87f29dea8',
  })
  const [decimal, setDecimal] = useState(0)
  const tokenContract = useTokenContractForReading('0xf9fbe825bfb2bf3e387af0dc18cac8d87f29dea8', ChainId.MAINNET)

  useEffect(() => {
    tokenContract?.decimals().then((res: any) => {
      setDecimal(res)
    })
  }, [tokenContract])
  return (
    <Table2>
      <colgroup>
        <col style={{ width: '300px' }} />
        <col style={{ width: '300px' }} />
        <col style={{ width: '300px' }} />
        {/* <col style={{ width: '500px' }} /> */}
      </colgroup>
      <thead>
        <th>
          <Trans>Address</Trans>
        </th>
        <th>
          <Trans>Supply owned</Trans>
        </th>
        <th>
          <Trans>Amount held</Trans>
        </th>
        {/* <th>
          <Trans>Other tokens held</Trans>
        </th> */}
      </thead>
      <tbody>
        {decimal &&
          data?.slice(0, 10).map((item: IHolderList, i: number) => (
            <tr key={i}>
              <td>
                <Column gap="4px">
                  <Text fontSize="14px" lineHeight="20px" color={theme.text}>
                    {shortenAddress(1, item.address)}
                  </Text>
                  <RowFit gap="12px">
                    <ActionButton color={theme.subText} style={{ padding: '6px 0' }}>
                      <Icon id="copy" size={16} /> Copy
                    </ActionButton>
                    <ActionButton color={theme.subText} style={{ padding: '6px 0' }}>
                      <Icon id="open-link" size={16} /> Analyze
                    </ActionButton>
                  </RowFit>
                </Column>
              </td>
              <td>
                <Text fontSize="14px" lineHeight="20px" color={theme.text}>
                  {item.percentage.toPrecision(4)}%
                </Text>
              </td>
              <td>
                <Text fontSize="14px" lineHeight="20px" color={theme.text}>
                  {tokenInfo &&
                    item.quantity &&
                    commify(
                      formatUnits(BigNumber.from(item.quantity.toLocaleString('fullwide', { useGrouping: false })), 18),
                    )}
                </Text>
              </td>
            </tr>
          ))}
      </tbody>
    </Table2>
  )
}

const formatLevelValue = (value: number): string => {
  if (value > 1000) return (+value.toFixed(2)).toLocaleString()
  return value.toPrecision(5)
}

export const SupportResistanceLevel = () => {
  const theme = useTheme()
  const { SRLevels, currentPrice, resolution, setResolution } = useContext(TechnicalAnalysisContext)
  const [supports, resistances] = useMemo(() => {
    if (!SRLevels || !currentPrice) return []

    return [
      SRLevels?.filter(level => level.value < currentPrice).sort((a, b) => b.value - a.value),
      SRLevels?.filter(level => level.value > currentPrice).sort((a, b) => a.value - b.value),
    ]
  }, [SRLevels, currentPrice])
  const maxLength = Math.max(supports?.length || 0, resistances?.length || 0, 4)
  const gridTemplateColumns = '1fr ' + (Array(maxLength).fill('1fr').join(' ') || '')

  return (
    <TableWrapper>
      <TableHeader gridTemplateColumns={gridTemplateColumns}>
        <>
          <TableCell>Type</TableCell>
          <>
            {Array(maxLength)
              .fill('')
              .map((i, index) => (
                <TableCell key={index}>
                  {index === 0 && <Trans>Levels</Trans>}
                  {index === maxLength - 1 && (
                    <TimeFrameLegend
                      selected={resolution as KyberAITimeframe}
                      timeframes={[KyberAITimeframe.ONE_HOUR, KyberAITimeframe.FOUR_HOURS, KyberAITimeframe.ONE_DAY]}
                      onSelect={t => setResolution?.(t as string)}
                    />
                  )}
                </TableCell>
              ))}
          </>
        </>
      </TableHeader>
      <TableRow gridTemplateColumns={gridTemplateColumns}>
        <>
          <TableCell>
            <Text color={theme.primary}>Support</Text>
          </TableCell>
          {Array(maxLength)
            .fill('')
            .map((i, index) => (
              <TableCell key={index} style={{ alignItems: 'flex-start' }}>
                <Text color={theme.text}>
                  {supports?.[index] && currentPrice && `${formatLevelValue(supports[index].value)}`}
                </Text>
                <Text color={theme.apr} fontSize="12px">
                  {supports?.[index] && currentPrice
                    ? (((supports[index].value - currentPrice) / currentPrice) * 100).toFixed(2) + '%'
                    : '--'}
                </Text>
              </TableCell>
            ))}
        </>
      </TableRow>
      <TableRow gridTemplateColumns={gridTemplateColumns}>
        <>
          <TableCell>
            <Text color={theme.red}>Resistance</Text>
          </TableCell>
          {Array(maxLength)
            .fill('')
            .map((i, index) => (
              <TableCell key={index} style={{ alignItems: 'flex-start' }}>
                <Text color={theme.text}>
                  {resistances?.[index] && currentPrice && `${formatLevelValue(resistances[index].value)} `}
                </Text>
                <Text color={theme.red} fontSize="12px">
                  {resistances?.[index] && currentPrice
                    ? (((resistances[index].value - currentPrice) / currentPrice) * 100).toFixed(2) + '%'
                    : '--'}
                </Text>
              </TableCell>
            ))}
        </>
      </TableRow>
    </TableWrapper>
  )
}

function colorRateText(value: number, theme: DefaultTheme) {
  if (value > 0.015) return theme.red
  if (value > 0.005) return theme.text
  return theme.primary
}

export const FundingRateTable = () => {
  const theme = useTheme()
  const { data, isLoading } = useFundingRateQuery({ tokenAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599' })

  const hasNoData = !data && !isLoading
  return (
    <Table2>
      {hasNoData ? (
        <Row height="200px" justify="center">
          <Text fontSize="14px">
            <Trans>We couldn&apos;t find any information on USDT</Trans>
          </Text>
        </Row>
      ) : (
        <>
          <colgroup>
            <col />
            {Array(data?.uMarginList?.length)
              .fill(1)
              .map((_, index) => (
                <col key={index} />
              ))}
          </colgroup>
          <thead>
            <th></th>
            {data?.uMarginList?.map((i: any) => (
              <th key={i.exchangeName}>
                <Row gap="4px">
                  <img alt={i.exchangeName} src={i.exchangeLogo} style={{ height: '18px', width: '18px' }} />
                  <Text color={theme.text}>{i.exchangeName}</Text>
                </Row>
              </th>
            ))}
          </thead>
          <tbody>
            <tr>
              <td>
                <Row gap="4px">
                  <img alt={data?.symbol} src={data?.symbolLogo} style={{ height: '40px' }} />
                  <Column>
                    <Text color={theme.text}>{data?.symbol}</Text>
                    <Text color={theme.subText}>{data?.name}</Text>
                  </Column>
                </Row>
              </td>
              {data?.uMarginList?.map((i: any) => (
                <td key={i.exchangeName}>
                  <Text color={colorRateText(i.rate, theme)} fontSize="14px" lineHeight="20px" fontWeight={500}>
                    {i.rate.toFixed(4)}%
                  </Text>
                </td>
              ))}
            </tr>
          </tbody>
        </>
      )}
    </Table2>
  )
}

export const LiveDEXTrades = () => {
  const theme = useTheme()
  const [currentPage, setCurrentPage] = useState(1)
  const { chain, address } = useParams()
  const { data } = useLiveDexTradesQuery({ chain: chain || testParams.chain, address: address || testParams.address })
  const { data: tokenOverview } = useTokenDetailQuery({
    chain: chain || testParams.chain,
    address: address || testParams.address,
  })
  const gridTemplateColumns = '1.4fr 1.2fr 2fr 2fr 1.5fr 1fr'

  return (
    <TableWrapper>
      <TableHeader gridTemplateColumns={gridTemplateColumns}>
        <TableCell>Date</TableCell>
        <TableCell>Type</TableCell>
        <TableCell>Price ($)</TableCell>
        <TableCell>Amount</TableCell>
        <TableCell>Trader</TableCell>
        <TableCell>Transaction</TableCell>
      </TableHeader>
      {data?.slice((currentPage - 1) * 10, currentPage * 10 - 1).map((trade: ILiveTrade, i: number) => {
        const isBuy = trade.type === 'buy'
        return (
          <TableRow key={i} gridTemplateColumns={gridTemplateColumns}>
            <TableCell>
              <Text>{dayjs(trade.timestamp * 1000).format('DD/MM/YYYY')}</Text>
              <Text fontSize={12} color={theme.subText}>
                {dayjs(trade.timestamp * 1000).format('HH:mm:ss A')}
              </Text>
            </TableCell>
            <TableCell>
              <Text color={isBuy ? theme.primary : theme.red} style={{ textTransform: 'capitalize' }}>
                {trade.type}
              </Text>
            </TableCell>
            <TableCell>${formatLocaleStringNum(trade.price, 6)}</TableCell>
            <TableCell>
              <Row gap="4px">
                <img src={tokenOverview?.logo} width="16px" height="16px" />
                <Text color={isBuy ? theme.primary : theme.red}>
                  {isBuy ? '+' : '-'}
                  {formatLocaleStringNum(+trade.amountToken)} {tokenOverview?.symbol}
                </Text>
                {trade.price * +trade.amountToken > 100000 && (
                  <InfoHelper text={t`This transaction is higher than >$100k`} placement="top" />
                )}
              </Row>
              <Text color={theme.subText} fontSize={12}>
                ${formatLocaleStringNum(trade.price * +trade.amountToken)}{' '}
              </Text>
            </TableCell>
            <TableCell>
              <Text color={theme.primary}>{shortenAddress(1, trade.trader)}</Text>
            </TableCell>
            <TableCell>
              <Row justify="flex-end" gap="8px">
                <ActionButton color={theme.subText} hasBg>
                  <CopyHelper toCopy={trade.txn} style={{ marginLeft: 0 }} />
                </ActionButton>
                <ActionButton color={theme.subText} hasBg>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={chain ? getEtherscanLink(NETWORK_TO_CHAINID[chain], trade.txn, 'transaction') : '#'}
                  >
                    <Icon id="open-link" size={16} />
                  </a>
                </ActionButton>
              </Row>
            </TableCell>
          </TableRow>
        )
      })}
      <Pagination
        currentPage={currentPage}
        pageSize={10}
        totalCount={data?.length || 10}
        onPageChange={page => setCurrentPage(page)}
      />
    </TableWrapper>
  )
}

export const WidgetTable = ({ data }: { data?: ITokenList[] }) => {
  const theme = useTheme()
  const gridTemplateColumns = '1fr 1fr 1fr 1fr 0.6fr'

  return (
    <TableWrapper style={{ borderRadius: '0' }}>
      <TableHeader gridTemplateColumns={gridTemplateColumns} style={{ backgroundColor: theme.background }}>
        <TableCell>
          <Trans>Token</Trans>
        </TableCell>
        <TableCell>
          <Trans>Kyberscore</Trans>
        </TableCell>
        <TableCell>
          <Trans>Price | 24 Change</Trans>
        </TableCell>
        <TableCell>
          <Trans>Last 7 days</Trans>
        </TableCell>
        <TableCell>
          <Trans>Action</Trans>
        </TableCell>
      </TableHeader>
      {data?.map((token, i) => {
        const latestKyberScore: IKyberScoreChart = token?.ks_3d?.[token.ks_3d.length - 1]
        return (
          <TableRow
            key={i}
            gridTemplateColumns={gridTemplateColumns}
            height={64}
            style={{ backgroundColor: theme.tableHeader }}
          >
            <TableCell>
              <RowFit gap="6px">
                <SimpleTooltip text={t`Add to watchlist`}>
                  <Star
                    size={16}
                    style={{ marginRight: '6px', cursor: 'pointer' }}
                    fill={'none'}
                    stroke={theme.subText}
                    onClick={e => {
                      e.stopPropagation()
                    }}
                  />
                </SimpleTooltip>
                <Row gap="8px" style={{ position: 'relative', width: '24px', height: '24px' }}>
                  <img
                    alt="tokenInList"
                    src={token.tokens[0].logo}
                    width="24px"
                    height="24px"
                    style={{ borderRadius: '12px' }}
                  />
                  <Column gap="4px" style={{ cursor: 'pointer', alignItems: 'flex-start' }}>
                    <Text style={{ textTransform: 'uppercase' }}>{token.symbol}</Text>{' '}
                    <RowFit gap="6px" color={theme.text}>
                      {token.tokens.map(item => {
                        if (item.chain === 'ethereum') return <Icon id="eth-mono" size={12} title="Ethereum" />
                        if (item.chain === 'bsc') return <Icon id="bnb-mono" size={12} title="Binance" />
                        if (item.chain === 'avalanche') return <Icon id="ava-mono" size={12} title="Avalanche" />
                        if (item.chain === 'polygon') return <Icon id="matic-mono" size={12} title="Polygon" />
                        if (item.chain === 'arbitrum') return <Icon id="arbitrum-mono" size={12} title="Arbitrum" />
                        if (item.chain === 'fantom') return <Icon id="fantom-mono" size={12} title="Fantom" />
                        if (item.chain === 'optimism') return <Icon id="optimism-mono" size={12} title="Optimism" />
                        return <></>
                      })}
                    </RowFit>
                  </Column>
                </Row>
              </RowFit>
            </TableCell>
            <TableCell>
              <Column style={{ alignItems: 'center', width: '110px' }}>
                <SmallKyberScoreMeter data={latestKyberScore} tokenName={token.symbol} />
                <Text color={calculateValueToColor(token.kyber_score, theme)} fontSize="14px" fontWeight={500}>
                  {latestKyberScore.tag || t`Not Available`}
                </Text>
              </Column>
            </TableCell>
            <TableCell>
              <Column gap="4px" style={{ textAlign: 'left' }}>
                <Text color={theme.text} fontSize="14px" lineHeight="20px">
                  ${formatTokenPrice(token.price)}
                </Text>
                <Text fontSize="10px" lineHeight="12px" color={token.change_24h > 0 ? theme.primary : theme.red}>
                  <Row gap="2px">
                    <ChevronIcon
                      rotate={token.change_24h > 0 ? '180deg' : '0deg'}
                      color={token.change_24h > 0 ? theme.primary : theme.red}
                    />
                    {Math.abs(token.change_24h).toFixed(2)}%
                  </Row>
                </Text>
              </Column>
            </TableCell>
            <TableCell>
              <TokenChart data={token['7daysprice']} />
            </TableCell>
            <TableCell>
              <ButtonLight height="28px" width="75px" padding="4px 8px">
                <RowFit gap="4px" fontSize="14px">
                  <Icon id="swap" size={16} />
                  Swap
                </RowFit>
              </ButtonLight>
            </TableCell>
          </TableRow>
        )
      })}
    </TableWrapper>
  )
}
