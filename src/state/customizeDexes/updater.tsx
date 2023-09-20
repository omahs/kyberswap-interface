import { useEffect, useMemo } from 'react'
import { useDispatch } from 'react-redux'

import { isKyberSwapDex } from 'components/swapv2/LiquiditySourcesPanel'
import { KYBERSWAP_KS_DEXES_TO_UI_DEXES } from 'constants/dexes'
import { useActiveWeb3React } from 'hooks'
import useLiquiditySources from 'hooks/useAggregatorStats'
import { AppDispatch } from 'state/index'
import { uniqueArray } from 'utils/array'

import { Dex, updateAllDexes } from '.'

export default function Updater(): null {
  const dispatch = useDispatch<AppDispatch>()

  const { chainId } = useActiveWeb3React()
  const { data: dexes } = useLiquiditySources(chainId)

  // filterout kyberswap dexes, will hardcode
  const normalizeDexes = useMemo(() => {
    const dexesFormatted: Dex[] = dexes?.map(item => ({ ...item, id: item.dexId, sortId: item.id })) || []
    const dexesOutsideKyberswap = dexesFormatted.filter(item => !isKyberSwapDex(item.id))
    const dexesKyberswap = uniqueArray(
      dexesFormatted.filter(dex => KYBERSWAP_KS_DEXES_TO_UI_DEXES[dex.id]),
      dex => KYBERSWAP_KS_DEXES_TO_UI_DEXES[dex.id],
    )

    const dexesUIKyberswap = dexesKyberswap.map(dex => {
      return {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: KYBERSWAP_KS_DEXES_TO_UI_DEXES[dex.id]!,
        name: dex.name,
        logoURL: dex.logoURL || 'https://kyberswap.com/favicon.ico',
        sortId: dex.sortId,
      }
    })

    return [...dexesOutsideKyberswap, ...dexesUIKyberswap]
  }, [dexes])

  useEffect(() => {
    if (chainId && normalizeDexes.length) {
      dispatch(
        updateAllDexes({
          chainId,
          dexes: normalizeDexes,
        }),
      )
    }
  }, [normalizeDexes, chainId, dispatch])

  return null
}
